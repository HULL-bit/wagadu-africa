from __future__ import annotations

from rest_framework import serializers

from .models import Channel, Message


class MessageSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ["id", "channel", "author", "author_name", "body", "created_at"]
        read_only_fields = ["id", "channel", "author", "created_at"]

    def get_author_name(self, obj) -> str:
        if not obj.author_id:
            return "Compte supprimé"
        return obj.author.get_full_name() or obj.author.email


class ChannelSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread = serializers.SerializerMethodField()
    member_count = serializers.IntegerField(source="members.count", read_only=True)

    class Meta:
        model = Channel
        fields = [
            "id", "kind", "display_name", "department", "member_count",
            "last_message", "last_message_at", "unread",
        ]

    def _viewer(self):
        request = self.context.get("request")
        return request.user if request else None

    def get_display_name(self, obj) -> str:
        return obj.display_name(viewer=self._viewer())

    def get_last_message(self, obj) -> dict | None:
        msg = getattr(obj, "_last_message", None) or obj.messages.order_by("-created_at").first()
        if not msg:
            return None
        return {
            "body": msg.body[:120],
            "author_name": (msg.author.get_full_name() or msg.author.email) if msg.author_id else "—",
            "created_at": msg.created_at,
        }

    def get_unread(self, obj) -> int:
        viewer = self._viewer()
        if not viewer:
            return 0
        read = next((r for r in obj.reads.all() if r.user_id == viewer.pk), None)
        qs = obj.messages.exclude(author=viewer)
        if read:
            qs = qs.filter(created_at__gt=read.last_read_at)
        return qs.count()
