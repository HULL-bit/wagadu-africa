from __future__ import annotations

from rest_framework import serializers

from .models import Permission, Role, UserPermissionOverride


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ["id", "code", "label", "module", "description"]


class RoleSerializer(serializers.ModelSerializer):
    permission_codes = serializers.SerializerMethodField()
    user_count = serializers.IntegerField(source="users.count", read_only=True)

    class Meta:
        model = Role
        fields = [
            "id", "slug", "name", "description", "is_system",
            "permission_codes", "user_count", "created_at", "updated_at",
        ]
        read_only_fields = ["is_system", "created_at", "updated_at"]

    def get_permission_codes(self, obj) -> list[str]:
        return sorted(obj.permission_codes)


class RolePermissionsUpdateSerializer(serializers.Serializer):
    permission_codes = serializers.ListField(child=serializers.CharField())

    def validate_permission_codes(self, value):
        known = set(Permission.objects.values_list("code", flat=True))
        unknown = sorted(set(value) - known)
        if unknown:
            raise serializers.ValidationError(f"Codes inconnus : {', '.join(unknown)}")
        return value


class UserPermissionOverrideSerializer(serializers.ModelSerializer):
    permission_code = serializers.CharField(source="permission.code", read_only=True)
    granted_by_email = serializers.CharField(source="granted_by.email", read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = UserPermissionOverride
        fields = [
            "id", "user", "permission", "permission_code", "effect",
            "scope_type", "scope_id", "reason", "granted_by", "granted_by_email",
            "created_at", "revoked_at", "revoked_by", "is_active",
        ]
        read_only_fields = ["granted_by", "created_at", "revoked_at", "revoked_by"]
