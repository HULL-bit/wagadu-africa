from django.contrib import admin

from .models import Indicator, Milestone, ProgressUpdate, Project


class MilestoneInline(admin.TabularInline):
    model = Milestone
    extra = 0


class IndicatorInline(admin.TabularInline):
    model = Indicator
    extra = 0


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "status", "lead", "department", "donor", "updated_at")
    list_filter = ("status", "department")
    search_fields = ("code", "name", "donor")
    inlines = [MilestoneInline, IndicatorInline]


@admin.register(ProgressUpdate)
class ProgressUpdateAdmin(admin.ModelAdmin):
    list_display = ("project", "date", "author", "spent_amount")
    list_filter = ("project",)
