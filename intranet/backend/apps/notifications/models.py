from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class NotificationChannel(models.TextChoices):
    IN_APP = "in_app", _("Dans l'application")
    EMAIL = "email", _("E-mail")


class DigestFrequency(models.TextChoices):
    IMMEDIATE = "immediate", _("Immédiat")
    DAILY = "daily", _("Résumé quotidien")
    WEEKLY = "weekly", _("Résumé hebdomadaire")


class Notification(models.Model):
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    type = models.CharField(max_length=60, default="generic")
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    url = models.CharField(max_length=255, blank=True)
    channel = models.CharField(
        max_length=16, choices=NotificationChannel.choices,
        default=NotificationChannel.IN_APP,
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["recipient", "is_read"])]

    def __str__(self) -> str:
        return f"{self.title} → {self.recipient}"


class NotificationPreference(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notification_preference"
    )
    email_enabled = models.BooleanField(default=True)
    digest_frequency = models.CharField(
        max_length=16, choices=DigestFrequency.choices, default=DigestFrequency.IMMEDIATE
    )
    do_not_disturb = models.BooleanField(default=False)

    def __str__(self) -> str:
        return f"Préférences de {self.user}"
