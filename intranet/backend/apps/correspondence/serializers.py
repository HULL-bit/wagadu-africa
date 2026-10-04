from rest_framework import serializers

from .models import (
    Mail,
    MailAcknowledgement,
    MailAttachment,
    MailCategory,
    MailEvent,
    MailTemplate,
)


class MailCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MailCategory
        fields = ["id", "name", "keywords"]


class MailAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = MailAttachment
        fields = ["id", "mail", "file", "label", "uploaded_by", "uploaded_at"]
        read_only_fields = ["uploaded_by", "uploaded_at"]


class MailEventSerializer(serializers.ModelSerializer):
    actor_email = serializers.CharField(source="actor.email", read_only=True)
    type_display = serializers.CharField(source="get_type_display", read_only=True)

    class Meta:
        model = MailEvent
        fields = ["id", "type", "type_display", "actor", "actor_email", "detail", "created_at"]


class MailAcknowledgementSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = MailAcknowledgement
        fields = ["id", "user", "user_email", "acknowledged_at"]


class MailSerializer(serializers.ModelSerializer):
    direction_display = serializers.CharField(source="get_direction_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    attachments = MailAttachmentSerializer(many=True, read_only=True)
    events = MailEventSerializer(many=True, read_only=True)
    acknowledgements = MailAcknowledgementSerializer(many=True, read_only=True)

    class Meta:
        model = Mail
        fields = [
            "id", "reference", "direction", "direction_display", "subject", "body",
            "correspondent", "mail_date", "registered_at", "category",
            "confidentiality", "status", "status_display", "registered_by",
            "assigned_to", "assigned_department", "due_date",
            "attachments", "events", "acknowledgements",
        ]
        read_only_fields = [
            "reference", "registered_at", "registered_by", "status",
            "assigned_to", "assigned_department",
        ]


class MailCreateSerializer(serializers.ModelSerializer):
    register_for_department = serializers.IntegerField(required=False, write_only=True)

    class Meta:
        model = Mail
        fields = [
            "id", "direction", "subject", "body", "correspondent", "mail_date",
            "category", "confidentiality", "due_date", "register_for_department",
        ]


class MailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MailTemplate
        fields = ["id", "name", "category", "body", "created_at"]
        read_only_fields = ["created_at"]
