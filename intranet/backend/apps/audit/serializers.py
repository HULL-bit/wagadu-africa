from rest_framework import serializers

from .models import AuditLogEntry


class AuditLogEntrySerializer(serializers.ModelSerializer):
    action_display = serializers.CharField(source="get_action_display", read_only=True)
    severity_display = serializers.CharField(source="get_severity_display", read_only=True)

    class Meta:
        model = AuditLogEntry
        fields = [
            "id", "timestamp", "actor", "actor_label", "actor_is_admin", "confidential",
            "module", "action", "action_display", "severity", "severity_display",
            "target_type", "target_id", "target_repr", "changes", "message",
            "ip_address", "user_agent",
        ]
        read_only_fields = fields
