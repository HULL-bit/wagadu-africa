from __future__ import annotations

import secrets

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class MeetingStatus(models.TextChoices):
    SCHEDULED = "scheduled", _("Planifiée")
    ONGOING = "ongoing", _("En cours")
    ENDED = "ended", _("Terminée")
    CANCELLED = "cancelled", _("Annulée")


class MeetingAccess(models.TextChoices):
    INVITED = "invited", _("Sur invitation")
    OPEN = "open", _("Ouverte à tous")


class ParticipantResponse(models.TextChoices):
    NEEDS_ACTION = "needs_action", _("À confirmer")
    ACCEPTED = "accepted", _("Accepté")
    DECLINED = "declined", _("Refusé")
    TENTATIVE = "tentative", _("Peut-être")


class Meeting(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="meetings_organized"
    )
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL, through="MeetingParticipant", related_name="meetings"
    )
    start = models.DateTimeField()
    end = models.DateTimeField()
    room_slug = models.CharField(max_length=80, unique=True, editable=False)
    access = models.CharField(max_length=16, choices=MeetingAccess.choices, default=MeetingAccess.INVITED)
    lobby = models.BooleanField(default=False, help_text=_("Salle d'attente avec validation d'entrée."))
    recurrence_rule = models.CharField(max_length=255, blank=True)

    agenda = models.TextField(blank=True, help_text=_("Ordre du jour."))
    minutes = models.TextField(blank=True, help_text=_("Compte-rendu."))
    minutes_document = models.ForeignKey(
        "documents.Document", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    recording_document = models.ForeignKey(
        "documents.Document", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    status = models.CharField(max_length=16, choices=MeetingStatus.choices, default=MeetingStatus.SCHEDULED)
    reminder_sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start"]
        verbose_name = _("réunion")

    def __str__(self) -> str:
        return f"{self.title} ({self.start:%Y-%m-%d %H:%M})"

    def save(self, *args, **kwargs):
        if not self.room_slug:
            self.room_slug = f"wagadu-{secrets.token_urlsafe(9)}"
        super().save(*args, **kwargs)

    @property
    def join_url(self) -> str:
        from django.conf import settings as dj

        base = (dj.WAGADU.get("JITSI", {}).get("URL") or "https://meet.jit.si").rstrip("/")
        return f"{base}/{self.room_slug}"

    @property
    def is_upcoming(self) -> bool:
        return self.status == MeetingStatus.SCHEDULED and self.start > timezone.now()


class MeetingParticipant(models.Model):
    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name="meeting_participants")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="meeting_invitations")
    response = models.CharField(
        max_length=16, choices=ParticipantResponse.choices, default=ParticipantResponse.NEEDS_ACTION
    )
    is_organizer = models.BooleanField(default=False)
    joined_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["meeting", "user"], name="uniq_meeting_participant")
        ]

    def __str__(self) -> str:
        return f"{self.user} @ {self.meeting_id}"


class MeetingPoll(models.Model):
    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name="polls")
    question = models.CharField(max_length=255)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    is_open = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.question


class MeetingPollOption(models.Model):
    poll = models.ForeignKey(MeetingPoll, on_delete=models.CASCADE, related_name="options")
    label = models.CharField(max_length=200)

    def __str__(self) -> str:
        return self.label

    @property
    def vote_count(self) -> int:
        return self.votes.count()


class MeetingPollVote(models.Model):
    option = models.ForeignKey(MeetingPollOption, on_delete=models.CASCADE, related_name="votes")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    voted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["option", "user"], name="uniq_poll_option_vote"
            )
        ]

    def __str__(self) -> str:
        return f"{self.user} → {self.option_id}"
