from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


def task_attachment_path(instance, filename):
    return f"tasks/{instance.task_id}/reference/{filename}"


def submission_attachment_path(instance, filename):
    return f"tasks/{instance.submission.task_id}/submissions/{instance.submission_id}/{filename}"


class Priority(models.TextChoices):
    LOW = "low", _("Basse")
    NORMAL = "normal", _("Normale")
    HIGH = "high", _("Haute")
    URGENT = "urgent", _("Urgente")


class TaskStatus(models.TextChoices):
    TODO = "todo", _("À faire")
    IN_PROGRESS = "in_progress", _("En cours")
    IN_REVIEW = "in_review", _("En révision")
    DONE = "done", _("Terminé")


class ProgressStatus(models.TextChoices):
    TODO = "todo", _("À faire")
    IN_PROGRESS = "in_progress", _("En cours")
    SUBMITTED = "submitted", _("Soumis")
    VALIDATED = "validated", _("Validé")
    RETURNED = "returned", _("À corriger")


class SubmissionStatus(models.TextChoices):
    SUBMITTED = "submitted", _("Soumis")
    VALIDATED = "validated", _("Validé")
    RETURNED = "returned", _("Renvoyé pour correction")


class TaskLabel(models.Model):
    name = models.CharField(max_length=60, unique=True)
    color = models.CharField(max_length=7, default="#D2812E")

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Task(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.NORMAL)
    status = models.CharField(max_length=16, choices=TaskStatus.choices, default=TaskStatus.TODO)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="tasks_created",
    )
    assignees = models.ManyToManyField(
        settings.AUTH_USER_MODEL, through="TaskAssignment",
        through_fields=("task", "user"), related_name="tasks_assigned",
    )
    assigned_department = models.ForeignKey(
        "organization.Department", on_delete=models.SET_NULL, null=True, blank=True
    )
    assigned_team = models.ForeignKey(
        "organization.Team", on_delete=models.SET_NULL, null=True, blank=True
    )
    project = models.ForeignKey(
        "projects.Project", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="tasks",
    )
    labels = models.ManyToManyField(TaskLabel, blank=True, related_name="tasks")

    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE, null=True, blank=True, related_name="subtasks"
    )

    start_at = models.DateTimeField(null=True, blank=True)
    due_at = models.DateTimeField(null=True, blank=True)
    estimated_hours = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)

    source_template = models.ForeignKey(
        "RecurringTaskTemplate", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="generated_tasks",
    )

    reminder_before_sent_at = models.DateTimeField(null=True, blank=True)
    reminder_dueday_sent_at = models.DateTimeField(null=True, blank=True)
    last_overdue_reminder_on = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = _("tâche")
        indexes = [
            models.Index(fields=["status", "due_at"]),
            models.Index(fields=["created_by"]),
        ]

    def __str__(self) -> str:
        return self.title

    @property
    def is_overdue(self) -> bool:
        return bool(
            self.due_at
            and self.status != TaskStatus.DONE
            and self.due_at < timezone.now()
        )

    def recompute_status(self, *, save: bool = True) -> None:
        """Passe automatiquement à « Terminé » quand toutes les soumissions sont
        validées (clôture manuelle toujours possible par ailleurs)."""
        # .filter() contourne le cache de prefetch_related (état à jour requis).
        assignments = list(self.assignments.filter())
        if not assignments:
            return
        if all(a.progress_status == ProgressStatus.VALIDATED for a in assignments):
            self.status = TaskStatus.DONE
            self.closed_at = self.closed_at or timezone.now()
        elif any(a.progress_status == ProgressStatus.SUBMITTED for a in assignments):
            if self.status in (TaskStatus.TODO, TaskStatus.IN_PROGRESS):
                self.status = TaskStatus.IN_REVIEW
        if save:
            self.save(update_fields=["status", "closed_at"])


class TaskAssignment(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="assignments")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="task_assignments")
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    progress_status = models.CharField(
        max_length=16, choices=ProgressStatus.choices, default=ProgressStatus.TODO
    )
    declared_hours = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["task", "user"], name="uniq_task_assignee")
        ]

    def __str__(self) -> str:
        return f"{self.task_id} → {self.user}"


class TaskAttachment(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to=task_attachment_path)
    label = models.CharField(max_length=150, blank=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.label or self.file.name


class ChecklistItem(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="checklist")
    label = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)
    is_done = models.BooleanField(default=False)
    done_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    done_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self) -> str:
        return self.label


class TaskComment(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"Commentaire de {self.author} sur {self.task_id}"


class TaskSubmission(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="submissions")
    submitted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="task_submissions")
    report = models.TextField(blank=True)
    declared_hours = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    status = models.CharField(
        max_length=16, choices=SubmissionStatus.choices, default=SubmissionStatus.SUBMITTED
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    review_comment = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-submitted_at"]
        constraints = [
            models.UniqueConstraint(fields=["task", "submitted_by"], name="uniq_task_submission")
        ]

    def __str__(self) -> str:
        return f"Soumission {self.task_id} par {self.submitted_by}"


class TaskSubmissionAttachment(models.Model):
    submission = models.ForeignKey(
        TaskSubmission, on_delete=models.CASCADE, related_name="attachments"
    )
    file = models.FileField(upload_to=submission_attachment_path)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.file.name


class RecurringTaskTemplate(models.Model):
    class Frequency(models.TextChoices):
        WEEKLY = "weekly", _("Hebdomadaire")
        MONTHLY = "monthly", _("Mensuelle")

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.NORMAL)
    estimated_hours = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)

    frequency = models.CharField(max_length=10, choices=Frequency.choices)
    interval = models.PositiveIntegerField(default=1, help_text=_("Toutes les N périodes."))
    weekday = models.PositiveSmallIntegerField(
        null=True, blank=True, help_text=_("0=lundi … 6=dimanche (hebdomadaire).")
    )
    day_of_month = models.PositiveSmallIntegerField(null=True, blank=True)
    due_time = models.TimeField(default="17:00")
    lead_time_days = models.PositiveIntegerField(
        default=5, help_text=_("Créer la tâche N jours avant son échéance.")
    )

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    default_assignees = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name="recurring_task_templates")
    assigned_department = models.ForeignKey("organization.Department", on_delete=models.SET_NULL, null=True, blank=True)
    assigned_team = models.ForeignKey("organization.Team", on_delete=models.SET_NULL, null=True, blank=True)

    is_active = models.BooleanField(default=True)
    next_due_date = models.DateField(help_text=_("Prochaine échéance planifiée."))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["title"]
        verbose_name = _("modèle de tâche récurrente")

    def __str__(self) -> str:
        return f"{self.title} ({self.get_frequency_display()})"

    def advance_due_date(self) -> None:
        import calendar
        import datetime

        d = self.next_due_date
        if self.frequency == self.Frequency.WEEKLY:
            self.next_due_date = d + datetime.timedelta(weeks=self.interval)
        else:
            month = d.month - 1 + self.interval
            year = d.year + month // 12
            month = month % 12 + 1
            day = min(self.day_of_month or d.day, calendar.monthrange(year, month)[1])
            self.next_due_date = datetime.date(year, month, day)
