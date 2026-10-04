from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class IncidentSeverity(models.TextChoices):
    LOW = "low", _("Mineur")
    MEDIUM = "medium", _("Modéré")
    HIGH = "high", _("Majeur")
    CRITICAL = "critical", _("Critique")


class IncidentStatus(models.TextChoices):
    OPEN = "open", _("Ouvert")
    INVESTIGATING = "investigating", _("En cours d'investigation")
    RESOLVED = "resolved", _("Résolu")
    CLOSED = "closed", _("Clôturé")


class Incident(models.Model):
    """Incident technique — panne, bug bloquant, dégradation de service.

    Distinct du journal d'audit (``apps.audit``) : l'audit trace des actions
    ponctuelles déjà survenues, un incident suit un problème en cours jusqu'à
    sa résolution (statut, responsable, notes de résolution).
    """

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    component = models.CharField(
        max_length=100,
        blank=True,
        help_text=_("Service concerné (ex. Postgres, Directus, API, messagerie)."),
    )
    severity = models.CharField(
        max_length=10, choices=IncidentSeverity.choices, default=IncidentSeverity.MEDIUM
    )
    status = models.CharField(
        max_length=20, choices=IncidentStatus.choices, default=IncidentStatus.OPEN
    )
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="incidents_reported",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="incidents_assigned",
    )
    resolution_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = _("incident technique")
        verbose_name_plural = _("incidents techniques")
        indexes = [models.Index(fields=["status", "severity"])]

    def __str__(self) -> str:
        return f"[{self.get_severity_display()}] {self.title}"
