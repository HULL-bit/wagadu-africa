from __future__ import annotations

from rest_framework import serializers

from apps.validation.engine import get_process
from apps.validation.serializers import ApprovalProcessSerializer

from .models import Request, RequestAttachment, RequestComment, RequestType


class RequestTypeSerializer(serializers.ModelSerializer):
    flow_code = serializers.CharField(source="flow.code", read_only=True)

    class Meta:
        model = RequestType
        fields = ["id", "code", "label", "description", "icon", "form_schema",
                  "flow", "flow_code", "is_active"]


class RequestAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = RequestAttachment
        fields = ["id", "request", "file", "label", "uploaded_by", "uploaded_at"]
        read_only_fields = ["uploaded_by", "uploaded_at"]


class RequestCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)

    class Meta:
        model = RequestComment
        fields = ["id", "request", "author", "author_name", "body", "created_at"]
        read_only_fields = ["author", "created_at"]


class RequestSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    type_label = serializers.CharField(source="type.label", read_only=True)
    requester_name = serializers.CharField(source="requester.get_full_name", read_only=True)
    attachments = RequestAttachmentSerializer(many=True, read_only=True)
    comments = RequestCommentSerializer(many=True, read_only=True)
    approval = serializers.SerializerMethodField()

    class Meta:
        model = Request
        fields = [
            "id", "type", "type_label", "reference", "requester", "requester_name",
            "title", "data", "status", "status_display", "submitted_at",
            "decided_at", "created_at", "attachments", "comments", "approval",
        ]
        read_only_fields = ["reference", "requester", "status", "submitted_at", "decided_at", "created_at"]

    def get_approval(self, obj):
        process = get_process(obj)
        return ApprovalProcessSerializer(process).data if process else None
