from __future__ import annotations

import secrets

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


def document_version_path(instance, filename):
    return f"documents/{instance.document_id}/v{instance.version_number}/{filename}"


class Folder(models.Model):
    name = models.CharField(max_length=150)
    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE, null=True, blank=True, related_name="children"
    )
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name = _("dossier")

    def __str__(self) -> str:
        return self.name


class Visibility(models.TextChoices):
    PUBLIC = "public", _("Visible par tous")
    RESTRICTED = "restricted", _("Restreint")


class DocumentQuerySet(models.QuerySet):
    def live(self):
        return self.filter(deleted_at__isnull=True)

    def trashed(self):
        return self.filter(deleted_at__isnull=False)

    def visible_to(self, user):
        if getattr(user, "is_super_admin", False):
            return self
        from apps.permissions.services import has_permission

        qs = self.filter(
            models.Q(owner=user)
            | models.Q(is_in_library=True, visibility=Visibility.PUBLIC)
            | models.Q(recipients_index__user=user)  # documents reçus
        )
        # règles de restriction applicables
        restricted = self.filter(is_in_library=True, visibility=Visibility.RESTRICTED)
        allowed_ids = [
            d.id for d in restricted.prefetch_related("visibility_rules")
            if _rule_allows(d, user)
        ]
        qs = qs | self.filter(id__in=allowed_ids)
        if has_permission(user, "documents.manage_library"):
            qs = qs | self.filter(is_in_library=True)
        return qs.distinct()


def _rule_allows(document, user) -> bool:
    for rule in document.visibility_rules.all():
        if rule.subject_type == "role" and user.role_id and str(user.role_id) == rule.subject_id:
            return True
        if rule.subject_type == "department" and user.department_id and str(user.department_id) == rule.subject_id:
            return True
    return False


class Document(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    keywords = models.CharField(max_length=255, blank=True)
    folder = models.ForeignKey(Folder, on_delete=models.SET_NULL, null=True, blank=True, related_name="documents")
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="documents_owned")

    is_in_library = models.BooleanField(default=False)
    visibility = models.CharField(max_length=16, choices=Visibility.choices, default=Visibility.PUBLIC)

    current_version = models.ForeignKey(
        "DocumentVersion", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = DocumentQuerySet.as_manager()

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = _("document")

    def __str__(self) -> str:
        return self.title

    @property
    def is_trashed(self) -> bool:
        return self.deleted_at is not None

    def soft_delete(self, by):
        self.deleted_at = timezone.now()
        self.deleted_by = by
        self.save(update_fields=["deleted_at", "deleted_by"])

    def restore(self):
        self.deleted_at = None
        self.deleted_by = None
        self.save(update_fields=["deleted_at", "deleted_by"])


class DocumentVersion(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="versions")
    version_number = models.PositiveIntegerField()
    file = models.FileField(upload_to=document_version_path)
    original_filename = models.CharField(max_length=255, blank=True)
    size = models.PositiveBigIntegerField(default=0)
    content_type = models.CharField(max_length=120, blank=True)
    note = models.CharField(max_length=255, blank=True)
    text_content = models.TextField(blank=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-version_number"]
        constraints = [
            models.UniqueConstraint(fields=["document", "version_number"], name="uniq_document_version")
        ]

    def __str__(self) -> str:
        return f"{self.document.title} v{self.version_number}"


class DocumentVisibilityRule(models.Model):
    class Subject(models.TextChoices):
        ROLE = "role", _("Rôle")
        DEPARTMENT = "department", _("Département")
        PROJECT = "project", _("Projet")

    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="visibility_rules")
    subject_type = models.CharField(max_length=20, choices=Subject.choices)
    subject_id = models.CharField(max_length=64)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["document", "subject_type", "subject_id"], name="uniq_visibility_rule"
            )
        ]

    def __str__(self) -> str:
        return f"{self.document_id}: {self.subject_type}={self.subject_id}"


class DistributionMode(models.TextChoices):
    USER = "user", _("Destinataire unique")
    SELECTION = "selection", _("Sélection de destinataires")
    BROADCAST = "broadcast", _("Diffusion générale")


class DocumentDistribution(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="distributions")
    version = models.ForeignKey(DocumentVersion, on_delete=models.SET_NULL, null=True)
    sent_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="document_distributions")
    mode = models.CharField(max_length=16, choices=DistributionMode.choices)
    message = models.TextField(blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-sent_at"]
        verbose_name = _("diffusion de document")

    def __str__(self) -> str:
        return f"{self.document.title} → {self.get_mode_display()} ({self.sent_at:%Y-%m-%d})"

    @property
    def read_count(self) -> int:
        return self.recipients.filter(is_read=True).count()

    @property
    def total_count(self) -> int:
        return self.recipients.count()


class DocumentRecipient(models.Model):
    distribution = models.ForeignKey(DocumentDistribution, on_delete=models.CASCADE, related_name="recipients")
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="recipients_index")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="documents_received")
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    reminded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["distribution", "user"], name="uniq_distribution_recipient")
        ]

    def __str__(self) -> str:
        return f"{self.document_id} → {self.user}"

    def mark_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=["is_read", "read_at"])


class DocumentSignature(models.Model):
    """Signature simple de validation interne (§1.5 / §2.11) — pas de valeur
    légale certifiée, une trace horodatée d'approbation."""

    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="signatures")
    version = models.ForeignKey(DocumentVersion, on_delete=models.CASCADE)
    signer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    statement = models.CharField(max_length=255, blank=True)
    signed_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ["-signed_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["version", "signer"], name="uniq_document_signature"
            )
        ]

    def __str__(self) -> str:
        return f"{self.signer} — {self.document_id} v{self.version.version_number}"


class ShareLink(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="share_links")
    version = models.ForeignKey(DocumentVersion, on_delete=models.CASCADE)
    token = models.CharField(max_length=64, unique=True, editable=False)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    password_hash = models.CharField(max_length=255, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    max_downloads = models.PositiveIntegerField(null=True, blank=True)
    download_count = models.PositiveIntegerField(default=0)
    is_revoked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = _("lien de partage")

    def __str__(self) -> str:
        return f"{self.document.title} — {self.token[:8]}…"

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(24)
        super().save(*args, **kwargs)

    def set_password(self, raw: str | None):
        self.password_hash = make_password(raw) if raw else ""

    def check_password(self, raw: str | None) -> bool:
        if not self.password_hash:
            return True
        return check_password(raw or "", self.password_hash)

    @property
    def is_active(self) -> bool:
        if self.is_revoked:
            return False
        if self.expires_at and self.expires_at < timezone.now():
            return False
        if self.max_downloads is not None and self.download_count >= self.max_downloads:
            return False
        return True
