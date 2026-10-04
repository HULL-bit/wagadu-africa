"""Moteur de circuit de validation.

Un objet métier (ex. ``LeaveRequest``) délègue son cycle d'approbation à un
``ApprovalProcess``. À chaque décision, le moteur avance d'étape, notifie
l'approbateur suivant, et rappelle l'objet cible lorsqu'un état terminal est
atteint (méthodes optionnelles ``on_approval_*`` sur l'objet)."""
from __future__ import annotations

from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.utils import timezone

from apps.audit.models import AuditAction
from apps.audit.services import record
from apps.notifications.services import notify

from .models import (
    ApprovalDecision,
    ApprovalProcess,
    Decision,
    ProcessStatus,
    ValidationFlow,
)


class ValidationError(Exception):
    pass


def get_process(target) -> ApprovalProcess | None:
    """Retourne le dernier processus de validation attaché à un objet métier."""
    ct = ContentType.objects.get_for_model(target)
    return (
        ApprovalProcess.objects.filter(content_type=ct, object_id=str(target.pk))
        .order_by("-created_at")
        .first()
    )


def _first_resolvable_step(steps, subject_user):
    for step in steps:
        if step.resolve_approver(subject_user) is not None or not step.skip_if_unresolved:
            return step
    return None


@transaction.atomic
def start_approval(target, *, flow_code: str, subject_user, actor=None) -> ApprovalProcess:
    flow = ValidationFlow.objects.filter(code=flow_code, is_active=True).first()
    if flow is None:
        raise ValidationError(f"Circuit de validation « {flow_code} » introuvable ou inactif.")

    steps = flow.ordered_steps
    if not steps:
        raise ValidationError("Le circuit ne comporte aucune étape.")

    process = ApprovalProcess.objects.create(
        flow=flow,
        content_type=ContentType.objects.get_for_model(target),
        object_id=str(target.pk),
        subject_user=subject_user,
        status=ProcessStatus.PENDING,
    )

    step = _first_resolvable_step(steps, subject_user)
    if step is None:
        # Aucun approbateur : approbation automatique.
        _finalize(process, ProcessStatus.APPROVED, actor=actor)
        return process

    process.current_step = step
    process.save(update_fields=["current_step"])
    _notify_step(process, step)
    return process


def can_decide(process: ApprovalProcess, user) -> bool:
    if process.status != ProcessStatus.PENDING or process.current_step is None:
        return False
    if getattr(user, "is_super_admin", False):
        return True
    approver = process.current_step.resolve_approver(process.subject_user)
    return approver is not None and approver.pk == user.pk


@transaction.atomic
def submit_decision(process: ApprovalProcess, *, user, decision: str, comment: str = "") -> ApprovalProcess:
    if not can_decide(process, user):
        raise ValidationError("Vous n'êtes pas l'approbateur attendu pour cette étape.")

    ApprovalDecision.objects.create(
        process=process, step=process.current_step, approver=user,
        decision=decision, comment=comment,
    )
    record(
        action=AuditAction.VALIDATE, module="validation", actor=user, target=process,
        message=f"{dict(Decision.choices)[decision]} — étape « {process.current_step.label} »",
        changes={"decision": {"after": decision}},
    )

    if decision == Decision.REJECTED:
        _finalize(process, ProcessStatus.REJECTED, actor=user, comment=comment)
        return process
    if decision == Decision.RETURNED:
        _finalize(process, ProcessStatus.CANCELLED, actor=user, comment=comment, returned=True)
        return process

    # Approuvé : passer à l'étape suivante résolvable.
    remaining = [s for s in process.flow.ordered_steps if s.order > process.current_step.order]
    next_step = _first_resolvable_step(remaining, process.subject_user)
    if next_step is None:
        _finalize(process, ProcessStatus.APPROVED, actor=user)
    else:
        process.current_step = next_step
        process.save(update_fields=["current_step"])
        _notify_step(process, next_step)
    return process


@transaction.atomic
def cancel_process(process: ApprovalProcess, *, user) -> None:
    if process.status != ProcessStatus.PENDING:
        raise ValidationError("Ce processus n'est plus en cours.")
    _finalize(process, ProcessStatus.CANCELLED, actor=user)


def _finalize(process, status, *, actor=None, comment="", returned=False):
    process.status = status
    process.current_step = None
    process.completed_at = timezone.now()
    process.save(update_fields=["status", "current_step", "completed_at"])

    target = process.target
    hook = {
        ProcessStatus.APPROVED: "on_approval_approved",
        ProcessStatus.REJECTED: "on_approval_rejected",
        ProcessStatus.CANCELLED: "on_approval_returned" if returned else "on_approval_cancelled",
    }.get(status)
    if target is not None and hook and hasattr(target, hook):
        getattr(target, hook)(process=process, actor=actor, comment=comment)

    if process.subject_user:
        labels = {
            ProcessStatus.APPROVED: "approuvée",
            ProcessStatus.REJECTED: "rejetée",
            ProcessStatus.CANCELLED: "renvoyée pour correction" if returned else "annulée",
        }
        notify(
            process.subject_user,
            title=f"Demande {labels[status]}",
            body=comment or f"Votre demande « {process.target} » a été {labels[status]}.",
            type="validation",
            email=True,
        )


def _notify_step(process, step):
    approver = step.resolve_approver(process.subject_user)
    if approver:
        notify(
            approver,
            title="Une validation vous attend",
            body=f"« {process.target} » — étape « {step.label} ».",
            url="/leave/validate",
            type="validation",
            email=True,
        )
