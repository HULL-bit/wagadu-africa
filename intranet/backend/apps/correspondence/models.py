from __future__ import annotations

from django.conf import settings
from django.db import models, transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


def mail_attachment_path(instance, filename):
    return f"mail/{instance.mail_id}/{filename}"


class Direction(models.TextChoices):
    INCOMING = "incoming", _("Arrivée")
    OUTGOING = "outgoing", _("Départ")


class MailStatus(models.TextChoices):
    RECEIVED = "received", _("Reçu")
    ASSIGNED = "assigned", _("Affecté")
    IN_PROGRESS = "in_progress", _("En traitement")
    PROCESSED = "processed", _("Traité")
    ARCHIVED = "archived", _("Archivé")


class Confidentiality(models.TextChoices):
    NORMAL = "normal", _("Normal")
    RESTRICTED = "restricted", _("Restreint")
    CONFIDENTIAL = "confidential", _("Confidentiel")


class MailCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    keywords = models.CharField(
        max_length=255, blank=True,
        help_text=_("Mots-clés séparés par des virgules — classement automatique."),
    )

    class Meta:
        ordering = ["name"]
        verbose_name = _("catégorie de courrier")
        verbose_name_plural = _("catégories de courrier")

    def __str__(self) -> str:
        return self.name


class NumberingScheme(models.Model):
    """Compteur de numérotation, annuel, éventuellement décliné par département."""

    class Scope(models.TextChoices):
        GLOBAL = "global", _("Global")
        DEPARTMENT = "department", _("Par département")

    scope = models.CharField(max_length=20, choices=Scope.choices, default=Scope.GLOBAL)
    department = models.ForeignKey(
        "organization.Department", on_delete=models.CASCADE, null=True, blank=True
    )
    direction = models.CharField(max_length=10, choices=Direction.choices)
    year = models.PositiveIntegerField()
    counter = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["scope", "department", "direction", "year"],
                name="uniq_numbering_scheme",
            )
        ]

    def __str__(self) -> str:
        return f"{self.direction} {self.year} ({self.scope})"

    @classmethod
    @transaction.atomic
    def next_reference(cls, *, direction: str, department=None, when=None) -> str:
        when = when or timezone.now().date()
        use_dept = department is not None
        scheme, _created = cls.objects.select_for_update().get_or_create(
            scope=cls.Scope.DEPARTMENT if use_dept else cls.Scope.GLOBAL,
            department=department if use_dept else None,
            direction=direction,
            year=when.year,
        )
        scheme.counter += 1
        scheme.save(update_fields=["counter"])
        tag = "ARR" if direction == Direction.INCOMING else "DEP"
        mid = department.code.upper() if use_dept else tag
        return f"{when.year}-{mid}-{scheme.counter:04d}"


class Mail(models.Model):
    reference = models.CharField(max_length=40, unique=True, editable=False)
    direction = models.CharField(max_length=10, choices=Direction.choices)
    subject = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    correspondent = models.CharField(
        max_length=200, help_text=_("Expéditeur (arrivée) ou destinataire (départ) externe.")
    )
    mail_date = models.DateField(help_text=_("Date figurant sur le courrier."))
    registered_at = models.DateTimeField(auto_now_add=True)
    category = models.ForeignKey(
        MailCategory, on_delete=models.SET_NULL, null=True, blank=True
    )
    confidentiality = models.CharField(
        max_length=20, choices=Confidentiality.choices, default=Confidentiality.NORMAL
    )
    status = models.CharField(
        max_length=20, choices=MailStatus.choices, default=MailStatus.RECEIVED
    )
    registered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="registered_mails",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="assigned_mails",
    )
    assigned_department = models.ForeignKey(
        "organization.Department", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="assigned_mails",
    )
    due_date = models.DateField(
        null=True, blank=True, help_text=_("Échéance de traitement (rappel automatique).")
    )
    reminder_sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-registered_at"]
        verbose_name = _("courrier")
        indexes = [
            models.Index(fields=["direction", "status"]),
            models.Index(fields=["reference"]),
        ]

    def __str__(self) -> str:
        return f"{self.reference} — {self.subject}"

    def auto_categorize(self) -> None:
        if self.category_id:
            return
        haystack = f"{self.subject} {self.body}".lower()
        for category in MailCategory.objects.exclude(keywords=""):
            for kw in (k.strip().lower() for k in category.keywords.split(",")):
                if kw and kw in haystack:
                    self.category = category
                    return


class MailAttachment(models.Model):
    mail = models.ForeignKey(Mail, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to=mail_attachment_path)
    label = models.CharField(max_length=150, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.label or self.file.name


class MailEvent(models.Model):
    class Type(models.TextChoices):
        REGISTERED = "registered", _("Enregistré")
        VIEWED = "viewed", _("Consulté")
        ASSIGNED = "assigned", _("Affecté")
        TRANSFERRED = "transferred", _("Transféré")
        STATUS_CHANGE = "status_change", _("Changement de statut")
        ACKNOWLEDGED = "acknowledged", _("Accusé de réception")
        COMMENTED = "commented", _("Commentaire")

    mail = models.ForeignKey(Mail, on_delete=models.CASCADE, related_name="events")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    type = models.CharField(max_length=20, choices=Type.choices)
    detail = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.get_type_display()} — {self.mail.reference}"


class MailAcknowledgement(models.Model):
    mail = models.ForeignKey(Mail, on_delete=models.CASCADE, related_name="acknowledgements")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    acknowledged_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["mail", "user"], name="uniq_mail_ack")
        ]

    def __str__(self) -> str:
        return f"AR {self.mail.reference} — {self.user}"


class MailTemplate(models.Model):
    name = models.CharField(max_length=150, unique=True)
    category = models.ForeignKey(MailCategory, on_delete=models.SET_NULL, null=True, blank=True)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name = _("modèle de courrier")

    def __str__(self) -> str:
        return self.name
