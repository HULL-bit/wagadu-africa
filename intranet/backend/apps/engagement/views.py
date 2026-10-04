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

from .models import Announcement, Poll, PollOption, PollVote
from .serializers import AnnouncementSerializer, PollSerializer

CAN_ANNOUNCE = HasPermission.of("engagement.announce")


class AnnouncementViewSet(viewsets.ModelViewSet):
    serializer_class = AnnouncementSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), CAN_ANNOUNCE()]

    def get_queryset(self):
        user = self.request.user
        qs = Announcement.objects.select_related("author")
        if self.action == "list" and self.request.query_params.get("all") != "true":
            now = timezone.now()
            qs = qs.filter(publish_at__lte=now).filter(
                Q(expires_at__isnull=True) | Q(expires_at__gt=now)
            ).filter(
                Q(audience="all") | Q(audience="department", department_id=user.department_id)
            )
        return qs

    def perform_create(self, serializer):
        ann = serializer.save(author=self.request.user)
        record(action=AuditAction.CREATE, module="engagement", actor=self.request.user,
               target=ann, message=f"Publication d'une annonce « {ann.title} »")


class PollViewSet(viewsets.ModelViewSet):
    serializer_class = PollSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Poll.objects.select_related("created_by").prefetch_related("options__votes")

    def perform_create(self, serializer):
        poll = serializer.save()
        record(action=AuditAction.CREATE, module="engagement", actor=self.request.user,
               target=poll, message=f"Sondage interne « {poll.question} »")

    def perform_destroy(self, instance):
        if instance.created_by_id != self.request.user.id and not self.request.user.is_super_admin:
            raise PermissionDenied("Seul l'auteur peut supprimer le sondage.")
        instance.delete()

    @action(detail=True, methods=["post"])
    def vote(self, request, pk=None):
        poll = self.get_object()
        if not poll.is_open or (poll.closes_at and poll.closes_at < timezone.now()):
            raise ValidationError("Ce sondage est clos.")
        option_ids = request.data.get("options") or ([request.data["option"]] if request.data.get("option") else [])
        options = list(PollOption.objects.filter(poll=poll, id__in=option_ids))
        if not options:
            raise ValidationError("Aucune option valide.")
        if not poll.multiple_choice and len(options) > 1:
            raise ValidationError("Ce sondage n'autorise qu'un seul choix.")
        PollVote.objects.filter(option__poll=poll, user=request.user).delete()
        PollVote.objects.bulk_create([PollVote(option=o, user=request.user) for o in options])
        fresh = self.get_queryset().get(pk=poll.pk)
        return Response(PollSerializer(fresh, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="close")
    def close_poll(self, request, pk=None):
        poll = self.get_object()
        if poll.created_by_id != request.user.id and not request.user.is_super_admin:
            raise PermissionDenied("Seul l'auteur peut clore le sondage.")
        poll.is_open = False
        poll.save(update_fields=["is_open"])
        return Response(PollSerializer(poll, context={"request": request}).data)
