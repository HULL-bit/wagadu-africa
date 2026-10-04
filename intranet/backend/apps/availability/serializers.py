from __future__ import annotations

from rest_framework import serializers

from .models import Availability


class AvailabilitySerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    kind_display = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = Availability
        fields = [
            "id", "user", "user_name", "start_date", "end_date",
            "kind", "kind_display", "note", "created_at",
        ]
        read_only_fields = ["user", "created_at"]

    def get_user_name(self, obj) -> str:
        return obj.user.get_full_name() or obj.user.email

    def validate(self, attrs):
        start = attrs.get("start_date")
        end = attrs.get("end_date")
        if start and end and end < start:
            raise serializers.ValidationError({"end_date": "La date de fin précède la date de début."})
        return attrs
