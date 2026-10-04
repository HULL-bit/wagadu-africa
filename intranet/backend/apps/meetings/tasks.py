"""Rappels de réunion (Celery beat) — 15 min avant le début."""
from __future__ import annotations

from celery import shared_task
from django.utils import timezone

from apps.notifications.services import notify

from .models import Meeting, MeetingStatus


@shared_task
def send_meeting_reminders() -> dict:
    now = timezone.now()
    window_end = now + timezone.timedelta(minutes=15)
    upcoming = Meeting.objects.filter(
        status=MeetingStatus.SCHEDULED,
        reminder_sent_at__isnull=True,
        start__gt=now,
        start__lte=window_end,
    ).prefetch_related("meeting_participants__user")

    sent = 0
    for meeting in upcoming:
        for participant in meeting.meeting_participants.select_related("user"):
            notify(
                participant.user,
                title=f"Réunion dans 15 min : {meeting.title}",
                body=f"Début à {timezone.localtime(meeting.start):%H:%M}.",
                url=f"/meetings/{meeting.id}",
                type="meeting_reminder", email=True,
            )
            sent += 1
        meeting.reminder_sent_at = now
        meeting.save(update_fields=["reminder_sent_at"])
    return {"reminders": sent}


@shared_task
def close_stale_meetings() -> dict:
    now = timezone.now()
    updated = Meeting.objects.filter(
        status__in=[MeetingStatus.SCHEDULED, MeetingStatus.ONGOING],
        end__lt=now - timezone.timedelta(hours=1),
    ).update(status=MeetingStatus.ENDED)
    return {"closed": updated}
