import pytest
from django.core import mail

from apps.notifications.models import NotificationPreference
from apps.notifications.services import notify
from apps.notifications.tasks import send_notification_digests

pytestmark = pytest.mark.django_db


def test_daily_digest_sends_email_of_unread(employee):
    NotificationPreference.objects.update_or_create(
        user=employee, defaults={"digest_frequency": "daily", "email_enabled": True}
    )
    notify(employee, title="Tâche assignée", body="Rapport hebdo")
    notify(employee, title="Document reçu")

    mail.outbox.clear()
    result = send_notification_digests("daily")
    assert result["sent"] == 1
    assert len(mail.outbox) == 1
    assert "2 notification(s)" in mail.outbox[0].body


def test_immediate_preference_gets_no_digest(employee):
    NotificationPreference.objects.update_or_create(
        user=employee, defaults={"digest_frequency": "immediate"}
    )
    notify(employee, title="x")
    mail.outbox.clear()
    assert send_notification_digests("daily")["sent"] == 0
