from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class EventType(models.TextChoices):
    PERSONAL = "personal", _("Personnel")
    TASK = "task", _("Tâche")
    MEETING = "meeting", _("Réunion")
    LEAVE = "leave", _("Congé")
    REMINDER = "reminder", _("Rappel")


class EventVisibility(models.TextChoices):
    PRIVATE = "private", _("Privé")
    BUSY = "busy", _("Occupé (détails masqués)")
    SHARED = "shared", _("Partagé")


class AttendeeResponse(models.TextChoices):
    NEEDS_ACTION = "needs_action", _("À confirmer")
    ACCEPTED = "accepted", _("Accepté")
    DECLINED = "declined", _("Refusé")
    TENTATIVE = "tentative", _("Peut-être")


# Code couleur par type (repris côté front pour la charte Wagadu)
TYPE_COLOR = {
    EventType.PERSONAL: "#6E3C13",
    EventType.TASK: "#F6BB24",
    EventType.MEETING: "#D2812E",
    EventType.LEAVE: "#4A2A12",
    EventType.REMINDER: "#FFA900",
}


class CalendarEvent(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="calendar_events"
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    location = models.CharField(max_length=255, blank=True)
    start = models.DateTimeField()
    end = models.DateTimeField()
    all_day = models.BooleanField(default=False)
    type = models.CharField(max_length=16, choices=EventType.choices, default=EventType.PERSONAL)
    visibility = models.CharField(
        max_length=16, choices=EventVisibility.choices, default=EventVisibility.PRIVATE
    )
    color = models.CharField(max_length=7, blank=True)
    # RRULE iCal (ex. "FREQ=WEEKLY;BYDAY=MO"), vide = non récurrent
    recurrence_rule = models.CharField(max_length=255, blank=True)

    attendees = models.ManyToManyField(
        settings.AUTH_USER_MODEL, through="EventAttendee", related_name="invited_events"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["start"]
        verbose_name = _("évènement d'agenda")
        indexes = [models.Index(fields=["owner", "start"])]

    def __str__(self) -> str:
        return f"{self.title} ({self.start:%Y-%m-%d %H:%M})"

    @property
    def display_color(self) -> str:
        return self.color or TYPE_COLOR.get(self.type, "#6E3C13")


class EventAttendee(models.Model):
    event = models.ForeignKey(CalendarEvent, on_delete=models.CASCADE, related_name="event_attendees")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="event_responses")
    response = models.CharField(
        max_length=16, choices=AttendeeResponse.choices, default=AttendeeResponse.NEEDS_ACTION
    )
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["event", "user"], name="uniq_event_attendee")
        ]

    def __str__(self) -> str:
        return f"{self.user} → {self.event_id} ({self.response})"

    def set_response(self, value: str) -> None:
        self.response = value
        self.responded_at = timezone.now()
        self.save(update_fields=["response", "responded_at"])


class ReminderChannel(models.TextChoices):
    NOTIFICATION = "notification", _("Notification")
    EMAIL = "email", _("E-mail")


class EventReminder(models.Model):
    event = models.ForeignKey(CalendarEvent, on_delete=models.CASCADE, related_name="reminders")
    minutes_before = models.PositiveIntegerField(default=15)
    channel = models.CharField(
        max_length=16, choices=ReminderChannel.choices, default=ReminderChannel.NOTIFICATION
    )
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["minutes_before"]

    def __str__(self) -> str:
        return f"{self.event_id} −{self.minutes_before} min ({self.channel})"
