from __future__ import annotations

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.utils.translation import gettext_lazy as _


class ApproverType(models.TextChoices):
    MANAGER = "manager", _("Responsable hiérarchique du demandeur")
    ROLE = "role", _("Titulaire d'un rôle")
    USER = "user", _("Personne désignée")


class ProcessStatus(models.TextChoices):
    PENDING = "pending", _("En validation")
    APPROVED = "approved", _("Approuvé")
    REJECTED = "rejected", _("Rejeté")
    CANCELLED = "cancelled", _("Annulé")


class Decision(models.TextChoices):
    APPROVED = "approved", _("Approuvé")
    REJECTED = "rejected", _("Rejeté")
    RETURNED = "returned", _("Renvoyé pour correction")


class ValidationFlow(models.Model):
    """Circuit de validation configurable, réutilisable par plusieurs modules
    (congés en phase 2, demandes transverses en phase 6)."""

    code = models.SlugField(max_length=60, unique=True)
    label = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["label"]
        verbose_name = _("circuit de validation")

    def __str__(self) -> str:
        return self.label

    @property
    def ordered_steps(self):
        return list(self.steps.order_by("order"))


class ValidationStep(models.Model):
    flow = models.ForeignKey(ValidationFlow, on_delete=models.CASCADE, related_name="steps")
    order = models.PositiveIntegerField(default=1)
    label = models.CharField(max_length=150)
    approver_type = models.CharField(max_length=20, choices=ApproverType.choices)
    approver_role = models.ForeignKey(
        "permissions.Role", on_delete=models.CASCADE, null=True, blank=True
    )
    approver_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True
    )
    # Si l'approbateur ne peut être résolu (ex. manager absent), l'étape est ignorée.
    skip_if_unresolved = models.BooleanField(default=True)

    class Meta:
        ordering = ["flow", "order"]
        constraints = [
            models.UniqueConstraint(fields=["flow", "order"], name="uniq_flow_step_order")
        ]

    def __str__(self) -> str:
        return f"{self.flow.code} · {self.order}. {self.label}"

    def resolve_approver(self, subject_user):
        """Retourne l'utilisateur habilité à valider cette étape pour `subject_user`."""
        if self.approver_type == ApproverType.USER:
            return self.approver_user
        if self.approver_type == ApproverType.MANAGER:
            return getattr(subject_user, "manager", None)
        if self.approver_type == ApproverType.ROLE and self.approver_role_id:
            from apps.accounts.models import User

            return (
                User.objects.filter(role=self.approver_role, is_active=True)
                .order_by("created_at")
                .first()
            )
        return None


class ApprovalProcess(models.Model):
    flow = models.ForeignKey(ValidationFlow, on_delete=models.PROTECT, related_name="processes")
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.CharField(max_length=64)
    target = GenericForeignKey("content_type", "object_id")

    subject_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="approval_processes",
        help_text=_("Personne concernée (sert à résoudre le « manager », etc.)."),
    )
    status = models.CharField(
        max_length=16, choices=ProcessStatus.choices, default=ProcessStatus.PENDING
    )
    current_step = models.ForeignKey(
        ValidationStep, on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["content_type", "object_id"])]
        verbose_name = _("processus de validation")

    def __str__(self) -> str:
        return f"{self.flow.code} · {self.get_status_display()}"


class ApprovalDecision(models.Model):
    process = models.ForeignKey(
        ApprovalProcess, on_delete=models.CASCADE, related_name="decisions"
    )
    step = models.ForeignKey(ValidationStep, on_delete=models.SET_NULL, null=True)
    approver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    decision = models.CharField(max_length=16, choices=Decision.choices)
    comment = models.TextField(blank=True)
    decided_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["decided_at"]

    def __str__(self) -> str:
        return f"{self.get_decision_display()} — {self.approver}"
