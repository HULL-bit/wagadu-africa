from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.audit.models import AuditAction
from apps.audit.services import record
from apps.notifications.services import notify

from .models import Mail, MailEvent, NumberingScheme


@transaction.atomic
def register_mail(*, data: dict, actor, department=None) -> Mail:
    mail = Mail(**data)
    mail.reference = NumberingScheme.next_reference(
        direction=mail.direction, department=department, when=mail.mail_date
    )
    mail.registered_by = actor
    mail.auto_categorize()
    mail.save()
    MailEvent.objects.create(
        mail=mail, actor=actor, type=MailEvent.Type.REGISTERED,
        detail=f"Enregistré ({mail.get_direction_display()})",
    )
    record(action=AuditAction.CREATE, module="mail", actor=actor, target=mail,
           message=f"Enregistrement du courrier {mail.reference}")
    return mail


@transaction.atomic
def assign_mail(mail: Mail, *, actor, user=None, department=None, transfer=False) -> Mail:
    from .models import MailStatus

    mail.assigned_to = user
    mail.assigned_department = department
    if mail.status == MailStatus.RECEIVED:
        mail.status = MailStatus.ASSIGNED
    mail.save(update_fields=["assigned_to", "assigned_department", "status"])

    MailEvent.objects.create(
        mail=mail, actor=actor,
        type=MailEvent.Type.TRANSFERRED if transfer else MailEvent.Type.ASSIGNED,
        detail=_assignment_label(user, department),
    )
    record(action=AuditAction.SEND, module="mail", actor=actor, target=mail,
           message=f"{'Transfert' if transfer else 'Affectation'} du courrier {mail.reference}")
    if user:
        notify(user, title="Courrier qui vous est affecté",
               body=f"{mail.reference} — {mail.subject}",
               url=f"/mail/{mail.id}", type="mail", email=True)
    return mail


def _assignment_label(user, department) -> str:
    if user:
        return f"→ {user.get_full_name() or user.email}"
    if department:
        return f"→ {department.name}"
    return "→ (non affecté)"


@transaction.atomic
def change_status(mail: Mail, *, actor, status: str) -> Mail:
    old = mail.status
    mail.status = status
    mail.save(update_fields=["status"])
    MailEvent.objects.create(
        mail=mail, actor=actor, type=MailEvent.Type.STATUS_CHANGE,
        detail=f"{old} → {status}",
    )
    record(action=AuditAction.UPDATE, module="mail", actor=actor, target=mail,
           message=f"Courrier {mail.reference} : statut {status}")
    return mail


@transaction.atomic
def acknowledge_mail(mail: Mail, *, actor) -> None:
    from .models import MailAcknowledgement

    _, created = MailAcknowledgement.objects.get_or_create(mail=mail, user=actor)
    if created:
        MailEvent.objects.create(
            mail=mail, actor=actor, type=MailEvent.Type.ACKNOWLEDGED,
            detail=f"Accusé de réception le {timezone.now():%Y-%m-%d %H:%M}",
        )
        record(action=AuditAction.VALIDATE, module="mail", actor=actor, target=mail,
               message=f"Accusé de réception du courrier {mail.reference}")


def log_view(mail: Mail, *, actor) -> None:
    """Trace une consultation (traçabilité complète, section 2.2)."""
    MailEvent.objects.create(mail=mail, actor=actor, type=MailEvent.Type.VIEWED)
