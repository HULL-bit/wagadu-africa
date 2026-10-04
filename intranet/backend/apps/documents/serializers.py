from __future__ import annotations

from rest_framework import serializers

from .models import (
    Document,
    DocumentDistribution,
    DocumentRecipient,
    DocumentSignature,
    DocumentVersion,
    DocumentVisibilityRule,
    Folder,
    ShareLink,
)


class DocumentSignatureSerializer(serializers.ModelSerializer):
    signer_name = serializers.CharField(source="signer.get_full_name", read_only=True)
    signer_email = serializers.CharField(source="signer.email", read_only=True)

    class Meta:
        model = DocumentSignature
        fields = ["id", "version", "signer", "signer_name", "signer_email", "statement", "signed_at"]
        read_only_fields = fields


class FolderSerializer(serializers.ModelSerializer):
    document_count = serializers.IntegerField(source="documents.count", read_only=True)

    class Meta:
        model = Folder
        fields = ["id", "name", "parent", "description", "document_count", "created_at"]
        read_only_fields = ["created_at"]


class DocumentVersionSerializer(serializers.ModelSerializer):
    uploaded_by_email = serializers.CharField(source="uploaded_by.email", read_only=True)

    class Meta:
        model = DocumentVersion
        fields = [
            "id", "version_number", "original_filename", "size", "content_type",
            "note", "uploaded_by", "uploaded_by_email", "uploaded_at",
        ]
        read_only_fields = fields


class DocumentVisibilityRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentVisibilityRule
        fields = ["id", "subject_type", "subject_id"]


class DocumentSerializer(serializers.ModelSerializer):
    versions = DocumentVersionSerializer(many=True, read_only=True)
    visibility_rules = DocumentVisibilityRuleSerializer(many=True, read_only=True)
    current_version_detail = DocumentVersionSerializer(source="current_version", read_only=True)
    owner_email = serializers.CharField(source="owner.email", read_only=True)
    folder_name = serializers.CharField(source="folder.name", read_only=True)
    is_trashed = serializers.BooleanField(read_only=True)
    signatures = DocumentSignatureSerializer(many=True, read_only=True)

    class Meta:
        model = Document
        fields = [
            "id", "title", "description", "keywords", "folder", "folder_name",
            "owner", "owner_email", "is_in_library", "visibility",
            "current_version", "current_version_detail", "versions",
            "visibility_rules", "signatures", "is_trashed", "created_at", "updated_at",
        ]
        read_only_fields = ["owner", "current_version", "created_at", "updated_at"]


class DocumentRecipientSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = DocumentRecipient
        fields = ["id", "user", "user_email", "user_name", "is_read", "read_at", "reminded_at"]
        read_only_fields = fields


class DocumentDistributionSerializer(serializers.ModelSerializer):
    recipients = DocumentRecipientSerializer(many=True, read_only=True)
    document_title = serializers.CharField(source="document.title", read_only=True)
    mode_display = serializers.CharField(source="get_mode_display", read_only=True)
    read_count = serializers.IntegerField(read_only=True)
    total_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = DocumentDistribution
        fields = [
            "id", "document", "document_title", "version", "sent_by", "mode",
            "mode_display", "message", "sent_at", "read_count", "total_count",
            "recipients",
        ]
        read_only_fields = fields


class ReceivedDocumentSerializer(serializers.ModelSerializer):
    document_id = serializers.IntegerField(source="document.id", read_only=True)
    title = serializers.CharField(source="document.title", read_only=True)
    description = serializers.CharField(source="document.description", read_only=True)
    sent_by_email = serializers.CharField(source="distribution.sent_by.email", read_only=True)
    message = serializers.CharField(source="distribution.message", read_only=True)
    sent_at = serializers.DateTimeField(source="distribution.sent_at", read_only=True)

    class Meta:
        model = DocumentRecipient
        fields = [
            "id", "document_id", "title", "description", "sent_by_email",
            "message", "sent_at", "is_read", "read_at",
        ]
        read_only_fields = fields


class ShareLinkSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    url = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = ShareLink
        fields = [
            "id", "document", "version", "token", "url", "expires_at",
            "max_downloads", "download_count", "is_revoked", "is_active",
            "password", "created_at",
        ]
        read_only_fields = ["token", "download_count", "is_revoked", "created_at"]

    def get_url(self, obj) -> str:
        return f"/share/{obj.token}"

    def create(self, validated_data):
        raw_password = validated_data.pop("password", "")
        link = ShareLink(**validated_data)
        link.set_password(raw_password or None)
        link.save()
        return link
