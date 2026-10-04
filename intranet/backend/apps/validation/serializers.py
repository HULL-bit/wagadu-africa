from rest_framework import serializers

from .models import (
    ApprovalDecision,
    ApprovalProcess,
    ValidationFlow,
    ValidationStep,
)


class ValidationStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = ValidationStep
        fields = [
            "id", "flow", "order", "label", "approver_type",
            "approver_role", "approver_user", "skip_if_unresolved",
        ]


class ValidationFlowSerializer(serializers.ModelSerializer):
    steps = ValidationStepSerializer(many=True, read_only=True)

    class Meta:
        model = ValidationFlow
        fields = ["id", "code", "label", "description", "is_active", "steps", "created_at"]
        read_only_fields = ["created_at"]


class ApprovalDecisionSerializer(serializers.ModelSerializer):
    approver_email = serializers.CharField(source="approver.email", read_only=True)
    decision_display = serializers.CharField(source="get_decision_display", read_only=True)

    class Meta:
        model = ApprovalDecision
        fields = [
            "id", "step", "approver", "approver_email", "decision",
            "decision_display", "comment", "decided_at",
        ]


class ApprovalProcessSerializer(serializers.ModelSerializer):
    decisions = ApprovalDecisionSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    current_step_label = serializers.CharField(source="current_step.label", read_only=True)

    class Meta:
        model = ApprovalProcess
        fields = [
            "id", "flow", "status", "status_display", "current_step",
            "current_step_label", "subject_user", "decisions",
            "created_at", "completed_at",
        ]
        read_only_fields = fields
