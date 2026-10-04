import pytest

from apps.accounts.models import User
from apps.audit.models import AuditLogEntry

pytestmark = pytest.mark.django_db


def test_employee_cannot_list_users(auth, employee):
    assert auth(employee).get("/api/v1/users/").status_code == 403


def test_admin_can_create_regular_user(auth, admin_user, roles):
    resp = auth(admin_user).post(
        "/api/v1/users/",
        {
            "email": "new@wagadu.africa",
            "first_name": "Nouveau",
            "role": roles["employe"].id,
            "password": "Wagadu2026!Hub",
        },
        format="json",
    )
    assert resp.status_code == 201
    assert User.objects.filter(email="new@wagadu.africa").exists()
    assert AuditLogEntry.objects.filter(module="accounts", action="create").exists()


def test_admin_cannot_create_another_admin(auth, admin_user, roles):
    resp = auth(admin_user).post(
        "/api/v1/users/",
        {"email": "admin3@wagadu.africa", "role": roles["admin"].id, "password": "Wagadu2026!Hub"},
        format="json",
    )
    assert resp.status_code == 403


def test_super_admin_can_create_admin(auth, super_admin, roles):
    resp = auth(super_admin).post(
        "/api/v1/users/",
        {"email": "admin3@wagadu.africa", "role": roles["admin"].id, "password": "Wagadu2026!Hub"},
        format="json",
    )
    assert resp.status_code == 201


def test_destroy_is_soft_delete(auth, admin_user, employee):
    resp = auth(admin_user).delete(f"/api/v1/users/{employee.id}/")
    assert resp.status_code == 204
    employee.refresh_from_db()
    assert employee.is_active is False
    assert employee.status == "suspended"


def test_super_admin_account_cannot_be_deleted(auth, super_admin):
    other = User.objects.create_superuser(email="root2@wagadu.africa", password="Wagadu2026!Hub")
    resp = auth(super_admin).delete(f"/api/v1/users/{other.id}/")
    assert resp.status_code == 403
