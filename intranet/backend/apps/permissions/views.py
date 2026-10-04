from __future__ import annotations

from django.db import transaction
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.audit.models import AuditAction, AuditSeverity
from apps.audit.services import record
from apps.permissions.drf import HasPermission

from .models import Permission, Role, RolePermission, UserPermissionOverride
from .serializers import (
    PermissionSerializer,
    RolePermissionsUpdateSerializer,
    RoleSerializer,
    UserPermissionOverrideSerializer,
)

MANAGE = HasPermission.of("accounts.manage_permissions")


class PermissionViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated, HasPermission.of("accounts.view")]
    filterset_fields = ["module"]
    search_fields = ["code", "label"]
    pagination_class = None


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.prefetch_related("permissions", "users").all()
    serializer_class = RoleSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated(), HasPermission.of("accounts.view")()]
        return [IsAuthenticated(), MANAGE()]

    def perform_create(self, serializer):
        role = serializer.save()
        record(action=AuditAction.CREATE, module="permissions", actor=self.request.user,
               target=role, message=f"Création du rôle {role.name}",
               severity=AuditSeverity.WARNING, request=self.request)

    def perform_destroy(self, instance):
        if instance.is_system:
            raise PermissionDenied("Un rôle système ne peut pas être supprimé.")
        if instance.users.exists():
            raise ValidationError("Ce rôle est encore attribué à des utilisateurs.")
        record(action=AuditAction.DELETE, module="permissions", actor=self.request.user,
               target=instance, target_repr=str(instance),
               message=f"Suppression du rôle {instance.name}",
               severity=AuditSeverity.WARNING, request=self.request)
        instance.delete()

    @action(detail=True, methods=["put"], url_path="permissions")
    def set_permissions(self, request, pk=None):
        role = self.get_object()
        serializer = RolePermissionsUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        codes = set(serializer.validated_data["permission_codes"])
        before = sorted(role.permission_codes)

        with transaction.atomic():
            RolePermission.objects.filter(role=role).delete()
            perms = Permission.objects.filter(code__in=codes)
            RolePermission.objects.bulk_create(
                [RolePermission(role=role, permission=p) for p in perms]
            )

        record(
            action=AuditAction.PERMISSION_CHANGE, module="permissions",
            actor=request.user, target=role,
            changes={"permissions": {"before": before, "after": sorted(codes)}},
            message=f"Redéfinition du socle de permissions du rôle {role.name}",
            severity=AuditSeverity.WARNING, request=request,
        )
        return Response(RoleSerializer(role).data)


class UserPermissionOverrideViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    queryset = UserPermissionOverride.objects.select_related(
        "permission", "user", "granted_by"
    ).all()
    serializer_class = UserPermissionOverrideSerializer
    permission_classes = [IsAuthenticated, MANAGE]
    filterset_fields = ["user", "permission", "effect", "scope_type"]

    def perform_create(self, serializer):
        target = serializer.validated_data["user"]
        if target.is_admin_account and not self.request.user.is_super_admin:
            raise PermissionDenied(
                "Seul un Super Administrateur peut modifier les permissions d'un "
                "compte administrateur."
            )
        override = serializer.save(granted_by=self.request.user)
        severity = (
            AuditSeverity.CRITICAL if target.is_admin_account else AuditSeverity.WARNING
        )
        record(
            action=AuditAction.PERMISSION_CHANGE, module="permissions",
            actor=self.request.user, target=override,
            changes={
                "effect": {"after": override.effect},
                "permission": {"after": override.permission.code},
                "user": {"after": target.email},
                "scope": {"after": f"{override.scope_type}:{override.scope_id}"},
            },
            message=(
                f"{override.get_effect_display()} « {override.permission.code} » "
                f"à {target.email}"
            ),
            severity=severity, notify_admins=True, request=self.request,
        )

    @action(detail=True, methods=["post"])
    def revoke(self, request, pk=None):
        override = self.get_object()
        if not override.is_active:
            raise ValidationError("Cette exception est déjà révoquée.")
        if override.user.is_admin_account and not request.user.is_super_admin:
            raise PermissionDenied(
                "Seul un Super Administrateur peut modifier les permissions d'un admin."
            )
        override.revoke(request.user)
        record(
            action=AuditAction.PERMISSION_CHANGE, module="permissions",
            actor=request.user, target=override,
            changes={"revoked": {"before": False, "after": True}},
            message=f"Révocation de l'exception « {override.permission.code} » "
                    f"de {override.user.email}",
            severity=AuditSeverity.WARNING, request=request,
        )
        return Response(UserPermissionOverrideSerializer(override).data)
