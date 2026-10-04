from __future__ import annotations

from rest_framework import serializers

from .models import Incident


class IncidentSerializer(serializers.ModelSerializer):
    reported_by_name = serializers.CharField(source="reported_by.get_full_name", read_only=True, default="")
    assigned_to_name = serializers.CharField(source="assigned_to.get_full_name", read_only=True, default="")
    severity_display = serializers.CharField(source="get_severity_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Incident
        fields = [
            "id", "title", "description", "component",
            "severity", "severity_display", "status", "status_display",
            "reported_by", "reported_by_name", "assigned_to", "assigned_to_name",
            "resolution_notes", "created_at", "updated_at", "resolved_at",
        ]
        read_only_fields = ["reported_by", "created_at", "updated_at", "resolved_at"]
