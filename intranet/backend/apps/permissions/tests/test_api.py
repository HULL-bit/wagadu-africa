import pytest

from apps.audit.models import AuditLogEntry
from apps.permissions.models import Permission, UserPermissionOverride

pytestmark = pytest.mark.django_db


def test_employee_cannot_list_roles(auth, employee):
    resp = auth(employee).get("/api/v1/roles/")
    assert resp.status_code == 403


def test_admin_can_list_roles(auth, admin_user):
    resp = auth(admin_user).get("/api/v1/roles/")
    assert resp.status_code == 200


def test_admin_can_redefine_role_permissions_and_it_is_audited(auth, admin_user, roles):
    role = roles["employe"]
    resp = auth(admin_user).put(
        f"/api/v1/roles/{role.id}/permissions/",
        {"permission_codes": ["tasks.view", "documents.view"]},
        format="json",
    )
    assert resp.status_code == 200
    assert set(role.permission_codes) == {"tasks.view", "documents.view"}
    assert AuditLogEntry.objects.filter(
        module="permissions", action="permission_change", target_id=str(role.id)
    ).exists()


def test_system_role_cannot_be_deleted(auth, admin_user, roles):
    resp = auth(admin_user).delete(f"/api/v1/roles/{roles['employe'].id}/")
    assert resp.status_code == 403


def test_admin_grants_individual_override(auth, admin_user, employee):
    perm = Permission.objects.get(code="documents.broadcast")
    resp = auth(admin_user).post(
        "/api/v1/permission-overrides/",
        {"user": str(employee.id), "permission": perm.id, "effect": "grant"},
        format="json",
    )
    assert resp.status_code == 201
    assert UserPermissionOverride.objects.filter(user=employee, permission=perm).exists()


def test_non_super_admin_cannot_touch_admin_permissions(auth, admin_user, make_user):
    other_admin = make_user("admin2@wagadu.africa", "admin")
    perm = Permission.objects.get(code="documents.broadcast")
    resp = auth(admin_user).post(
        "/api/v1/permission-overrides/",
        {"user": str(other_admin.id), "permission": perm.id, "effect": "grant"},
        format="json",
    )
    assert resp.status_code == 403


def test_effective_permissions_endpoint(auth, admin_user, chef):
    resp = auth(admin_user).get(f"/api/v1/users/{chef.id}/effective-permissions/")
    assert resp.status_code == 200
    assert resp.data["tasks.assign"]["granted"] is True
