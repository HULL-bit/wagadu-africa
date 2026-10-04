from __future__ import annotations

from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.audit.models import AuditAction
from apps.audit.services import record
from apps.permissions.drf import HasPermission
from apps.permissions.services import has_permission

from .jitsi import build_token, is_configured
from .models import (
    Meeting,
    MeetingPoll,
    MeetingPollOption,
    MeetingPollVote,
    MeetingStatus,
)
from .serializers import MeetingPollSerializer, MeetingSerializer
from .services import (
    can_access,
    close_meeting,
    create_meeting,
    respond,
    set_participants,
)


class MeetingViewSet(viewsets.ModelViewSet):
    serializer_class = MeetingSerializer
    permission_classes = [IsAuthenticated, HasPermission.of("meetings.create")]
    filterset_fields = ["status", "access"]
    ordering_fields = ["start", "created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = Meeting.objects.select_related("organizer").prefetch_related(
            "meeting_participants__user", "polls__options"
        )
        if user.is_super_admin or has_permission(user, "meetings.manage_all"):
            return qs
        return qs.filter(
            Q(organizer=user) | Q(participants=user) | Q(access="open")
        ).distinct()

    def get_permissions(self):
        if self.action in ("list", "retrieve", "join", "respond"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), HasPermission.of("meetings.create")()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        v = serializer.validated_data
        participant_ids = v.pop("participant_ids", [])
        meeting = create_meeting(data=v, actor=request.user, participant_ids=participant_ids)
        return Response(MeetingSerializer(meeting, context={"request": request}).data, status=201)

    def perform_update(self, serializer):
        if serializer.instance.organizer_id != self.request.user.id and not self.request.user.is_super_admin:
            raise PermissionDenied("Seul l'organisateur peut modifier la réunion.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.organizer_id != self.request.user.id and not self.request.user.is_super_admin:
            raise PermissionDenied("Seul l'organisateur peut annuler la réunion.")
        instance.status = MeetingStatus.CANCELLED
        instance.save(update_fields=["status"])
        record(action=AuditAction.UPDATE, module="meetings", actor=self.request.user,
               target=instance, message="Réunion annulée")

    @action(detail=True, methods=["post"])
    def participants(self, request, pk=None):
        meeting = self.get_object()
        if meeting.organizer_id != request.user.id and not request.user.is_super_admin:
            raise PermissionDenied("Seul l'organisateur gère les participants.")
        set_participants(meeting, actor=request.user,
                         add=request.data.get("add", []), remove=request.data.get("remove", []))
        return Response(MeetingSerializer(self.get_queryset().get(pk=meeting.pk),
                                          context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def respond(self, request, pk=None):
        meeting = self.get_object()
        respond(meeting, user=request.user, response=request.data.get("response"))
        return Response(MeetingSerializer(meeting, context={"request": request}).data)

    @action(detail=True, methods=["get"])
    def join(self, request, pk=None):
        meeting = self.get_object()
        if not can_access(meeting, request.user):
            raise PermissionDenied("Réunion sur invitation.")
        moderator = meeting.organizer_id == request.user.id or request.user.is_super_admin
        participant = meeting.meeting_participants.filter(user=request.user).first()
        if participant and not participant.joined_at:
            participant.joined_at = timezone.now()
            participant.save(update_fields=["joined_at"])
        if meeting.status == MeetingStatus.SCHEDULED and meeting.start <= timezone.now():
            meeting.status = MeetingStatus.ONGOING
            meeting.save(update_fields=["status"])
        return Response({
            "url": meeting.join_url,
            "room": meeting.room_slug,
            "jwt": build_token(meeting, request.user, moderator=moderator),
            "moderator": moderator,
            "lobby": meeting.lobby,
            "configured": is_configured(),
        })

    def _guard_organizer(self, request, meeting):
        if meeting.organizer_id != request.user.id and not request.user.is_super_admin \
                and not has_permission(request.user, "meetings.manage_all"):
            raise PermissionDenied("Seul l'organisateur peut effectuer cette action.")

    @action(detail=True, methods=["post"], url_path="close")
    def close(self, request, pk=None):
        meeting = self.get_object()
        self._guard_organizer(request, meeting)
        close_meeting(meeting, actor=request.user, minutes=request.data.get("minutes", ""))
        return Response(MeetingSerializer(meeting, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="minutes-document")
    def minutes_document(self, request, pk=None):
        """Dépôt du compte-rendu sous forme de fichier (Word / PDF) + clôture."""
        meeting = self.get_object()
        self._guard_organizer(request, meeting)
        upload = request.FILES.get("file")
        if not upload:
            raise ValidationError({"file": ["Fichier requis (Word ou PDF)."]})

        from apps.documents.services import create_document

        doc = create_document(
            data={
                "title": f"Compte-rendu — {meeting.title}"[:200],
                "visibility": "restricted",
                "keywords": "compte-rendu, réunion",
            },
            file=upload,
            actor=request.user,
            note="Compte-rendu de réunion",
        )
        meeting.minutes_document = doc
        meeting.status = MeetingStatus.ENDED
        meeting.save(update_fields=["minutes_document", "status"])
        record(action=AuditAction.UPDATE, module="meetings", actor=request.user, target=meeting,
               message="Dépôt du compte-rendu (document) + clôture", request=request)
        return Response(MeetingSerializer(meeting, context={"request": request}).data)


class MeetingPollViewSet(viewsets.ModelViewSet):
    serializer_class = MeetingPollSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["meeting"]

    def get_queryset(self):
        return MeetingPoll.objects.filter(
            Q(meeting__organizer=self.request.user)
            | Q(meeting__participants=self.request.user)
        ).distinct().prefetch_related("options__votes")

    def perform_create(self, serializer):
        meeting = serializer.validated_data["meeting"]
        if meeting.organizer_id != self.request.user.id and not self.request.user.is_super_admin:
            raise PermissionDenied("Seul l'organisateur crée un sondage.")
        serializer.save()

    @action(detail=True, methods=["post"])
    def vote(self, request, pk=None):
        poll = self.get_object()
        if not poll.is_open:
            raise ValidationError("Ce sondage est clos.")
        option = MeetingPollOption.objects.filter(pk=request.data.get("option"), poll=poll).first()
        if not option:
            raise ValidationError("Option invalide.")
        MeetingPollVote.objects.filter(option__poll=poll, user=request.user).delete()
        MeetingPollVote.objects.create(option=option, user=request.user)
        fresh = self.get_queryset().get(pk=poll.pk)
        return Response(MeetingPollSerializer(fresh, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="close")
    def close_poll(self, request, pk=None):
        poll = self.get_object()
        if poll.meeting.organizer_id != request.user.id and not request.user.is_super_admin:
            raise PermissionDenied("Seul l'organisateur clôt le sondage.")
        poll.is_open = False
        poll.save(update_fields=["is_open"])
        return Response(MeetingPollSerializer(poll, context={"request": request}).data)
