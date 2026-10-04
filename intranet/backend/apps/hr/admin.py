from django.contrib import admin

from .models import (
    CareerEvent,
    Contract,
    Employee,
    EmployeeDocument,
    HealthRecord,
    LeaveBalance,
    LeaveRequest,
    LeaveType,
    PublicHoliday,
)


class ContractInline(admin.TabularInline):
    model = Contract
    extra = 0


class CareerEventInline(admin.TabularInline):
    model = CareerEvent
    extra = 0


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ("matricule", "user", "job_title", "employment_type", "hr_status", "hire_date")
    list_filter = ("employment_type", "hr_status")
    search_fields = ("matricule", "user__email", "user__first_name", "user__last_name")
    inlines = [ContractInline, CareerEventInline]


@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = ("code", "label", "annual_quota_days", "paid", "requires_certificate")


@admin.register(LeaveBalance)
class LeaveBalanceAdmin(admin.ModelAdmin):
    list_display = ("employee", "leave_type", "year", "entitled_days", "taken_days", "remaining_days")
    list_filter = ("year", "leave_type")


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ("employee", "leave_type", "start_date", "end_date", "working_days", "status")
    list_filter = ("status", "leave_type")
    date_hierarchy = "start_date"


@admin.register(PublicHoliday)
class PublicHolidayAdmin(admin.ModelAdmin):
    list_display = ("date", "label")


@admin.register(HealthRecord)
class HealthRecordAdmin(admin.ModelAdmin):
    list_display = ("employee", "record_type", "label", "date", "expiry_date")
    list_filter = ("record_type",)


admin.site.register(EmployeeDocument)
admin.site.register(CareerEvent)
admin.site.register(Contract)


from .models import (  # noqa: E402
    EvaluationCampaign,
    EvaluationForm,
    LifecycleProcess,
    LifecycleTemplate,
)


class LifecycleTemplateItemInline(admin.TabularInline):
    from .models import LifecycleTemplateItem
    model = LifecycleTemplateItem
    extra = 1


@admin.register(LifecycleTemplate)
class LifecycleTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "kind", "is_default")
    list_filter = ("kind", "is_default")
    inlines = [LifecycleTemplateItemInline]


@admin.register(LifecycleProcess)
class LifecycleProcessAdmin(admin.ModelAdmin):
    list_display = ("kind", "employee", "status", "reference_date", "created_at")
    list_filter = ("kind", "status")


class EvaluationQuestionInline(admin.TabularInline):
    from .models import EvaluationQuestion
    model = EvaluationQuestion
    extra = 1


@admin.register(EvaluationForm)
class EvaluationFormAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active")
    inlines = [EvaluationQuestionInline]


@admin.register(EvaluationCampaign)
class EvaluationCampaignAdmin(admin.ModelAdmin):
    list_display = ("name", "form", "status", "period_start", "period_end")
    list_filter = ("status",)
