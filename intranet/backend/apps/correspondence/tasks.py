"""Rappel automatique du courrier resté sans traitement (section 2.2)."""
from __future__ import annotations

from celery import shared_task
from django.utils import timezone

from apps.notifications.services import notify

from .models import Mail, MailStatus


@shared_task
def remind_untreated_mail() -> dict:
    today = timezone.now().date()
    stale = Mail.objects.filter(
        due_date__lt=today,
        reminder_sent_at__isnull=True,
    ).exclude(status__in=[MailStatus.PROCESSED, MailStatus.ARCHIVED]).select_related(
        "assigned_to", "registered_by"
    )
    count = 0
    for mail in stale:
        recipient = mail.assigned_to or mail.registered_by
        if recipient:
            notify(
                recipient,
                title="Courrier en attente de traitement",
                body=f"{mail.reference} — « {mail.subject} » a dépassé son échéance ({mail.due_date}).",
                url=f"/mail/{mail.id}",
                type="mail_reminder", email=True,
            )
            mail.reminder_sent_at = timezone.now()
            mail.save(update_fields=["reminder_sent_at"])
            count += 1
    return {"reminders": count}
