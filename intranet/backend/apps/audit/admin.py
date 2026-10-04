from django.contrib import admin

from .models import AuditLogEntry


@admin.register(AuditLogEntry)
class AuditLogEntryAdmin(admin.ModelAdmin):
    list_display = ("timestamp", "actor_label", "module", "action", "severity", "target_repr")
    list_filter = ("module", "action", "severity", "actor_is_admin")
    search_fields = ("actor_label", "target_repr", "message")
    date_hierarchy = "timestamp"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
