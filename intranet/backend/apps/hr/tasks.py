"""Alertes RH planifiées (Celery beat)."""
from __future__ import annotations

from celery import shared_task
from django.utils import timezone

from apps.notifications.services import notify
from apps.permissions.services import has_permission

from .models import Contract, HealthRecord


def _hr_recipients():
    from apps.accounts.models import User

    return [u for u in User.objects.filter(is_active=True) if has_permission(u, "hr.manage")]


@shared_task
def check_contract_expirations() -> dict:
    count = 0
    for contract in Contract.objects.filter(
        end_date__isnull=False, expiry_alert_sent_at__isnull=True
    ).select_related("employee__user"):
        if contract.days_to_expiry is not None and 0 <= contract.days_to_expiry <= contract.renewal_notice_days:
            for hr in _hr_recipients():
                notify(
                    hr,
                    title="Contrat arrivant à échéance",
                    body=f"{contract.employee.matricule} — fin le {contract.end_date} "
                         f"({contract.days_to_expiry} j).",
                    url=f"/hr/employees/{contract.employee_id}",
                    type="hr_alert", email=True,
                )
            contract.expiry_alert_sent_at = timezone.now()
            contract.save(update_fields=["expiry_alert_sent_at"])
            count += 1
    return {"alerts": count}


@shared_task
def check_health_record_renewals() -> dict:
    count = 0
    for record in HealthRecord.objects.filter(
        expiry_date__isnull=False, expiry_alert_sent_at__isnull=True
    ).select_related("employee__user"):
        if record.days_to_expiry is not None and 0 <= record.days_to_expiry <= record.renewal_notice_days:
            for hr in _hr_recipients():
                notify(
                    hr,
                    title="Visite médicale / habilitation à renouveler",
                    body=f"{record.employee.matricule} — « {record.label} » expire le {record.expiry_date}.",
                    url=f"/hr/employees/{record.employee_id}",
                    type="hr_alert", email=True,
                )
            record.expiry_alert_sent_at = timezone.now()
            record.save(update_fields=["expiry_alert_sent_at"])
            count += 1
    return {"alerts": count}
