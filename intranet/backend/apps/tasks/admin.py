from django.contrib import admin

from .models import (
    ChecklistItem,
    RecurringTaskTemplate,
    Task,
    TaskAssignment,
    TaskComment,
    TaskLabel,
    TaskSubmission,
)


class TaskAssignmentInline(admin.TabularInline):
    model = TaskAssignment
    extra = 0


class ChecklistItemInline(admin.TabularInline):
    model = ChecklistItem
    extra = 0


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "status", "priority", "created_by", "due_at", "closed_at")
    list_filter = ("status", "priority")
    search_fields = ("title", "description")
    date_hierarchy = "created_at"
    inlines = [TaskAssignmentInline, ChecklistItemInline]


@admin.register(TaskSubmission)
class TaskSubmissionAdmin(admin.ModelAdmin):
    list_display = ("task", "submitted_by", "status", "submitted_at", "reviewed_by")
    list_filter = ("status",)


@admin.register(RecurringTaskTemplate)
class RecurringTaskTemplateAdmin(admin.ModelAdmin):
    list_display = ("title", "frequency", "interval", "next_due_date", "is_active")
    list_filter = ("frequency", "is_active")


admin.site.register(TaskLabel)
admin.site.register(TaskComment)
