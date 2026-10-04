from __future__ import annotations

import datetime

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.audit.models import AuditAction
from apps.audit.services import record
from apps.notifications.services import notify

from .models import (
    ProgressStatus,
    SubmissionStatus,
    Task,
    TaskAssignment,
    TaskStatus,
    TaskSubmission,
)


def _expand_assignee_users(*, users=None, team=None, department=None):
    from apps.accounts.models import User

    ids = {u.id for u in (users or [])}
    if team is not None:
        ids.update(team.members.values_list("id", flat=True))
    if department is not None:
        ids.update(
            User.objects.filter(department=department, is_active=True).values_list("id", flat=True)
        )
    return list(User.objects.filter(id__in=ids, is_active=True))


@transaction.atomic
def create_task(*, data: dict, actor, assignee_users=None, team=None, department=None,
                label_ids=None) -> Task:
    task = Task.objects.create(created_by=actor, **data)
    if label_ids:
        task.labels.set(label_ids)

    people = _expand_assignee_users(users=assignee_users, team=team, department=department)
    for user in people:
        TaskAssignment.objects.get_or_create(
            task=task, user=user, defaults={"assigned_by": actor}
        )
    record(action=AuditAction.CREATE, module="tasks", actor=actor, target=task,
           message=f"Création de la tâche « {task.title} » ({len(people)} assigné(s))")
    for user in people:
        _notify_assignment(task, user)
    return task


def _notify_assignment(task: Task, user) -> None:
    notify(
        user,
        title="Nouvelle tâche assignée",
        body=f"« {task.title} »"
             + (f" — échéance {timezone.localtime(task.due_at):%d/%m %H:%M}" if task.due_at else ""),
        url=f"/tasks/{task.id}",
        type="task", email=True,
    )


@transaction.atomic
def set_assignees(task: Task, *, actor, add_user_ids=None, remove_user_ids=None) -> Task:
    from apps.accounts.models import User

    for uid in remove_user_ids or []:
        TaskAssignment.objects.filter(task=task, user_id=uid).delete()
    for user in User.objects.filter(id__in=add_user_ids or [], is_active=True):
        _, created = TaskAssignment.objects.get_or_create(
            task=task, user=user, defaults={"assigned_by": actor}
        )
        if created:
            _notify_assignment(task, user)
    record(action=AuditAction.UPDATE, module="tasks", actor=actor, target=task,
           message="Mise à jour des assignés")
    task.recompute_status()
    return task


@transaction.atomic
def submit_task(task: Task, *, user, report: str = "", declared_hours=None) -> TaskSubmission:
    assignment = TaskAssignment.objects.filter(task=task, user=user).first()
    if assignment is None:
        raise PermissionDenied("Cette tâche ne vous est pas assignée.")

    submission, _ = TaskSubmission.objects.update_or_create(
        task=task, submitted_by=user,
        defaults={
            "report": report,
            "declared_hours": declared_hours,
            "status": SubmissionStatus.SUBMITTED,
            "review_comment": "",
            "reviewed_by": None,
            "reviewed_at": None,
        },
    )
    assignment.progress_status = ProgressStatus.SUBMITTED
    if declared_hours is not None:
        assignment.declared_hours = declared_hours
    assignment.save(update_fields=["progress_status", "declared_hours"])

    task.recompute_status()
    record(action=AuditAction.CREATE, module="tasks", actor=user, target=task,
           message="Soumission d'un livrable")
    if task.created_by:
        notify(task.created_by, title="Livrable soumis",
               body=f"{user.get_full_name() or user.email} a soumis « {task.title} ».",
               url=f"/tasks/{task.id}", type="task", email=True)
    return submission


