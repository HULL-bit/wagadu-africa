from django.contrib import admin

from .models import Department, Team, TeamMembership


class TeamMembershipInline(admin.TabularInline):
    model = TeamMembership
    extra = 0


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "parent", "head")
    search_fields = ("name", "code")


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("name", "department", "lead")
    inlines = [TeamMembershipInline]
