"""Génération des tâches récurrentes + rappels d'échéance (Celery beat)."""
from __future__ import annotations

from celery import shared_task
from django.utils import timezone

from apps.notifications.services import notify

from .models import ProgressStatus, RecurringTaskTemplate, Task, TaskStatus
from .services import generate_task_from_template


@shared_task
def generate_recurring_tasks() -> dict:
    today = timezone.now().date()
    generated = 0
    for template in RecurringTaskTemplate.objects.filter(is_active=True):
        trigger_on = template.next_due_date - timezone.timedelta(days=template.lead_time_days)
        if trigger_on <= today:
            if generate_task_from_template(template):
                generated += 1
    return {"generated": generated}


@shared_task
def send_task_deadline_reminders() -> dict:
    now = timezone.now()
    today = now.date()
    sent = 0

    open_tasks = Task.objects.filter(due_at__isnull=False).exclude(
        status=TaskStatus.DONE
    ).prefetch_related("assignments__user")

    for task in open_tasks:
        due_date = timezone.localtime(task.due_at).date()
        pending = [
            a for a in task.assignments.all()
            if a.progress_status in (ProgressStatus.TODO, ProgressStatus.IN_PROGRESS, ProgressStatus.RETURNED)
        ]
        if not pending:
            continue

        reason = None
        if due_date == today + timezone.timedelta(days=1) and not task.reminder_before_sent_at:
            reason, field = "Échéance demain", "reminder_before_sent_at"
        elif due_date == today and not task.reminder_dueday_sent_at:
            reason, field = "Échéance aujourd'hui", "reminder_dueday_sent_at"
        elif due_date < today and task.last_overdue_reminder_on != today:
            reason, field = "Tâche en retard", "last_overdue_reminder_on"
        else:
            continue

        for a in pending:
            notify(a.user, title=f"{reason} : « {task.title} »",
                   body=f"Échéance {timezone.localtime(task.due_at):%d/%m/%Y %H:%M}.",
                   url=f"/tasks/{task.id}", type="task_reminder", email=True)
            sent += 1

        setattr(task, field, today if field == "last_overdue_reminder_on" else now)
        task.save(update_fields=[field])

    return {"reminders": sent}
