from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class ChatAccount(models.Model):
    """Correspondance entre un compte Wagadu Hub et un compte Rocket.Chat."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_account"
    )
    rc_user_id = models.CharField(max_length=64)
    rc_username = models.CharField(max_length=100)
    provisioned_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("compte messagerie")

    def __str__(self) -> str:
        return f"{self.user} ↔ {self.rc_username}"


class ChatChannel(models.Model):
    class Kind(models.TextChoices):
        GENERAL = "general", _("Canal général")
        TEAM = "team", _("Équipe")
        DEPARTMENT = "department", _("Département")
        PROJECT = "project", _("Projet")

    rc_room_id = models.CharField(max_length=64, blank=True)
    name = models.CharField(max_length=120)
    kind = models.CharField(max_length=20, choices=Kind.choices)
    department = models.ForeignKey(
        "organization.Department", on_delete=models.CASCADE, null=True, blank=True
    )
    team = models.ForeignKey(
        "organization.Team", on_delete=models.CASCADE, null=True, blank=True
    )
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name = _("canal de messagerie")

    def __str__(self) -> str:
        return f"#{self.name}"
