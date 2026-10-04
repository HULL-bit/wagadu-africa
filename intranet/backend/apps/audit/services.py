"""Couche d'écriture centralisée du journal d'audit (section 7).

Toute action sensible doit passer par :func:`record`. C'est le **seul** point
d'écriture autorisé dans ``AuditLogEntry`` (avec les signaux génériques qui
l'appellent également).
"""
from __future__ import annotations

from typing import Any

from django.conf import settings
from django.db.models import Model

from .middleware import get_current_request, get_current_user
from .models import AuditAction, AuditLogEntry, AuditSeverity

SENSITIVE_FIELDS = {"password", "totp_secret", "token", "secret"}


def _client_meta(request) -> tuple[str | None, str]:
    if request is None:
        return None, ""
    xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
    ip = xff.split(",")[0].strip() if xff else request.META.get("REMOTE_ADDR")
    ua = request.META.get("HTTP_USER_AGENT", "")[:255]
    return ip, ua


def _actor_is_admin(user) -> bool:
    if user is None:
        return False
    if getattr(user, "is_super_admin", False):
        return True
    role = getattr(user, "role", None)
    return bool(role and role.slug == "admin")


def model_to_dict_safe(instance: Model) -> dict[str, Any]:
    data: dict[str, Any] = {}
    for field in instance._meta.fields:
        name = field.name
        if name in SENSITIVE_FIELDS:
            data[name] = "***"
            continue
        try:
            value = getattr(instance, field.attname, None)
        except Exception:  # pragma: no cover - défensif
            continue
        data[name] = value if _json_safe(value) else str(value)
    return data


def _json_safe(value: Any) -> bool:
    return isinstance(value, (str, int, float, bool, type(None)))


def diff(before: dict | None, after: dict | None) -> dict[str, dict]:
    before = before or {}
    after = after or {}
    changes: dict[str, dict] = {}
    for key in set(before) | set(after):
        b, a = before.get(key), after.get(key)
        if b != a:
            changes[key] = {"before": b, "after": a}
    return changes


def record(
    *,
    action: str,
    module: str,
    actor=None,
    target: Model | None = None,
    target_repr: str | None = None,
    changes: dict | None = None,
    message: str = "",
    severity: str = AuditSeverity.INFO,
    confidential: bool = False,
    notify_admins: bool = False,
    request=None,
) -> AuditLogEntry:
    request = request or get_current_request()
    if actor is None:
        actor = get_current_user()
    if actor is not None and not getattr(actor, "is_authenticated", False):
        actor = None

    ip, ua = _client_meta(request)

    target_type = ""
    target_id = ""
    if target is not None:
        target_type = f"{target._meta.app_label}.{target._meta.model_name}"
        target_id = str(target.pk)
        if target_repr is None:
            target_repr = str(target)

    entry = AuditLogEntry.objects.create(
        actor=actor,
        actor_label=(getattr(actor, "email", "") or "système") if actor else "système",
        actor_is_admin=_actor_is_admin(actor),
        confidential=confidential,
        module=module,
        action=action,
        severity=severity,
        target_type=target_type,
        target_id=target_id,
        target_repr=(target_repr or "")[:255],
        changes=changes or {},
        message=message[:255],
        ip_address=ip,
        user_agent=ua,
    )
    _maybe_alert(entry, force=notify_admins)
    return entry


def _maybe_alert(entry: AuditLogEntry, *, force: bool = False) -> None:
    """Notifie les administrateurs : actions critiques, confidentielles, ou forcées."""
    if not (force or entry.confidential or entry.severity == AuditSeverity.CRITICAL):
        return
    from apps.notifications.services import notify_admins

    tag = "confidentielle" if entry.confidential else "critique"
    notify_admins(
        title=f"Action {tag} dans le journal d'audit",
        body=f"{entry.actor_label} — {entry.get_action_display()} — {entry.target_repr}",
        url="/admin/audit",
    )


def audit_login(user, request, success: bool) -> AuditLogEntry:
    return record(
        action=AuditAction.LOGIN if success else AuditAction.LOGIN_FAILED,
        module="accounts",
        actor=user if success else None,
        target=user if success else None,
        message="Connexion réussie" if success else "Échec de connexion",
        severity=AuditSeverity.INFO if success else AuditSeverity.WARNING,
        request=request,
    )


# Modèles suivis automatiquement par les signaux génériques (app_label.ModelName).
AUTO_TRACKED_MODELS: set[str] = set(
    getattr(
        settings,
        "AUDIT_AUTO_TRACKED_MODELS",
        {
            "accounts.User",
            "organization.Department",
            "organization.Team",
            "permissions.Role",
            "permissions.RolePermission",
            "permissions.UserPermissionOverride",
            "hr.Employee",
            "hr.Contract",
            "hr.LeaveRequest",
            "hr.LifecycleProcess",
            "hr.EvaluationCampaign",
            "hr.EvaluationForm",
            "validation.ValidationFlow",
            "validation.ValidationStep",
            "correspondence.Mail",
            "tasks.Task",
            "tasks.RecurringTaskTemplate",
            "documents.Document",
            "documents.DocumentVisibilityRule",
            "meetings.Meeting",
            "agenda.CalendarEvent",
            "demands.Request",
            "demands.RequestType",
            "engagement.Announcement",
            "engagement.Poll",
            "projects.Project",
            "projects.Milestone",
        },
    )
)
