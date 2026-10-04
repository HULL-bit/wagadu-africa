from django.contrib import admin

from .models import ApprovalDecision, ApprovalProcess, ValidationFlow, ValidationStep


class ValidationStepInline(admin.TabularInline):
    model = ValidationStep
    extra = 1


@admin.register(ValidationFlow)
class ValidationFlowAdmin(admin.ModelAdmin):
    list_display = ("code", "label", "is_active")
    inlines = [ValidationStepInline]


class ApprovalDecisionInline(admin.TabularInline):
    model = ApprovalDecision
    extra = 0
    readonly_fields = ("step", "approver", "decision", "comment", "decided_at")


@admin.register(ApprovalProcess)
class ApprovalProcessAdmin(admin.ModelAdmin):
    list_display = ("flow", "status", "subject_user", "current_step", "created_at")
    list_filter = ("status", "flow")
    inlines = [ApprovalDecisionInline]
