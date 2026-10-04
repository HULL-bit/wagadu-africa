from __future__ import annotations

from rest_framework import serializers

from .models import CalendarEvent, EventAttendee, EventReminder


class EventReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventReminder
        fields = ["id", "minutes_before", "channel", "sent_at"]
        read_only_fields = ["sent_at"]


class EventAttendeeSerializer(serializers.ModelSerializer):
    email = serializers.CharField(source="user.email", read_only=True)
    name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = EventAttendee
        fields = ["id", "user", "email", "name", "response", "responded_at"]
        read_only_fields = ["responded_at"]


class CalendarEventSerializer(serializers.ModelSerializer):
    reminders = EventReminderSerializer(many=True, required=False)
    event_attendees = EventAttendeeSerializer(many=True, read_only=True)
    attendee_ids = serializers.ListField(
        child=serializers.UUIDField(), write_only=True, required=False
    )
    display_color = serializers.CharField(read_only=True)
    my_response = serializers.SerializerMethodField()

    class Meta:
        model = CalendarEvent
        fields = [
            "id", "owner", "title", "description", "location", "start", "end",
            "all_day", "type", "visibility", "color", "display_color",
            "recurrence_rule", "reminders", "event_attendees", "attendee_ids",
            "my_response", "created_at",
        ]
        read_only_fields = ["owner", "created_at"]

    def get_my_response(self, obj):
        user = self.context["request"].user
        att = next((a for a in obj.event_attendees.all() if a.user_id == user.id), None)
        return att.response if att else None

    def _sync_children(self, event, reminders, attendee_ids):
        if reminders is not None:
            event.reminders.all().delete()
            for r in reminders:
                EventReminder.objects.create(event=event, **r)
        if attendee_ids is not None:
            from apps.accounts.models import User

            event.event_attendees.exclude(user_id__in=attendee_ids).delete()
            for uid in attendee_ids:
                if not event.event_attendees.filter(user_id=uid).exists():
                    user = User.objects.filter(id=uid).first()
                    if user:
                        EventAttendee.objects.create(event=event, user=user)

    def create(self, validated_data):
        reminders = validated_data.pop("reminders", None)
        attendee_ids = validated_data.pop("attendee_ids", None)
        event = CalendarEvent.objects.create(
            owner=self.context["request"].user, **validated_data
        )
        self._sync_children(event, reminders, attendee_ids)
        return event

    def update(self, instance, validated_data):
        reminders = validated_data.pop("reminders", None)
        attendee_ids = validated_data.pop("attendee_ids", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        self._sync_children(instance, reminders, attendee_ids)
        return instance
