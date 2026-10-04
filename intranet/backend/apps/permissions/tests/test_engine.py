import pytest

from apps.permissions.models import (
    OverrideEffect,
    Permission,
    ScopeType,
    UserPermissionOverride,
)
from apps.permissions.services import Scope, effective_permissions, has_permission

pytestmark = pytest.mark.django_db


def _override(user, code, effect, granted_by, **kw):
    return UserPermissionOverride.objects.create(
        user=user,
        permission=Permission.objects.get(code=code),
        effect=effect,
        granted_by=granted_by,
        **kw,
    )


def test_role_socle_grants_permission(chef):
    assert has_permission(chef, "tasks.assign") is True
    assert has_permission(chef, "hr.manage") is False


def test_employee_cannot_assign_tasks(employee):
    assert has_permission(employee, "tasks.assign") is False


def test_individual_grant_overrides_role(employee, super_admin):
    assert has_permission(employee, "documents.broadcast") is False
    _override(employee, "documents.broadcast", OverrideEffect.GRANT, super_admin)
    assert has_permission(employee, "documents.broadcast") is True


def test_deny_beats_grant(chef, super_admin):
    _override(chef, "tasks.assign", OverrideEffect.GRANT, super_admin)
    _override(chef, "tasks.assign", OverrideEffect.DENY, super_admin)
    assert has_permission(chef, "tasks.assign") is False


def test_scope_limits_override(employee, super_admin):
    _override(
        employee, "documents.broadcast", OverrideEffect.GRANT, super_admin,
        scope_type=ScopeType.DEPARTMENT, scope_id="42",
    )
    assert has_permission(employee, "documents.broadcast", Scope(department_id="42")) is True
    assert has_permission(employee, "documents.broadcast", Scope(department_id="7")) is False
    assert has_permission(employee, "documents.broadcast") is False


def test_revoked_override_is_ignored(employee, super_admin):
    ov = _override(employee, "documents.broadcast", OverrideEffect.GRANT, super_admin)
    ov.revoke(super_admin)
    assert has_permission(employee, "documents.broadcast") is False


def test_super_admin_bypasses_everything(super_admin):
    assert has_permission(super_admin, "platform.settings") is True
    assert has_permission(super_admin, "any.unknown.code") is True


def test_inactive_user_has_no_permission(chef):
    chef.is_active = False
    chef.save()
    assert has_permission(chef, "tasks.assign") is False


def test_effective_permissions_reports_source(employee, super_admin):
    _override(employee, "documents.broadcast", OverrideEffect.GRANT, super_admin)
    result = effective_permissions(employee)
    assert result["documents.broadcast"]["granted"] is True
    assert result["documents.broadcast"]["source"] == "grant"
    assert result["tasks.view"]["source"] == "role"
