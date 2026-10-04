"""Provisionnement automatique Rocket.Chat (no-op si non configuré)."""
from __future__ import annotations

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.organization.models import Department, Team

from .rocketchat import is_configured
from .tasks import provision_chat_channel, provision_chat_user


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def _provision_chat_user(sender, instance, created, **kwargs):
    if is_configured() and instance.is_active:
        provision_chat_user.delay(str(instance.pk))


@receiver(post_save, sender=Team)
def _provision_team_channel(sender, instance, created, **kwargs):
    if created and is_configured():
        provision_chat_channel.delay(
            name=f"equipe-{instance.name}", kind="team", team_id=instance.pk
        )


@receiver(post_save, sender=Department)
def _provision_department_channel(sender, instance, created, **kwargs):
    if created and is_configured():
        provision_chat_channel.delay(
            name=f"dept-{instance.name}", kind="department", department_id=instance.pk
        )
