from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class ScopeType(models.TextChoices):
    GLOBAL = "global", _("Global")
    MODULE = "module", _("Module")
    DEPARTMENT = "department", _("Département")
    PROJECT = "project", _("Projet")


class OverrideEffect(models.TextChoices):
    GRANT = "grant", _("Accorder")
    DENY = "deny", _("Retirer")


class Permission(models.Model):
    """Permission atomique du catalogue (voir constants.PERMISSION_CATALOG)."""

    code = models.CharField(max_length=100, unique=True)
    label = models.CharField(max_length=200)
    module = models.CharField(max_length=50)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["module", "code"]
        verbose_name = _("permission")

    def __str__(self) -> str:
        return self.code


class Role(models.Model):
    slug = models.SlugField(max_length=50, unique=True)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    is_system = models.BooleanField(
        default=False,
        help_text=_("Rôle de base non supprimable."),
    )
    permissions = models.ManyToManyField(
        Permission,
        through="RolePermission",
        related_name="roles",
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = _("rôle")

    def __str__(self) -> str:
        return self.name

    @property
    def permission_codes(self) -> set[str]:
        return set(self.permissions.values_list("code", flat=True))


class RolePermission(models.Model):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="role_permissions")
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["role", "permission"], name="uniq_role_permission"
            )
        ]

    def __str__(self) -> str:
        return f"{self.role.slug} → {self.permission.code}"


class UserPermissionOverrideQuerySet(models.QuerySet):
    def active(self) -> UserPermissionOverrideQuerySet:
        return self.filter(revoked_at__isnull=True)


class UserPermissionOverride(models.Model):
    """Exception individuelle (section 4.3) : accorde ou retire une permission
    précise à un membre, éventuellement limitée à un périmètre."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="permission_overrides",
    )
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)
    effect = models.CharField(max_length=10, choices=OverrideEffect.choices)
    scope_type = models.CharField(
        max_length=20, choices=ScopeType.choices, default=ScopeType.GLOBAL
    )
    scope_id = models.CharField(
        max_length=100,
        blank=True,
        help_text=_("Identifiant de la cible du périmètre (module, département, projet)."),
    )
    reason = models.TextField(blank=True)
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="permission_overrides_granted",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="permission_overrides_revoked",
    )

    objects = UserPermissionOverrideQuerySet.as_manager()

    class Meta:
        ordering = ["-created_at"]
        verbose_name = _("permission individuelle")
        verbose_name_plural = _("permissions individuelles")

    def __str__(self) -> str:
        verb = "＋" if self.effect == OverrideEffect.GRANT else "－"
        return f"{verb} {self.permission.code} → {self.user}"

    @property
    def is_active(self) -> bool:
        return self.revoked_at is None

    def revoke(self, by) -> None:
        self.revoked_at = timezone.now()
        self.revoked_by = by
        self.save(update_fields=["revoked_at", "revoked_by"])
