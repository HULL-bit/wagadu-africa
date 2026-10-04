from __future__ import annotations

from django.conf import settings
from django.core.mail import send_mail

from .models import Notification, NotificationChannel


def notify(
    recipient,
    *,
    title: str,
    body: str = "",
    url: str = "",
    type: str = "generic",
    email: bool = False,
) -> Notification:
    notification = Notification.objects.create(
        recipient=recipient,
        title=title,
        body=body,
        url=url,
        type=type,
        channel=NotificationChannel.EMAIL if email else NotificationChannel.IN_APP,
    )
    pref = getattr(recipient, "notification_preference", None)
    wants_email = email and (pref is None or pref.email_enabled)
    if wants_email and recipient.email:
        send_mail(
            subject=f"[Wagadu Hub] {title}",
            message=body or title,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient.email],
            fail_silently=True,
        )
    return notification


def notify_many(recipients, **kwargs) -> list[Notification]:
    return [notify(r, **kwargs) for r in recipients]


def notify_admins(*, title: str, body: str = "", url: str = "") -> list[Notification]:
    from apps.accounts.models import User

    admins = User.objects.filter(is_active=True).filter(
        models_q_admin()
    )
    return notify_many(admins, title=title, body=body, url=url, type="audit_alert", email=True)


def models_q_admin():
    from django.db.models import Q

    return Q(is_super_admin=True) | Q(role__slug="admin")
