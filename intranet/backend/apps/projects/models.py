from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class ProjectStatus(models.TextChoices):
    PROSPECT = "prospect", _("Identifié (piste)")
    APPLYING = "applying", _("Candidature déposée")
    ACTIVE = "active", _("En cours")
    ON_HOLD = "on_hold", _("Suspendu")
    COMPLETED = "completed", _("Terminé")
    REJECTED = "rejected", _("Candidature refusée")
    CANCELLED = "cancelled", _("Abandonné")


OPEN_STATUSES = {ProjectStatus.PROSPECT, ProjectStatus.APPLYING, ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD}


class Project(models.Model):
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=200)
    summary = models.CharField(max_length=300, blank=True)
    description = models.TextField(blank=True)

    status = models.CharField(max_length=20, choices=ProjectStatus.choices, default=ProjectStatus.PROSPECT)
    lead = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="projects_led",
    )
    department = models.ForeignKey(
        "organization.Department", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="projects",
    )
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="projects", blank=True)

    donor = models.CharField(max_length=200, blank=True, help_text=_("Bailleur / source de financement"))
    budget = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default="XOF")
    location = models.CharField(max_length=200, blank=True, help_text=_("Zone d'intervention"))

    application_deadline = models.DateField(null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"{self.code} — {self.name}"

    @property
    def is_open(self) -> bool:
        return self.status in OPEN_STATUSES

    @property
    def progress(self) -> int:
        total = self.milestones.count()
        if not total:
            return 100 if self.status == ProjectStatus.COMPLETED else 0
        done = self.milestones.filter(status=Milestone.Status.DONE).count()
        return round(done * 100 / total)


class Milestone(models.Model):
    class Status(models.TextChoices):
        TODO = "todo", _("À faire")
        IN_PROGRESS = "in_progress", _("En cours")
        DONE = "done", _("Atteint")

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="milestones")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TODO)
    order = models.PositiveIntegerField(default=0)
    completed_at = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["order", "due_date", "id"]

    def __str__(self) -> str:
        return self.title


class Indicator(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="indicators")
    name = models.CharField(max_length=200)
    unit = models.CharField(max_length=40, blank=True)
    baseline_value = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    target_value = models.DecimalField(max_digits=14, decimal_places=2)
    current_value = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name

    @property
    def attainment(self) -> int:
        if not self.target_value:
            return 0
        return round(float(self.current_value) * 100 / float(self.target_value))


class ProgressUpdate(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="updates")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    date = models.DateField()
    body = models.TextField()
    spent_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self) -> str:
        return f"{self.project_id} — {self.date}"


class ProjectDocument(models.Model):
    """Lien entre un projet et un document de l'espace documentaire."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="project_documents")
    document = models.OneToOneField("documents.Document", on_delete=models.CASCADE, related_name="+")
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-added_at"]

    def __str__(self) -> str:
        return f"{self.project_id} · {self.document_id}"
