"""Auto-rattachement aux canaux : général pour tous, service pour les membres."""

from __future__ import annotations

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.accounts.models import User
from apps.organization.models import Department

from .models import Channel


def ensure_general() -> Channel:
    channel, _ = Channel.objects.get_or_create(
        kind=Channel.Kind.GENERAL, defaults={"name": "Général"}
    )
    return channel


def ensure_department_channel(dept: Department) -> Channel:
    channel, _ = Channel.objects.get_or_create(
        kind=Channel.Kind.DEPARTMENT, department=dept, defaults={"name": dept.name}
    )
    return channel


@receiver(post_save, sender=User)
def _attach_user(sender, instance, created, **kwargs):
    if not instance.is_active:
        return
    ensure_general().members.add(instance)
    if instance.department_id:
        ensure_department_channel(instance.department).members.add(instance)


@receiver(post_save, sender=Department)
def _create_department_channel(sender, instance, created, **kwargs):
    if created:
        ensure_department_channel(instance)