@transaction.atomic
def review_submission(task: Task, *, reviewer, target_user_id, decision: str, comment: str = "") -> None:
    submission = TaskSubmission.objects.filter(task=task, submitted_by_id=target_user_id).first()
    if submission is None:
        raise ValidationError("Aucune soumission de cet employé pour cette tâche.")
    assignment = TaskAssignment.objects.get(task=task, user_id=target_user_id)

    if decision == "validated":
        submission.status = SubmissionStatus.VALIDATED
        assignment.progress_status = ProgressStatus.VALIDATED
    elif decision == "returned":
        submission.status = SubmissionStatus.RETURNED
        assignment.progress_status = ProgressStatus.RETURNED
        if task.status == TaskStatus.IN_REVIEW:
            task.status = TaskStatus.IN_PROGRESS
            task.save(update_fields=["status"])
    else:
        raise ValidationError("Décision invalide (validated / returned).")

    submission.review_comment = comment
    submission.reviewed_by = reviewer
    submission.reviewed_at = timezone.now()
    submission.save()
    assignment.save(update_fields=["progress_status"])

    task.recompute_status()
    record(action=AuditAction.VALIDATE, module="tasks", actor=reviewer, target=task,
           message=f"Livrable {decision} pour l'employé {target_user_id}",
           changes={"decision": {"after": decision}})
    notify(submission.submitted_by,
           title="Livrable validé" if decision == "validated" else "Livrable renvoyé pour correction",
           body=comment or f"Tâche « {task.title} »",
           url=f"/tasks/{task.id}", type="task", email=True)


@transaction.atomic
def set_task_status(task: Task, *, actor, status: str) -> Task:
    if status not in TaskStatus.values:
        raise ValidationError("Statut invalide.")
    task.status = status
    task.closed_at = timezone.now() if status == TaskStatus.DONE else None
    task.save(update_fields=["status", "closed_at"])
    record(action=AuditAction.UPDATE, module="tasks", actor=actor, target=task,
           message=f"Statut → {status}")
    return task


@transaction.atomic
def set_progress(task: Task, *, user, progress: str) -> TaskAssignment:
    assignment = TaskAssignment.objects.filter(task=task, user=user).first()
    if assignment is None:
        raise PermissionDenied("Tâche non assignée.")
    if progress not in (ProgressStatus.TODO, ProgressStatus.IN_PROGRESS):
        raise ValidationError("Avancement autorisé : todo ou in_progress.")
    assignment.progress_status = progress
    assignment.save(update_fields=["progress_status"])
    if progress == ProgressStatus.IN_PROGRESS and task.status == TaskStatus.TODO:
        task.status = TaskStatus.IN_PROGRESS
        task.save(update_fields=["status"])
    return assignment


@transaction.atomic
def duplicate_task(task: Task, *, actor) -> Task:
    clone = Task.objects.create(
        title=f"{task.title} (copie)",
        description=task.description,
        priority=task.priority,
        created_by=actor,
        assigned_department=task.assigned_department,
        assigned_team=task.assigned_team,
        start_at=task.start_at,
        due_at=task.due_at,
        estimated_hours=task.estimated_hours,
    )
    clone.labels.set(task.labels.all())
    for item in task.checklist.all():
        clone.checklist.create(label=item.label, order=item.order)
    record(action=AuditAction.CREATE, module="tasks", actor=actor, target=clone,
           message=f"Duplication de la tâche #{task.id}")
    return clone


def generate_task_from_template(template) -> Task | None:
    from .models import RecurringTaskTemplate

    if not isinstance(template, RecurringTaskTemplate) or not template.is_active:
        return None
    due_dt = timezone.make_aware(
        datetime.datetime.combine(template.next_due_date, template.due_time)
    )
    task = create_task(
        data={
            "title": template.title,
            "description": template.description,
            "priority": template.priority,
            "estimated_hours": template.estimated_hours,
            "due_at": due_dt,
            "assigned_department": template.assigned_department,
            "assigned_team": template.assigned_team,
            "source_template": template,
        },
        actor=template.created_by,
        assignee_users=list(template.default_assignees.all()),
        team=template.assigned_team,
        department=template.assigned_department,
    )
    template.advance_due_date()
    template.save(update_fields=["next_due_date"])
    record(action=AuditAction.CREATE, module="tasks", actor=template.created_by, target=task,
           message=f"Tâche générée depuis le modèle récurrent « {template.title} »")
    return task
