from __future__ import annotations

from rest_framework import serializers

from .models import (
    Meeting,
    MeetingParticipant,
    MeetingPoll,
    MeetingPollOption,
)


class MeetingParticipantSerializer(serializers.ModelSerializer):
    email = serializers.CharField(source="user.email", read_only=True)
    name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = MeetingParticipant
        fields = ["id", "user", "email", "name", "response", "is_organizer", "joined_at"]
        read_only_fields = fields


class PollOptionSerializer(serializers.ModelSerializer):
    vote_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = MeetingPollOption
        fields = ["id", "label", "vote_count"]


class MeetingPollSerializer(serializers.ModelSerializer):
    options = PollOptionSerializer(many=True, read_only=True)
    option_labels = serializers.ListField(child=serializers.CharField(), write_only=True, required=False)
    my_vote = serializers.SerializerMethodField()

    class Meta:
        model = MeetingPoll
        fields = ["id", "meeting", "question", "is_open", "options", "option_labels", "my_vote", "created_at"]
        read_only_fields = ["created_at"]

    def get_my_vote(self, obj):
        user = self.context["request"].user
        for opt in obj.options.all():
            if opt.votes.filter(user=user).exists():
                return opt.id
        return None

    def create(self, validated_data):
        labels = validated_data.pop("option_labels", [])
        poll = MeetingPoll.objects.create(
            created_by=self.context["request"].user, **validated_data
        )
        for label in labels:
            MeetingPollOption.objects.create(poll=poll, label=label)
        return poll


class MeetingSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    organizer_name = serializers.CharField(source="organizer.get_full_name", read_only=True)
    meeting_participants = MeetingParticipantSerializer(many=True, read_only=True)
    polls = MeetingPollSerializer(many=True, read_only=True)
    join_url = serializers.CharField(read_only=True)
    participant_ids = serializers.ListField(child=serializers.UUIDField(), write_only=True, required=False)
    minutes_document_detail = serializers.SerializerMethodField()

    class Meta:
        model = Meeting
        fields = [
            "id", "title", "description", "organizer", "organizer_name",
            "start", "end", "room_slug", "access", "lobby", "recurrence_rule",
            "agenda", "minutes", "minutes_document", "minutes_document_detail",
            "recording_document", "status", "status_display", "join_url",
            "meeting_participants", "polls", "participant_ids", "created_at",
        ]
        read_only_fields = ["organizer", "room_slug", "status", "created_at"]

    def get_minutes_document_detail(self, obj) -> dict | None:
        doc = obj.minutes_document
        if not doc:
            return None
        return {"id": doc.id, "title": doc.title}
