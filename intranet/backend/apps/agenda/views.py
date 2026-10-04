from __future__ import annotations

import datetime

from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ParseError, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import AuditAction
from apps.audit.services import record
from apps.notifications.services import notify

from .feed import build_feed
from .ical import export_ics, import_ics
from .models import CalendarEvent, EventAttendee
from .serializers import CalendarEventSerializer


def _parse_range(request):
    try:
        start = datetime.datetime.fromisoformat(request.query_params["start"])
        end = datetime.datetime.fromisoformat(request.query_params["end"])
    except (KeyError, ValueError) as exc:
        raise ParseError("Paramètres « start » et « end » (ISO 8601) requis.") from exc
    if timezone.is_naive(start):
        start = timezone.make_aware(start)
    if timezone.is_naive(end):
        end = timezone.make_aware(end)
    return start, end


class AgendaFeedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start, end = _parse_range(request)
        include = request.query_params.get("include")
        include_set = set(include.split(",")) if include else None
        items = build_feed(request.user, start, end, include=include_set)
        return Response([i.as_dict() for i in items])


class TeamAgendaView(APIView):
    """Vue combinée d'équipe : disponibilités des collaborateurs directs."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        start, end = _parse_range(request)
        reports = request.user.direct_reports.filter(is_active=True)
        if not reports.exists() and not request.user.is_super_admin:
            raise PermissionDenied("Aucun collaborateur rattaché.")
        result = []
        for member in reports:
            items = build_feed(member, start, end)
            result.append({
                "user": {"id": str(member.id), "name": member.get_full_name() or member.email},
                "events": [
                    {
                        "start": i.start.isoformat(), "end": i.end.isoformat(),
                        "type": i.type,
                        "title": i.title if i.type != "leave" else "Congé",
                    }
                    for i in items
                ],
            })
        return Response(result)


class CalendarEventViewSet(viewsets.ModelViewSet):
    serializer_class = CalendarEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CalendarEvent.objects.filter(
            Q(owner=self.request.user) | Q(attendees=self.request.user)
        ).distinct().prefetch_related("reminders", "event_attendees__user")

    def perform_create(self, serializer):
        event = serializer.save()
        record(action=AuditAction.CREATE, module="agenda", actor=self.request.user,
               target=event, message=f"Création d'un évènement d'agenda « {event.title} »")
        for att in event.event_attendees.all():
            notify(att.user, title="Invitation à un évènement",
                   body=f"« {event.title} » le {timezone.localtime(event.start):%d/%m %H:%M}",
                   url="/agenda", type="agenda", email=True)

    def perform_update(self, serializer):
        if serializer.instance.owner_id != self.request.user.id:
            raise PermissionDenied("Seul l'organisateur peut modifier cet évènement.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.owner_id != self.request.user.id:
            raise PermissionDenied("Seul l'organisateur peut supprimer cet évènement.")
        instance.delete()

    @action(detail=True, methods=["post"])
    def respond(self, request, pk=None):
        event = self.get_object()
        attendee = EventAttendee.objects.filter(event=event, user=request.user).first()
        if not attendee:
            raise PermissionDenied("Vous n'êtes pas invité à cet évènement.")
        response = request.data.get("response")
        if response not in dict(EventAttendee._meta.get_field("response").choices):
            raise ParseError("Réponse invalide.")
        attendee.set_response(response)
        if event.owner:
            notify(event.owner, title="Réponse à une invitation",
                   body=f"{request.user.get_full_name() or request.user.email} : {attendee.get_response_display()}",
                   url="/agenda", type="agenda")
        fresh = self.get_queryset().get(pk=event.pk)
        return Response(CalendarEventSerializer(fresh, context={"request": request}).data)


class ICalExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = export_ics(request.user)
        record(action=AuditAction.EXPORT, module="agenda", actor=request.user,
               message="Export iCal de l'agenda", request=request)
        resp = HttpResponse(data, content_type="text/calendar")
        resp["Content-Disposition"] = 'attachment; filename="wagadu-agenda.ics"'
        return resp


class ICalImportView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        raw = request.FILES.get("file")
        if not raw:
            raise ParseError("Fichier .ics requis (champ « file »).")
        count = import_ics(request.user, raw.read())
        record(action=AuditAction.CREATE, module="agenda", actor=request.user,
               message=f"Import iCal : {count} évènement(s)", request=request)
        return Response({"imported": count}, status=201)
