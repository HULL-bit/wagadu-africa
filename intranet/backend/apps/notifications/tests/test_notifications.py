import pytest

from apps.notifications.models import Notification
from apps.notifications.services import notify

pytestmark = pytest.mark.django_db


def test_user_only_sees_own_notifications(auth, employee, chef):
    notify(employee, title="Pour l'employé")
    notify(chef, title="Pour le chef")
    resp = auth(employee).get("/api/v1/notifications/")
    assert resp.status_code == 200
    assert resp.data["count"] == 1
    assert resp.data["results"][0]["title"] == "Pour l'employé"


def test_mark_read(auth, employee):
    n = notify(employee, title="À lire")
    resp = auth(employee).post(f"/api/v1/notifications/{n.id}/read/")
    assert resp.status_code == 200
    n.refresh_from_db()
    assert n.is_read and n.read_at is not None


def test_read_all(auth, employee):
    for i in range(3):
        notify(employee, title=f"n{i}")
    resp = auth(employee).post("/api/v1/notifications/read-all/")
    assert resp.data["updated"] == 3
    assert Notification.objects.filter(recipient=employee, is_read=False).count() == 0


def test_unread_count(auth, employee):
    notify(employee, title="a")
    notify(employee, title="b")
    resp = auth(employee).get("/api/v1/notifications/unread_count/")
    assert resp.data["count"] == 2
