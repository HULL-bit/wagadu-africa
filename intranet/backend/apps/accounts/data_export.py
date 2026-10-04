"""Export à la demande des données personnelles d'un utilisateur (§2.11, RGPD)."""
from __future__ import annotations

from django.utils import timezone


def _serialize(obj, fields):
    return {f: _json(getattr(obj, f, None)) for f in fields}


def _json(v):
    if hasattr(v, "isoformat"):
        return v.isoformat()
    if isinstance(v, (str, int, float, bool, type(None), list, dict)):
        return v
    return str(v)


def build_personal_export(user) -> dict:
    from apps.agenda.models import CalendarEvent
    from apps.demands.models import Request
    from apps.documents.models import DocumentRecipient
    from apps.hr.models import Employee, LeaveRequest
    from apps.meetings.models import MeetingParticipant
    from apps.tasks.models import TaskAssignment

    data: dict = {
        "generated_at": _json(timezone.now()),
        "account": {
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": user.phone,
            "role": user.role_slug,
            "status": user.status,
            "preferred_language": user.preferred_language,
            "timezone": user.timezone,
            "emergency_contact": user.emergency_contact,
            "bank_account": user.bank_account,
            "created_at": _json(user.created_at),
            "is_2fa_enabled": user.is_2fa_enabled,
        },
    }

    employee = Employee.objects.filter(user=user).first()
    if employee:
        data["employee"] = _serialize(employee, [
            "matricule", "job_title", "hire_date", "employment_type", "hr_status",
            "probation_end", "birth_date", "national_id", "social_security_number",
        ])
        data["leave_requests"] = [
            _serialize(lr, ["leave_type_id", "start_date", "end_date", "working_days", "status", "reason"])
            for lr in LeaveRequest.objects.filter(employee=employee)
        ]

    data["tasks_assigned"] = [
        {"task": a.task.title, "progress_status": a.progress_status,
         "declared_hours": _json(a.declared_hours), "due_at": _json(a.task.due_at)}
        for a in TaskAssignment.objects.filter(user=user).select_related("task")
    ]
    data["meetings"] = [
        {"title": p.meeting.title, "start": _json(p.meeting.start), "response": p.response}
        for p in MeetingParticipant.objects.filter(user=user).select_related("meeting")
    ]
    data["calendar_events"] = [
        _serialize(e, ["title", "start", "end", "type", "visibility", "location"])
        for e in CalendarEvent.objects.filter(owner=user)
    ]
    data["documents_received"] = [
        {"document": r.document.title, "sent_at": _json(r.distribution.sent_at),
         "is_read": r.is_read, "read_at": _json(r.read_at)}
        for r in DocumentRecipient.objects.filter(user=user).select_related("document", "distribution")
    ]
    data["requests"] = [
        {"reference": r.reference, "type": r.type.label, "title": r.title,
         "status": r.status, "data": r.data, "created_at": _json(r.created_at)}
        for r in Request.objects.filter(requester=user).select_related("type")
    ]
    data["notifications"] = _notifications(user)
    data["audit_entries_about_me"] = _audit(user)
    return data


def _notifications(user):
    from apps.notifications.models import Notification

    return [
        {"title": n.title, "type": n.type, "created_at": _json(n.created_at), "is_read": n.is_read}
        for n in Notification.objects.filter(recipient=user)[:1000]
    ]


def _audit(user):
    from apps.audit.models import AuditLogEntry

    return [
        {"timestamp": _json(e.timestamp), "action": e.action, "module": e.module,
         "message": e.message}
        for e in AuditLogEntry.objects.filter(target_type="accounts.user", target_id=str(user.id))[:1000]
    ]
