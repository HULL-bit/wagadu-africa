"""Génération et suivi des processus d'intégration / de départ."""
from __future__ import annotations

import datetime

from django.db import transaction
from django.utils import timezone

from apps.audit.models import AuditAction
from apps.audit.services import record
from apps.notifications.services import notify

from .models import (
    Employee,
    LifecycleItem,
    LifecycleKind,
    LifecycleProcess,
    LifecycleTemplate,
    ResponsibleRole,
)


def _resolve_responsible(role: str, employee: Employee):
    from apps.accounts.models import User
    from apps.permissions.services import has_permission

    if role == ResponsibleRole.EMPLOYEE:
        return employee.user
    if role == ResponsibleRole.MANAGER:
        return employee.user.manager
    if role == ResponsibleRole.HR:
        return next((u for u in User.objects.filter(is_active=True) if has_permission(u, "hr.manage")), None)
    return None  # IT : pas de résolution automatique


def _as_date(value) -> datetime.date | None:
    if value is None or isinstance(value, datetime.date):
        return value
    try:
        return datetime.date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


@transaction.atomic
def start_lifecycle(*, employee: Employee, kind: str, actor, template: LifecycleTemplate | None = None,
                    reference_date: datetime.date | None = None) -> LifecycleProcess:
    template = template or LifecycleTemplate.objects.filter(kind=kind, is_default=True).first()
    reference_date = _as_date(reference_date)
    if reference_date is None:
        reference_date = (
            _as_date(employee.hire_date) if kind == LifecycleKind.ONBOARDING else timezone.now().date()
        )

    existing = LifecycleProcess.objects.filter(
        kind=kind, employee=employee, status=LifecycleProcess.Status.IN_PROGRESS
    ).first()
    if existing:
        return existing

    process = LifecycleProcess.objects.create(
        kind=kind, employee=employee, template=template, started_by=actor,
        reference_date=reference_date or timezone.now().date(),
    )
    for tpl_item in (template.items.all() if template else []):
        responsible = _resolve_responsible(tpl_item.responsible_role, employee)
        due = None
        if process.reference_date:
            due = process.reference_date + datetime.timedelta(days=tpl_item.due_offset_days)
        LifecycleItem.objects.create(
            process=process, label=tpl_item.label, category=tpl_item.category,
            responsible_role=tpl_item.responsible_role, responsible=responsible,
            due_date=due, order=tpl_item.order,
        )
        if responsible:
            notify(responsible, title=f"{process.get_kind_display()} — action à réaliser",
                   body=f"{tpl_item.label} ({employee.matricule})",
                   url=f"/hr/lifecycle/{process.id}", type="hr_lifecycle")

    record(action=AuditAction.CREATE, module="hr", actor=actor, target=process,
           message=f"Démarrage {process.get_kind_display()} — {employee.matricule}")
    return process


def toggle_item(item: LifecycleItem, *, actor, done: bool, notes: str = "") -> LifecycleItem:
    item.is_done = done
    item.done_by = actor if done else None
    item.done_at = timezone.now() if done else None
    if notes:
        item.notes = notes
    item.save(update_fields=["is_done", "done_by", "done_at", "notes"])
    item.process.refresh_status()
    record(action=AuditAction.UPDATE, module="hr", actor=actor, target=item.process,
           message=f"{'✓' if done else '○'} {item.label}")
    return item
