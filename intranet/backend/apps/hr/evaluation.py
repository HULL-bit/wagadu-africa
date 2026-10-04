"""Cycle des évaluations de performance :
auto-évaluation → évaluation du responsable → prise de connaissance → finalisée."""
from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.audit.models import AuditAction
from apps.audit.services import record
from apps.notifications.services import notify

from .models import (
    Employee,
    Evaluation,
    EvaluationAnswer,
    EvaluationCampaign,
)


@transaction.atomic
def open_campaign(campaign: EvaluationCampaign, *, actor) -> EvaluationCampaign:
    if campaign.status != EvaluationCampaign.Status.DRAFT:
        raise ValidationError("La campagne est déjà ouverte ou clôturée.")

    employees = Employee.objects.exclude(hr_status="left").select_related("user")
    if campaign.department_id:
        employees = employees.filter(user__department_id=campaign.department_id)

    created = 0
    for employee in employees:
        evaluation, is_new = Evaluation.objects.get_or_create(
            campaign=campaign, employee=employee,
            defaults={"evaluator": employee.user.manager, "status": Evaluation.Status.PENDING},
        )
        if is_new:
            created += 1
            notify(employee.user, title="Nouvelle campagne d'évaluation",
                   body=f"« {campaign.name} » — merci de compléter votre auto-évaluation.",
                   url="/hr/evaluations", type="evaluation", email=True)

    campaign.status = EvaluationCampaign.Status.OPEN
    campaign.save(update_fields=["status"])
    record(action=AuditAction.CREATE, module="hr", actor=actor, target=campaign,
           message=f"Ouverture de la campagne d'évaluation ({created} évaluations)")
    return campaign


def close_campaign(campaign: EvaluationCampaign, *, actor) -> EvaluationCampaign:
    campaign.status = EvaluationCampaign.Status.CLOSED
    campaign.save(update_fields=["status"])
    record(action=AuditAction.UPDATE, module="hr", actor=actor, target=campaign,
           message="Clôture de la campagne d'évaluation")
    return campaign


def _score(evaluation: Evaluation, field: str) -> Decimal | None:
    total_weight = Decimal(0)
    weighted = Decimal(0)
    for answer in evaluation.answers.select_related("question"):
        if answer.question.type != "rating_1_5":
            continue
        raw = getattr(answer, field)
        if not raw:
            continue
        try:
            value = Decimal(str(raw))
        except Exception:
            continue
        weighted += value * answer.question.weight
        total_weight += answer.question.weight
    return round(weighted / total_weight, 2) if total_weight else None


@transaction.atomic
def submit_self_assessment(evaluation: Evaluation, *, user, answers: dict, comment: str = "") -> Evaluation:
    if evaluation.employee.user_id != user.id:
        raise PermissionDenied("Seul l'employé concerné peut réaliser son auto-évaluation.")
    if evaluation.status not in (Evaluation.Status.PENDING, Evaluation.Status.SELF_ASSESSED):
        raise ValidationError("L'auto-évaluation n'est plus modifiable à ce stade.")

    _save_answers(evaluation, answers, "self_value")
    evaluation.self_score = _score(evaluation, "self_value")
    evaluation.employee_comment = comment
    evaluation.status = Evaluation.Status.SELF_ASSESSED
    evaluation.save(update_fields=["self_score", "employee_comment", "status"])

    if evaluation.evaluator:
        notify(evaluation.evaluator, title="Auto-évaluation à examiner",
               body=f"{evaluation.employee.user.get_full_name()} a complété son auto-évaluation.",
               url="/hr/evaluations", type="evaluation", email=True)
    record(action=AuditAction.UPDATE, module="hr", actor=user, target=evaluation,
           message="Auto-évaluation soumise")
    return evaluation


@transaction.atomic
def submit_manager_assessment(evaluation: Evaluation, *, user, answers: dict, comment: str = "") -> Evaluation:
    if not (user.is_super_admin or evaluation.evaluator_id == user.id
            or _is_hr(user)):
        raise PermissionDenied("Vous n'êtes pas l'évaluateur de cet employé.")
    if evaluation.status not in (Evaluation.Status.SELF_ASSESSED, Evaluation.Status.MANAGER_ASSESSED):
        raise ValidationError("L'auto-évaluation doit être faite au préalable.")

    _save_answers(evaluation, answers, "manager_value")
    evaluation.manager_score = _score(evaluation, "manager_value")
    evaluation.overall_comment = comment
    evaluation.status = Evaluation.Status.MANAGER_ASSESSED
    evaluation.save(update_fields=["manager_score", "overall_comment", "status"])

    notify(evaluation.employee.user, title="Votre évaluation est disponible",
           body=f"« {evaluation.campaign.name} » — merci d'en prendre connaissance.",
           url="/hr/evaluations", type="evaluation", email=True)
    record(action=AuditAction.VALIDATE, module="hr", actor=user, target=evaluation,
           message="Évaluation du responsable soumise")
    return evaluation


@transaction.atomic
def acknowledge(evaluation: Evaluation, *, user, comment: str = "") -> Evaluation:
    if evaluation.employee.user_id != user.id:
        raise PermissionDenied("Non autorisé.")
    if evaluation.status != Evaluation.Status.MANAGER_ASSESSED:
        raise ValidationError("Rien à valider à ce stade.")
    if comment:
        evaluation.employee_comment = (evaluation.employee_comment + "\n" + comment).strip()
    evaluation.status = Evaluation.Status.ACKNOWLEDGED
    evaluation.save(update_fields=["status", "employee_comment"])
    record(action=AuditAction.UPDATE, module="hr", actor=user, target=evaluation,
           message="Prise de connaissance de l'évaluation")
    return evaluation


@transaction.atomic
def finalize(evaluation: Evaluation, *, user) -> Evaluation:
    if not (_is_hr(user) or user.is_super_admin):
        raise PermissionDenied("Seul le RH peut finaliser une évaluation.")
    evaluation.status = Evaluation.Status.FINALIZED
    evaluation.finalized_at = timezone.now()
    evaluation.save(update_fields=["status", "finalized_at"])

    from .models import CareerEvent

    CareerEvent.objects.create(
        employee=evaluation.employee, type=CareerEvent.Type.OTHER,
        date=timezone.now().date(), title=f"Évaluation « {evaluation.campaign.name} »",
        description=f"Score responsable : {evaluation.manager_score or '—'} / 5.",
        recorded_by=user,
    )
    record(action=AuditAction.VALIDATE, module="hr", actor=user, target=evaluation,
           message="Évaluation finalisée")
    return evaluation


def _save_answers(evaluation: Evaluation, answers: dict, field: str):
    valid_ids = set(evaluation.campaign.form.questions.values_list("id", flat=True))
    for qid, value in answers.items():
        if int(qid) not in valid_ids:
            continue
        answer, _ = EvaluationAnswer.objects.get_or_create(evaluation=evaluation, question_id=int(qid))
        setattr(answer, field, str(value)[:2000])
        answer.save(update_fields=[field])


def _is_hr(user) -> bool:
    from apps.permissions.services import has_permission

    return has_permission(user, "hr.manage")
