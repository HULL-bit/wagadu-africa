from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.audit.models import AuditAction
from apps.audit.services import record
from apps.notifications.services import notify

from .models import Meeting, MeetingAccess, MeetingParticipant, MeetingStatus


@transaction.atomic
def create_meeting(*, data: dict, actor, participant_ids=None) -> Meeting:
    meeting = Meeting.objects.create(organizer=actor, **data)
    MeetingParticipant.objects.create(meeting=meeting, user=actor, is_organizer=True, response="accepted")
    _add_participants(meeting, participant_ids or [], actor=actor, notify_them=True)
    record(action=AuditAction.CREATE, module="meetings", actor=actor, target=meeting,
           message=f"Création de la réunion « {meeting.title} »")
    return meeting


def _add_participants(meeting, user_ids, *, actor, notify_them: bool):
    from apps.accounts.models import User

    for user in User.objects.filter(id__in=user_ids, is_active=True):
        _, created = MeetingParticipant.objects.get_or_create(meeting=meeting, user=user)
        if created and notify_them:
            notify(user, title="Invitation à une réunion",
                   body=f"« {meeting.title} » le {timezone.localtime(meeting.start):%d/%m %H:%M}",
                   url=f"/meetings/{meeting.id}", type="meeting", email=True)


@transaction.atomic
def set_participants(meeting: Meeting, *, actor, add=None, remove=None):
    if remove:
        meeting.meeting_participants.filter(user_id__in=remove, is_organizer=False).delete()
    _add_participants(meeting, add or [], actor=actor, notify_them=True)
    record(action=AuditAction.UPDATE, module="meetings", actor=actor, target=meeting,
           message="Mise à jour des participants")


def respond(meeting: Meeting, *, user, response: str) -> MeetingParticipant:
    participant = meeting.meeting_participants.filter(user=user).first()
    if participant is None and meeting.access == MeetingAccess.OPEN:
        participant = MeetingParticipant.objects.create(meeting=meeting, user=user)
    if participant is None:
        from rest_framework.exceptions import PermissionDenied

        raise PermissionDenied("Vous n'êtes pas invité à cette réunion.")
    participant.response = response
    participant.save(update_fields=["response"])
    if meeting.organizer and user != meeting.organizer:
        notify(meeting.organizer, title="Réponse à une invitation",
               body=f"{user.get_full_name() or user.email} : {participant.get_response_display()}",
               url=f"/meetings/{meeting.id}", type="meeting")
    return participant


def can_access(meeting: Meeting, user) -> bool:
    if user.is_super_admin or meeting.organizer_id == user.id:
        return True
    if meeting.access == MeetingAccess.OPEN:
        return True
    return meeting.meeting_participants.filter(user=user).exists()


@transaction.atomic
def close_meeting(meeting: Meeting, *, actor, minutes: str = "") -> Meeting:
    meeting.status = MeetingStatus.ENDED
    if minutes:
        meeting.minutes = minutes
    meeting.save(update_fields=["status", "minutes"])
    record(action=AuditAction.UPDATE, module="meetings", actor=actor, target=meeting,
           message="Clôture de la réunion + compte-rendu")
    return meeting
