"""Rétention du journal d'audit : archivage puis purge (12 mois glissants)."""
from __future__ import annotations

import csv
import io

from celery import shared_task
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.utils import timezone

from .models import AuditLogEntry

_EXPORT_FIELDS = [
    "id", "timestamp", "actor_label", "actor_is_admin", "module", "action",
    "severity", "target_type", "target_id", "target_repr", "message",
    "ip_address", "user_agent", "changes",
]


@shared_task
def purge_audit_log() -> dict:
    retention_days = settings.WAGADU["AUDIT_RETENTION_DAYS"]
    cutoff = timezone.now() - timezone.timedelta(days=retention_days)
    stale = AuditLogEntry.objects.filter(timestamp__lt=cutoff).order_by("timestamp")
    count = stale.count()
    if not count:
        return {"archived": 0, "purged": 0}

    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=_EXPORT_FIELDS, extrasaction="ignore")
    writer.writeheader()
    for entry in stale.iterator():
        writer.writerow({f: getattr(entry, f) for f in _EXPORT_FIELDS})

    archive_name = f"audit-archives/audit-{cutoff:%Y%m%d-%H%M%S}.csv"
    default_storage.save(archive_name, ContentFile(buffer.getvalue().encode("utf-8")))

    # Purge SQL brute : contourne volontairement AuditLogEntry.delete().
    AuditLogEntry.objects.filter(timestamp__lt=cutoff)._raw_delete(
        AuditLogEntry.objects.db
    )
    return {"archived": count, "purged": count, "archive": archive_name}
