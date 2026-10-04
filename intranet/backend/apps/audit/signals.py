"""Signaux génériques : journalisation automatique des modèles sensibles.

Les modèles listés dans ``services.AUTO_TRACKED_MODELS`` déclenchent une entrée
d'audit à chaque ``post_save`` / ``post_delete``. Les diffs de modification sont
calculés à partir d'un instantané pris au ``pre_save``.
"""
from __future__ import annotations

from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from .models import AuditAction, AuditSeverity
from .services import (
    AUTO_TRACKED_MODELS,
    diff,
    model_to_dict_safe,
    record,
)

_PRE_SAVE_SNAPSHOTS: dict[tuple[str, str], dict] = {}


def _label(sender) -> str:
    return f"{sender._meta.app_label}.{sender.__name__}"


def _is_tracked(sender) -> bool:
    return _label(sender) in AUTO_TRACKED_MODELS


def _severity_for(instance) -> str:
    """Marque comme critique toute action touchant un compte administrateur."""
    label = f"{instance._meta.app_label}.{instance._meta.model_name}"
    if label == "accounts.user":
        role = getattr(instance, "role", None)
        if getattr(instance, "is_super_admin", False) or (role and role.slug == "admin"):
            return AuditSeverity.CRITICAL
    if label == "permissions.userpermissionoverride":
        target = getattr(instance, "user", None)
        role = getattr(target, "role", None)
        if target and (getattr(target, "is_super_admin", False) or (role and role.slug == "admin")):
            return AuditSeverity.CRITICAL
    return AuditSeverity.INFO


@receiver(pre_save)
def _snapshot_pre_save(sender, instance, **kwargs):
    if not _is_tracked(sender) or instance.pk is None:
        return
    try:
        current = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return
    _PRE_SAVE_SNAPSHOTS[(_label(sender), str(instance.pk))] = model_to_dict_safe(current)


@receiver(post_save)
def _audit_post_save(sender, instance, created, **kwargs):
    if not _is_tracked(sender):
        return
    module = sender._meta.app_label
    key = (_label(sender), str(instance.pk))
    if created:
        record(
            action=AuditAction.CREATE,
            module=module,
            target=instance,
            changes={},
            severity=_severity_for(instance),
        )
        return
    before = _PRE_SAVE_SNAPSHOTS.pop(key, None)
    after = model_to_dict_safe(instance)
    changes = diff(before, after)
    if not changes:
        return
    action = (
        AuditAction.PERMISSION_CHANGE
        if module == "permissions"
        else AuditAction.UPDATE
    )
    record(
        action=action,
        module=module,
        target=instance,
        changes=changes,
        severity=_severity_for(instance),
    )


@receiver(post_delete)
def _audit_post_delete(sender, instance, **kwargs):
    if not _is_tracked(sender):
        return
    record(
        action=AuditAction.DELETE,
        module=sender._meta.app_label,
        target=instance,
        target_repr=str(instance),
        changes={"deleted": model_to_dict_safe(instance)},
        severity=_severity_for(instance),
    )
