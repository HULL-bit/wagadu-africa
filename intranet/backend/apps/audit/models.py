from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class AuditAction(models.TextChoices):
    CREATE = "create", _("Création")
    UPDATE = "update", _("Modification")
    DELETE = "delete", _("Suppression")
    SEND = "send", _("Envoi")
    VALIDATE = "validate", _("Validation")
    PERMISSION_CHANGE = "permission_change", _("Changement de permission")
    LOGIN = "login", _("Connexion")
    LOGOUT = "logout", _("Déconnexion")
    LOGIN_FAILED = "login_failed", _("Échec de connexion")
    EXPORT = "export", _("Export")


class AuditSeverity(models.TextChoices):
    INFO = "info", _("Information")
    WARNING = "warning", _("Avertissement")
    CRITICAL = "critical", _("Critique")


class AuditLogEntryManager(models.Manager):
    def create(self, **kwargs):  # noqa: A003 - conserve la sémantique Django
        return super().create(**kwargs)


class AuditLogEntry(models.Model):
    """Entrée du journal d'audit — table **append-only** (section 7).

    Aucune mise à jour ni suppression n'est autorisée : ``save()`` refuse de
    modifier une entrée existante et ``delete()`` est neutralisé. La purge de
    rétention passe par une requête SQL dédiée dans une tâche Celery.
    """

    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_entries",
    )
    actor_label = models.CharField(
        max_length=255,
        blank=True,
        help_text=_("Identité figée de l'auteur (survit à la suppression du compte)."),
    )
    actor_is_admin = models.BooleanField(default=False)
    confidential = models.BooleanField(
        default=False,
        help_text=_("Entrée sensible : visible uniquement par le Super Administrateur."),
    )
    module = models.CharField(max_length=50, db_index=True)
    action = models.CharField(max_length=32, choices=AuditAction.choices, db_index=True)
    severity = models.CharField(
        max_length=16, choices=AuditSeverity.choices, default=AuditSeverity.INFO,
        db_index=True,
    )
    target_type = models.CharField(max_length=120, blank=True)
    target_id = models.CharField(max_length=64, blank=True)
    target_repr = models.CharField(max_length=255, blank=True)
    changes = models.JSONField(default=dict, blank=True)
    message = models.CharField(max_length=255, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)

    objects = AuditLogEntryManager()

    class Meta:
        ordering = ["-timestamp"]
        verbose_name = _("entrée du journal d'audit")
        verbose_name_plural = _("journal d'audit")
        indexes = [
            models.Index(fields=["module", "action"]),
            models.Index(fields=["actor", "timestamp"]),
        ]

    def __str__(self) -> str:
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {self.actor_label} {self.action} {self.target_repr}"

    def save(self, *args, **kwargs):
        if self.pk is not None:
            raise ValueError(
                "Le journal d'audit est en lecture seule : une entrée ne peut pas "
                "être modifiée."
            )
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError(
            "Le journal d'audit est en lecture seule : une entrée ne peut pas être "
            "supprimée (utiliser la purge de rétention planifiée)."
        )
