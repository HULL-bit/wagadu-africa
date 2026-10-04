from django.contrib import admin

from .models import Permission, Role, RolePermission, UserPermissionOverride


class RolePermissionInline(admin.TabularInline):
    model = RolePermission
    extra = 0
    autocomplete_fields = ["permission"]


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ("code", "label", "module")
    list_filter = ("module",)
    search_fields = ("code", "label")


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_system")
    list_filter = ("is_system",)
    search_fields = ("name", "slug")
    inlines = [RolePermissionInline]


@admin.register(UserPermissionOverride)
class UserPermissionOverrideAdmin(admin.ModelAdmin):
    list_display = ("user", "permission", "effect", "scope_type", "is_active", "granted_by", "created_at")
    list_filter = ("effect", "scope_type")
    search_fields = ("user__email", "permission__code")
    readonly_fields = ("created_at",)
