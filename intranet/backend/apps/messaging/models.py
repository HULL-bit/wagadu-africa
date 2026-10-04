from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class Channel(models.Model):
    """Fil de discussion : canal général, canal de service ou message direct."""

    class Kind(models.TextChoices):
        GENERAL = "general", _("Général")
        DEPARTMENT = "department", _("Service")
        DIRECT = "direct", _("Message direct")

    kind = models.CharField(max_length=20, choices=Kind.choices)
    name = models.CharField(max_length=120, blank=True)
    department = models.ForeignKey(
        "organization.Department", on_delete=models.CASCADE, null=True, blank=True,
        related_name="channels",
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="channels", blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_message_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-last_message_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["kind"], condition=models.Q(kind="general"), name="unique_general_channel"
            ),
            models.UniqueConstraint(
                fields=["department"], condition=models.Q(kind="department"),
                name="unique_department_channel",
            ),
        ]

    def __str__(self) -> str:
        return self.name or f"{self.get_kind_display()} #{self.pk}"

    def display_name(self, *, viewer=None) -> str:
        if self.kind == self.Kind.DIRECT and viewer is not None:
            other = self.members.exclude(pk=viewer.pk).first()
            return other.get_full_name() or other.email if other else "Message direct"
        if self.kind == self.Kind.DEPARTMENT and self.department_id:
            return self.department.name
        return self.name or "Général"


class Message(models.Model):
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name="messages")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.author_id} @ {self.channel_id}: {self.body[:40]}"


class ChannelRead(models.Model):
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name="reads")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    last_read_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["channel", "user"], name="unique_channel_read")
        ]

    def __str__(self) -> str:
        return f"{self.user_id} lu {self.channel_id} @ {self.last_read_at:%Y-%m-%d %H:%M}"
