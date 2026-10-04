import pytest

from apps.audit.models import AuditLogEntry

pytestmark = pytest.mark.django_db


def test_employee_cannot_create_department(auth, employee):
    resp = auth(employee).post(
        "/api/v1/departments/", {"name": "Logistique", "code": "log"}, format="json"
    )
    assert resp.status_code == 403


def test_chef_can_view_but_not_manage(auth, chef):
    assert auth(chef).get("/api/v1/departments/").status_code == 200
    assert auth(chef).post(
        "/api/v1/departments/", {"name": "X", "code": "x"}, format="json"
    ).status_code == 403


def test_admin_creates_department_and_it_is_audited(auth, admin_user):
    resp = auth(admin_user).post(
        "/api/v1/departments/", {"name": "Programmes", "code": "prog"}, format="json"
    )
    assert resp.status_code == 201
    assert AuditLogEntry.objects.filter(module="organization", action="create").exists()
