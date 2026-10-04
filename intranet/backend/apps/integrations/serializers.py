from rest_framework import serializers

from .models import ChatChannel


class ChatChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatChannel
        fields = ["id", "name", "kind", "department", "team", "is_default", "rc_room_id"]
        read_only_fields = fields
