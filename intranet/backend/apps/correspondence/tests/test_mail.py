import pytest
from django.utils import timezone

from apps.audit.models import AuditLogEntry
from apps.correspondence.models import Mail, MailCategory, MailEvent
from apps.correspondence.tasks import remind_untreated_mail
from apps.notifications.models import Notification

pytestmark = pytest.mark.django_db


def _register(client, **overrides):
    payload = {
        "direction": "incoming",
        "subject": "Demande de partenariat",
        "correspondent": "Ministère de l'Environnement",
        "mail_date": "2026-08-20",
        "body": "Projet reboisement",
    }
    payload.update(overrides)
    return client.post("/api/v1/mail/", payload, format="json")


def test_employee_without_register_permission_is_forbidden(auth, employee):
    assert _register(auth(employee)).status_code == 403


def test_chef_registers_incoming_mail_with_auto_reference(auth, chef):
    resp = _register(auth(chef))
    assert resp.status_code == 201
    ref = resp.data["reference"]
    assert ref.startswith(f"{timezone.now().year}-ARR-")
    assert AuditLogEntry.objects.filter(module="mail", action="create").exists()


def test_reference_counter_increments(auth, chef):
    r1 = _register(auth(chef)).data["reference"]
    r2 = _register(auth(chef)).data["reference"]
    assert int(r1.split("-")[-1]) + 1 == int(r2.split("-")[-1])


def test_outgoing_mail_uses_dep_tag(auth, chef):
    resp = _register(auth(chef), direction="outgoing", subject="Réponse")
    assert "-DEP-" in resp.data["reference"]


def test_auto_categorization_by_keyword(auth, chef):
    MailCategory.objects.create(name="Partenariats", keywords="partenariat, convention")
    resp = _register(auth(chef), subject="Proposition de partenariat stratégique")
    assert resp.data["category"] is not None


def test_assignment_notifies_recipient_and_logs_event(auth, chef, employee):
    mail_id = _register(auth(chef)).data["id"]
    resp = auth(chef).post(f"/api/v1/mail/{mail_id}/assign/", {"user": str(employee.id)}, format="json")
    assert resp.status_code == 200
    assert resp.data["status"] == "assigned"
    assert Notification.objects.filter(recipient=employee, type="mail").exists()
    assert MailEvent.objects.filter(mail_id=mail_id, type="assigned").exists()


def test_acknowledgement_is_timestamped_and_idempotent(auth, chef, employee):
    mail_id = _register(auth(chef)).data["id"]
    auth(chef).post(f"/api/v1/mail/{mail_id}/assign/", {"user": str(employee.id)}, format="json")
    r1 = auth(employee).post(f"/api/v1/mail/{mail_id}/acknowledge/")
    assert r1.status_code == 200
    assert len(r1.data["acknowledgements"]) == 1
    auth(employee).post(f"/api/v1/mail/{mail_id}/acknowledge/")
    assert Mail.objects.get(id=mail_id).acknowledgements.count() == 1


def test_retrieve_logs_a_view_event(auth, chef):
    mail_id = _register(auth(chef)).data["id"]
    auth(chef).get(f"/api/v1/mail/{mail_id}/")
    assert MailEvent.objects.filter(mail_id=mail_id, type="viewed").exists()


def test_reminder_task_pings_assignee_for_overdue_mail(auth, chef, employee):
    mail_id = _register(auth(chef)).data["id"]
    auth(chef).post(f"/api/v1/mail/{mail_id}/assign/", {"user": str(employee.id)}, format="json")
    Mail.objects.filter(id=mail_id).update(
        due_date=timezone.now().date() - timezone.timedelta(days=1)
    )
    assert remind_untreated_mail()["reminders"] == 1
    assert Notification.objects.filter(recipient=employee, type="mail_reminder").exists()
    assert remind_untreated_mail()["reminders"] == 0


def test_export_requires_permission(auth, employee, chef):
    assert auth(employee).get("/api/v1/mail/export/").status_code in (403, 400)
