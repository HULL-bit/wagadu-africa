from __future__ import annotations

from rest_framework import serializers

from .models import Announcement, Poll, PollOption


class AnnouncementSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)
    is_live = serializers.BooleanField(read_only=True)

    class Meta:
        model = Announcement
        fields = [
            "id", "title", "body", "author", "author_name", "pinned",
            "audience", "department", "publish_at", "expires_at", "is_live", "created_at",
        ]
        read_only_fields = ["author", "created_at"]


class PollOptionSerializer(serializers.ModelSerializer):
    vote_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = PollOption
        fields = ["id", "label", "order", "vote_count"]


class PollSerializer(serializers.ModelSerializer):
    options = PollOptionSerializer(many=True, read_only=True)
    option_labels = serializers.ListField(child=serializers.CharField(), write_only=True, required=False)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    total_votes = serializers.IntegerField(read_only=True)
    my_votes = serializers.SerializerMethodField()

    class Meta:
        model = Poll
        fields = [
            "id", "question", "description", "created_by", "created_by_name",
            "is_open", "is_anonymous", "multiple_choice", "closes_at",
            "options", "option_labels", "total_votes", "my_votes", "created_at",
        ]
        read_only_fields = ["created_by", "created_at"]

    def get_my_votes(self, obj):
        user = self.context["request"].user
        return [o.id for o in obj.options.all() if o.votes.filter(user=user).exists()]

    def create(self, validated_data):
        labels = validated_data.pop("option_labels", [])
        poll = Poll.objects.create(created_by=self.context["request"].user, **validated_data)
        for i, label in enumerate(labels):
            PollOption.objects.create(poll=poll, label=label, order=i)
        return poll
