"""Rappels d'évènements d'agenda (Celery beat, cadence 1 min)."""
from __future__ import annotations

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from apps.notifications.services import notify

from .models import EventReminder, ReminderChannel


@shared_task
def send_event_reminders() -> dict:
    now = timezone.now()
    sent = 0
    due = EventReminder.objects.filter(sent_at__isnull=True).select_related("event__owner")
    for reminder in due:
        trigger = reminder.event.start - timezone.timedelta(minutes=reminder.minutes_before)
        if trigger <= now <= reminder.event.start:
            recipients = [reminder.event.owner] + [
                a.user for a in reminder.event.event_attendees.select_related("user")
            ]
            for user in recipients:
                if reminder.channel == ReminderChannel.EMAIL and user.email:
                    send_mail(
                        f"[Wagadu Hub] Rappel : {reminder.event.title}",
                        f"Début à {timezone.localtime(reminder.event.start):%d/%m/%Y %H:%M}.",
                        settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True,
                    )
                notify(user, title=f"Rappel : {reminder.event.title}",
                       body=f"Début à {timezone.localtime(reminder.event.start):%H:%M}.",
                       url="/agenda", type="agenda_reminder")
                sent += 1
            reminder.sent_at = now
            reminder.save(update_fields=["sent_at"])
    return {"reminders": sent}
