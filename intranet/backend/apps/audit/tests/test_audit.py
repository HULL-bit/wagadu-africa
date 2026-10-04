import pytest
from django.utils import timezone

from apps.audit.models import AuditAction, AuditLogEntry, AuditSeverity
from apps.audit.services import record
from apps.audit.tasks import purge_audit_log
from apps.permissions.models import OverrideEffect, Permission, UserPermissionOverride

pytestmark = pytest.mark.django_db


def test_entry_cannot_be_updated(super_admin):
    entry = record(action=AuditAction.CREATE, module="test", actor=super_admin)
    entry.message = "altéré"
    with pytest.raises(ValueError):
        entry.save()


def test_entry_cannot_be_deleted(super_admin):
    entry = record(action=AuditAction.CREATE, module="test", actor=super_admin)
    with pytest.raises(ValueError):
        entry.delete()


def test_user_creation_is_audited(make_user):
    make_user("audited@wagadu.africa", "employe")
    assert AuditLogEntry.objects.filter(
        module="accounts", action="create", target_repr__icontains="audited@wagadu.africa"
    ).exists()


def test_permission_override_on_admin_is_critical(admin_user, make_user):
    granter = make_user("granter@wagadu.africa", "admin")
    UserPermissionOverride.objects.create(
        user=admin_user,
        permission=Permission.objects.get(code="documents.broadcast"),
        effect=OverrideEffect.GRANT,
        granted_by=granter,
    )
    assert AuditLogEntry.objects.filter(
        module="permissions", severity=AuditSeverity.CRITICAL
    ).exists()


def test_audit_log_is_not_writable_through_api(auth, admin_user):
    # aucune route d'écriture n'est exposée
    resp = auth(admin_user).post("/api/v1/audit/", {"module": "x", "action": "create"}, format="json")
    assert resp.status_code in (403, 405)


def test_export_requires_permission(auth, employee):
    assert auth(employee).get("/api/v1/audit/export/").status_code == 403


def test_admin_actions_hidden_without_dedicated_permission(auth, admin_user, make_user):
    make_user("another-admin@wagadu.africa", "admin")  # génère une entrée actor_is_admin
    record(action=AuditAction.LOGIN, module="accounts", actor=admin_user)
    resp = auth(admin_user).get("/api/v1/audit/")
    assert resp.status_code == 200
    assert all(not row["actor_is_admin"] for row in resp.data["results"])


def test_super_admin_sees_admin_actions(auth, super_admin, admin_user):
    record(action=AuditAction.LOGIN, module="accounts", actor=admin_user)
    resp = auth(super_admin).get("/api/v1/audit/")
    assert any(row["actor_is_admin"] for row in resp.data["results"])


def test_purge_archives_and_removes_old_entries(super_admin, settings):
    old = record(action=AuditAction.CREATE, module="test", actor=super_admin)
    AuditLogEntry.objects.filter(pk=old.pk).update(
        timestamp=timezone.now() - timezone.timedelta(days=400)
    )
    fresh = record(action=AuditAction.CREATE, module="test", actor=super_admin)
    result = purge_audit_log()
    assert result["purged"] == 1
    assert not AuditLogEntry.objects.filter(pk=old.pk).exists()
    assert AuditLogEntry.objects.filter(pk=fresh.pk).exists()
