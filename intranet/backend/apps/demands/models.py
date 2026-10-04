from __future__ import annotations

from django.conf import settings
from django.db import models, transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


def request_attachment_path(instance, filename):
    return f"demands/{instance.request_id}/{filename}"


class RequestStatus(models.TextChoices):
    DRAFT = "draft", _("Brouillon")
    SUBMITTED = "submitted", _("Soumise")
    IN_REVIEW = "in_review", _("En validation")
    APPROVED = "approved", _("Approuvée")
    REJECTED = "rejected", _("Rejetée")
    CANCELLED = "cancelled", _("Annulée")


class RequestType(models.Model):
    """Type de demande avec formulaire configurable et circuit de validation."""

    code = models.SlugField(max_length=40, unique=True)
    label = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=8, blank=True)
    # form_schema : liste de {"key","label","type"(text|number|date|textarea|select),
    #               "required"(bool),"options"(list, pour select)}
    form_schema = models.JSONField(default=list, blank=True)
    flow = models.ForeignKey(
        "validation.ValidationFlow", on_delete=models.PROTECT, related_name="request_types"
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["label"]
        verbose_name = _("type de demande")

    def __str__(self) -> str:
        return self.label


class RequestNumbering(models.Model):
    year = models.PositiveIntegerField(unique=True)
    counter = models.PositiveIntegerField(default=0)

    def __str__(self) -> str:
        return f"{self.year}: {self.counter}"

    @classmethod
    @transaction.atomic
    def next_reference(cls) -> str:
        year = timezone.now().year
        row, _ = cls.objects.select_for_update().get_or_create(year=year)
        row.counter += 1
        row.save(update_fields=["counter"])
        return f"DEM-{year}-{row.counter:04d}"


class Request(models.Model):
    STANDARD_FLOW_CODE = "demande-standard"

    type = models.ForeignKey(RequestType, on_delete=models.PROTECT, related_name="requests")
    reference = models.CharField(max_length=24, unique=True, editable=False)
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="requests_made"
    )
    title = models.CharField(max_length=200)
    data = models.JSONField(default=dict, blank=True)
    status = models.CharField(
        max_length=16, choices=RequestStatus.choices, default=RequestStatus.DRAFT
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    decided_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = _("demande")

    def __str__(self) -> str:
        return f"{self.reference} — {self.title}"

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = RequestNumbering.next_reference()
        super().save(*args, **kwargs)

    # --- Hooks du moteur de validation ---
    def on_approval_approved(self, *, process, actor=None, comment=""):
        self.status = RequestStatus.APPROVED
        self.decided_at = timezone.now()
        self.save(update_fields=["status", "decided_at"])

    def on_approval_rejected(self, *, process, actor=None, comment=""):
        self.status = RequestStatus.REJECTED
        self.decided_at = timezone.now()
        self.save(update_fields=["status", "decided_at"])

    def on_approval_returned(self, *, process, actor=None, comment=""):
        self.status = RequestStatus.DRAFT
        self.save(update_fields=["status"])

    def on_approval_cancelled(self, *, process, actor=None, comment=""):
        self.status = RequestStatus.CANCELLED
        self.save(update_fields=["status"])


class RequestAttachment(models.Model):
    request = models.ForeignKey(Request, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to=request_attachment_path)
    label = models.CharField(max_length=150, blank=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.label or self.file.name


class RequestComment(models.Model):
    request = models.ForeignKey(Request, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"Commentaire de {self.author} sur {self.request_id}"
