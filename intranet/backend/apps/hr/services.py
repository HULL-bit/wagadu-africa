from __future__ import annotations

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.audit.models import AuditAction, AuditSeverity
from apps.audit.services import record
from apps.notifications.services import notify
from apps.validation.engine import start_approval

from .models import LeaveBalance, LeaveRequest, LeaveStatus


def compute_working_days(leave: LeaveRequest) -> float:
    return LeaveRequest.business_days(
        leave.start_date, leave.end_date, leave.half_day_start, leave.half_day_end
    )


def get_or_create_balance(employee, leave_type, year: int | None = None) -> LeaveBalance:
    year = year or timezone.now().year
    balance, created = LeaveBalance.objects.get_or_create(
        employee=employee,
        leave_type=leave_type,
        year=year,
        defaults={"entitled_days": leave_type.annual_quota_days},
    )
    return balance


@transaction.atomic
def submit_leave_request(leave: LeaveRequest, *, actor) -> LeaveRequest:
    if leave.status not in (LeaveStatus.DRAFT, LeaveStatus.REJECTED):
        raise serializers.ValidationError("Cette demande ne peut plus être soumise.")
    if leave.end_date < leave.start_date:
        raise serializers.ValidationError("La date de fin précède la date de début.")

    leave.working_days = compute_working_days(leave)
    if leave.working_days <= 0:
        raise serializers.ValidationError(
            "La période sélectionnée ne contient aucun jour ouvré."
        )

    if leave.leave_type.requires_certificate and not leave.attachment:
        raise serializers.ValidationError(
            "Ce type de congé exige un justificatif (certificat)."
        )

    balance = get_or_create_balance(leave.employee, leave.leave_type, leave.start_date.year)
    if leave.leave_type.annual_quota_days and leave.working_days > balance.remaining_days:
        raise serializers.ValidationError(
            f"Solde insuffisant : {balance.remaining_days} jour(s) restant(s), "
            f"{leave.working_days} demandé(s)."
        )

    leave.status = LeaveStatus.IN_REVIEW
    leave.submitted_at = timezone.now()
    leave.save(update_fields=["working_days", "status", "submitted_at"])

    start_approval(
        leave,
        flow_code=LeaveRequest.LEAVE_FLOW_CODE,
        subject_user=leave.employee.user,
        actor=actor,
    )
    record(
        action=AuditAction.CREATE, module="hr", actor=actor, target=leave,
        message=f"Soumission d'une demande de congé ({leave.working_days} j)",
    )
    return leave


@transaction.atomic
def apply_approved_leave(leave: LeaveRequest) -> None:
    balance = get_or_create_balance(leave.employee, leave.leave_type, leave.start_date.year)
    balance.taken_days = balance.taken_days + leave.working_days
    balance.save(update_fields=["taken_days"])

    leave.status = LeaveStatus.APPROVED
    leave.decided_at = timezone.now()
    leave.save(update_fields=["status", "decided_at"])

    record(
        action=AuditAction.VALIDATE, module="hr", target=leave,
        message=f"Congé approuvé — {leave.working_days} j décomptés du solde",
        severity=AuditSeverity.INFO,
    )
    notify(
        leave.employee.user,
        title="Congé approuvé",
        body=f"Votre congé du {leave.start_date} au {leave.end_date} est validé.",
        type="leave", email=True,
    )


@transaction.atomic
def cancel_leave_request(leave: LeaveRequest, *, actor) -> LeaveRequest:
    if leave.status == LeaveStatus.APPROVED:
        balance = get_or_create_balance(
            leave.employee, leave.leave_type, leave.start_date.year
        )
        balance.taken_days = max(balance.taken_days - leave.working_days, 0)
        balance.save(update_fields=["taken_days"])

    from apps.validation.engine import cancel_process, get_process

    process = get_process(leave)
    if process and process.status == "pending":
        cancel_process(process, user=actor)

    leave.status = LeaveStatus.CANCELLED
    leave.save(update_fields=["status"])
    record(action=AuditAction.UPDATE, module="hr", actor=actor, target=leave,
           message="Annulation de la demande de congé")
    return leave
