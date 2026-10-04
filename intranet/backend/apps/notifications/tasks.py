"""Résumés e-mail des notifications (centre de notifications configurable, §2.11)."""
from __future__ import annotations

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import DigestFrequency, Notification, NotificationPreference


@shared_task
def send_notification_digests(frequency: str) -> dict:
    """Envoie à chaque utilisateur dont la préférence correspond un e-mail
    récapitulant ses notifications non lues de la période."""
    if frequency == DigestFrequency.DAILY:
        since = timezone.now() - timezone.timedelta(days=1)
    elif frequency == DigestFrequency.WEEKLY:
        since = timezone.now() - timezone.timedelta(days=7)
    else:
        return {"sent": 0}

    prefs = NotificationPreference.objects.filter(
        digest_frequency=frequency, email_enabled=True, do_not_disturb=False
    ).select_related("user")

    sent = 0
    for pref in prefs:
        pending = Notification.objects.filter(
            recipient=pref.user, is_read=False, created_at__gte=since
        ).order_by("-created_at")
        if not pending.exists() or not pref.user.email:
            continue
        lines = [f"- {n.title}" + (f" : {n.body}" if n.body else "") for n in pending[:50]]
        body = (
            f"Bonjour {pref.user.get_short_name()},\n\n"
            f"Vous avez {pending.count()} notification(s) non lue(s) :\n\n"
            + "\n".join(lines)
            + "\n\nConnectez-vous à Wagadu Hub pour les consulter."
        )
        send_mail(
            f"[Wagadu Hub] Résumé {'quotidien' if frequency == 'daily' else 'hebdomadaire'}",
            body, settings.DEFAULT_FROM_EMAIL, [pref.user.email], fail_silently=True,
        )
        sent += 1
    return {"frequency": frequency, "sent": sent}
