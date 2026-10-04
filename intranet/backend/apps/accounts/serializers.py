from __future__ import annotations

from django.contrib.auth import authenticate
from django.utils.crypto import get_random_string
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.permissions.services import effective_permissions

from .models import User, UserStatus
from .services import record_login_attempt, validate_password_strength, verify_totp

PROFILE_FIELDS = [
    "job_title", "bio", "secondary_email", "linkedin_url", "twitter_url",
    "facebook_url", "website_url", "whatsapp",
]


class RelativeImageField(serializers.ImageField):
    """URL toujours relative à MEDIA_URL (jamais absolue).

    Évite les URLs `http://backend:8000/...` injoignables quand l'API est
    proxifiée (Next rewrite) ; le navigateur résout `/media/...` sur son origine.
    """

    def to_representation(self, value):
        if not value:
            return None
        try:
            return value.url
        except ValueError:
            return None


class RoleBriefSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    slug = serializers.CharField()
    name = serializers.CharField()


class UserSerializer(serializers.ModelSerializer):
    role_detail = RoleBriefSerializer(source="role", read_only=True)
    full_name = serializers.CharField(source="get_full_name", read_only=True)
    avatar = RelativeImageField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name", "full_name", "phone",
            "role", "role_detail", "department", "manager", "is_super_admin",
            "status", "preferred_language", "timezone", "is_active",
            "is_2fa_enabled", "created_at", "avatar", *PROFILE_FIELDS,
        ]
        read_only_fields = ["id", "is_super_admin", "created_at", "is_2fa_enabled"]


class UserWriteSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)
    avatar = RelativeImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name", "phone", "role",
            "department", "manager", "status", "preferred_language", "timezone",
            "is_active", "password", "avatar", *PROFILE_FIELDS,
        ]
        read_only_fields = ["id"]

    def validate_password(self, value: str) -> str:
        validate_password_strength(value, self.instance)
        return value

    def validate_avatar(self, value):
        if value and value.size > 2 * 1024 * 1024:
            raise serializers.ValidationError("Image trop volumineuse (2 Mo maximum).")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password", None) or get_random_string(16)
        user = User(**validated_data)
        user.set_password(password)
        user.full_clean(exclude=["password"])
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if password:
            instance.set_password(password)
        instance.full_clean(exclude=["password"])
        instance.save()
        return instance


class SelfServiceSerializer(serializers.ModelSerializer):
    """Champs qu'un employé peut mettre à jour lui-même (section 2.1)."""

    class Meta:
        model = User
        fields = [
            "first_name", "last_name", "phone", "preferred_language", "timezone",
            "emergency_contact", "bank_account", "avatar", *PROFILE_FIELDS,
        ]

    def validate_avatar(self, value):
        if value and value.size > 2 * 1024 * 1024:
            raise serializers.ValidationError("Image trop volumineuse (2 Mo maximum).")
        return value


class MeSerializer(serializers.ModelSerializer):
    role_detail = RoleBriefSerializer(source="role", read_only=True)
    permissions = serializers.SerializerMethodField()
    avatar = RelativeImageField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name", "phone", "role", "role_detail",
            "department", "manager", "is_super_admin", "status", "preferred_language",
            "timezone", "emergency_contact", "bank_account", "is_2fa_enabled",
            "avatar", *PROFILE_FIELDS, "permissions",
        ]
        read_only_fields = fields

    def get_permissions(self, obj) -> list[str]:
        return [
            code for code, meta in effective_permissions(obj).items() if meta["granted"]
        ]


class MemberSerializer(serializers.ModelSerializer):
    """Fiche annuaire — visible par tout membre authentifié."""

    full_name = serializers.CharField(source="get_full_name", read_only=True)
    role_name = serializers.CharField(source="role.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    avatar = RelativeImageField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "full_name", "email", "phone", "avatar", "role_name",
            "department_name", *PROFILE_FIELDS,
        ]
        read_only_fields = fields


class LoginSerializer(TokenObtainPairSerializer):
    """Connexion e-mail + mot de passe avec verrouillage et 2FA optionnelle."""

    username_field = User.USERNAME_FIELD
    totp_code = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        request = self.context.get("request")
        email = attrs.get("email") or attrs.get(self.username_field)
        password = attrs.get("password")

        user = User.objects.filter(email__iexact=email).first()

        if user and user.is_locked:
            record_login_attempt(email, request, user=user, success=False)
            raise serializers.ValidationError(
                "Compte temporairement verrouillé après plusieurs échecs. Réessayez plus tard."
            )

        auth_user = authenticate(request, email=email, password=password)
        if auth_user is None:
            if user:
                user.register_failed_login()
            record_login_attempt(email, request, user=user, success=False)
            raise serializers.ValidationError("Identifiants invalides.")

        if auth_user.status in (UserStatus.SUSPENDED, UserStatus.OFFBOARDED) or not auth_user.is_active:
            record_login_attempt(email, request, user=auth_user, success=False)
            raise serializers.ValidationError("Ce compte est désactivé.")

        if auth_user.is_2fa_enabled:
            code = attrs.get("totp_code", "")
            if not code:
                raise serializers.ValidationError({"totp_code": "Code 2FA requis."})
            if not verify_totp(auth_user.totp_secret, code):
                record_login_attempt(email, request, user=auth_user, success=False)
                raise serializers.ValidationError({"totp_code": "Code 2FA invalide."})

        auth_user.reset_login_failures()
        record_login_attempt(email, request, user=auth_user, success=True)

        refresh = self.get_token(auth_user)
        self.user = auth_user
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": MeSerializer(auth_user).data,
        }


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_current_password(self, value: str) -> str:
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Mot de passe actuel incorrect.")
        return value

    def validate_new_password(self, value: str) -> str:
        validate_password_strength(value, self.context["request"].user)
        return value


class EffectivePermissionsSerializer(serializers.Serializer):
    def to_representation(self, instance) -> dict:
        return effective_permissions(instance)
