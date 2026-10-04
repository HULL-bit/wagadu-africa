from __future__ import annotations

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.audit.models import AuditAction
from apps.audit.services import record
from apps.validation.engine import cancel_process, get_process, start_approval

from .models import Request, RequestStatus


def validate_against_schema(request_type, data: dict) -> None:
    errors = {}
    for field in request_type.form_schema or []:
        key = field.get("key")
        if field.get("required") and not str(data.get(key, "")).strip():
            errors[key] = "Champ obligatoire."
        if field.get("type") == "number" and data.get(key) not in (None, ""):
            try:
                float(data[key])
            except (TypeError, ValueError):
                errors[key] = "Valeur numérique attendue."
    if errors:
        raise ValidationError({"data": errors})


@transaction.atomic
def submit_request(req: Request, *, actor) -> Request:
    if req.status not in (RequestStatus.DRAFT, RequestStatus.REJECTED):
        raise ValidationError("Cette demande ne peut plus être soumise.")
    validate_against_schema(req.type, req.data)

    req.status = RequestStatus.IN_REVIEW
    req.submitted_at = timezone.now()
    req.save(update_fields=["status", "submitted_at"])

    start_approval(
        req, flow_code=req.type.flow.code, subject_user=req.requester, actor=actor,
    )
    record(action=AuditAction.CREATE, module="demands", actor=actor, target=req,
           message=f"Soumission de la demande {req.reference}")
    return req


@transaction.atomic
def cancel_request(req: Request, *, actor) -> Request:
    process = get_process(req)
    if process and process.status == "pending":
        cancel_process(process, user=actor)
    req.status = RequestStatus.CANCELLED
    req.save(update_fields=["status"])
    record(action=AuditAction.UPDATE, module="demands", actor=actor, target=req,
           message=f"Annulation de la demande {req.reference}")
    return req
