from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import LoginAttempt, PasswordPolicy, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ("email",)
    list_display = ("email", "get_full_name", "role", "department", "is_super_admin", "status", "is_active")
    list_filter = ("role", "department", "status", "is_super_admin", "is_active")
    search_fields = ("email", "first_name", "last_name")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Identité", {"fields": ("first_name", "last_name", "phone")}),
        ("Organisation", {"fields": ("role", "department", "manager")}),
        ("Statut", {"fields": ("status", "is_active", "is_staff", "is_superuser", "is_super_admin")}),
        ("Sécurité", {"fields": ("failed_login_count", "locked_until", "is_2fa_enabled", "last_password_change")}),
        ("Préférences", {"fields": ("preferred_language", "timezone")}),
        ("Permissions Django", {"fields": ("groups", "user_permissions")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "password1", "password2", "role")}),
    )
    readonly_fields = ("last_password_change",)


@admin.register(PasswordPolicy)
class PasswordPolicyAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return not PasswordPolicy.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(LoginAttempt)
class LoginAttemptAdmin(admin.ModelAdmin):
    list_display = ("email_tried", "successful", "ip_address", "created_at")
    list_filter = ("successful",)
    search_fields = ("email_tried",)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
