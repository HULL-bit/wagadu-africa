from __future__ import annotations

from rest_framework import serializers

from apps.validation.engine import get_process
from apps.validation.serializers import ApprovalProcessSerializer

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


class EmployeeSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    email = serializers.CharField(source="user.email", read_only=True)
    department = serializers.IntegerField(source="user.department_id", read_only=True)
    seniority_years = serializers.FloatField(read_only=True)

    class Meta:
        model = Employee
        fields = [
            "id", "user", "full_name", "email", "department", "matricule",
            "job_title", "hire_date", "employment_type", "hr_status",
            "probation_end", "birth_date", "national_id", "social_security_number",
            "seniority_years", "created_at",
        ]
        read_only_fields = ["created_at"]


class ContractSerializer(serializers.ModelSerializer):
    days_to_expiry = serializers.IntegerField(read_only=True)
    is_open_ended = serializers.BooleanField(read_only=True)

    class Meta:
        model = Contract
        fields = [
            "id", "employee", "reference", "type", "start_date", "end_date",
            "gross_salary", "document", "renewal_notice_days", "days_to_expiry",
            "is_open_ended", "created_at",
        ]
        read_only_fields = ["created_at"]


class EmployeeDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeDocument
        fields = ["id", "employee", "kind", "label", "file", "uploaded_by", "uploaded_at"]
        read_only_fields = ["uploaded_by", "uploaded_at"]


class CareerEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = CareerEvent
        fields = [
            "id", "employee", "type", "date", "title", "description",
            "recorded_by", "created_at",
        ]
        read_only_fields = ["recorded_by", "created_at"]


class HealthRecordSerializer(serializers.ModelSerializer):
    days_to_expiry = serializers.IntegerField(read_only=True)

    class Meta:
        model = HealthRecord
        fields = [
            "id", "employee", "record_type", "label", "date", "expiry_date",
            "renewal_notice_days", "days_to_expiry", "notes",
        ]


class PublicHolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = PublicHoliday
        fields = ["id", "date", "label"]


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = [
            "id", "code", "label", "annual_quota_days", "paid",
            "requires_certificate", "color", "is_active",
        ]


class LeaveBalanceSerializer(serializers.ModelSerializer):
    leave_type_label = serializers.CharField(source="leave_type.label", read_only=True)
    remaining_days = serializers.DecimalField(max_digits=6, decimal_places=1, read_only=True)

    class Meta:
        model = LeaveBalance
        fields = [
            "id", "employee", "leave_type", "leave_type_label", "year",
            "entitled_days", "carried_over_days", "taken_days", "remaining_days",
        ]


class LeaveRequestSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    employee_name = serializers.CharField(source="employee.user.get_full_name", read_only=True)
    employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), required=False
    )
    approval = serializers.SerializerMethodField()

    class Meta:
        model = LeaveRequest
        fields = [
            "id", "employee", "employee_name", "leave_type", "start_date", "end_date",
            "half_day_start", "half_day_end", "reason", "attachment", "working_days",
            "status", "status_display", "submitted_at", "decided_at", "created_at",
            "approval",
        ]
        read_only_fields = [
            "working_days", "status", "submitted_at", "decided_at", "created_at",
        ]

    def get_approval(self, obj):
        process = get_process(obj)
        return ApprovalProcessSerializer(process).data if process else None


# ─── Phase 7 Lot A : onboarding / offboarding / évaluations ───────────

from .models import (  # noqa: E402
    Evaluation,
    EvaluationAnswer,
    EvaluationCampaign,
    EvaluationForm,
    EvaluationQuestion,
    LifecycleItem,
    LifecycleProcess,
    LifecycleTemplate,
    LifecycleTemplateItem,
)


class LifecycleTemplateItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = LifecycleTemplateItem
        fields = ["id", "template", "label", "category", "responsible_role", "order", "due_offset_days"]


class LifecycleTemplateSerializer(serializers.ModelSerializer):
    items = LifecycleTemplateItemSerializer(many=True, read_only=True)

    class Meta:
        model = LifecycleTemplate
        fields = ["id", "kind", "name", "description", "is_default", "items", "created_at"]
        read_only_fields = ["created_at"]


class LifecycleItemSerializer(serializers.ModelSerializer):
    responsible_email = serializers.CharField(source="responsible.email", read_only=True)

    class Meta:
        model = LifecycleItem
        fields = [
            "id", "process", "label", "category", "responsible_role", "responsible",
            "responsible_email", "due_date", "is_done", "done_by", "done_at", "notes",
            "document", "order",
        ]
        read_only_fields = ["done_by", "done_at"]


class LifecycleProcessSerializer(serializers.ModelSerializer):
    items = LifecycleItemSerializer(many=True, read_only=True)
    employee_name = serializers.CharField(source="employee.user.get_full_name", read_only=True)
    matricule = serializers.CharField(source="employee.matricule", read_only=True)
    progress = serializers.DictField(read_only=True)
    kind_display = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = LifecycleProcess
        fields = [
            "id", "kind", "kind_display", "employee", "employee_name", "matricule",
            "template", "reference_date", "status", "progress", "items",
            "created_at", "completed_at",
        ]
        read_only_fields = fields


class EvaluationQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvaluationQuestion
        fields = ["id", "form", "section", "label", "type", "weight", "order"]


class EvaluationFormSerializer(serializers.ModelSerializer):
    questions = EvaluationQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = EvaluationForm
        fields = ["id", "name", "description", "is_active", "questions", "created_at"]
        read_only_fields = ["created_at"]


class EvaluationCampaignSerializer(serializers.ModelSerializer):
    form_name = serializers.CharField(source="form.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    evaluation_count = serializers.IntegerField(source="evaluations.count", read_only=True)

    class Meta:
        model = EvaluationCampaign
        fields = [
            "id", "name", "form", "form_name", "period_start", "period_end",
            "department", "status", "status_display", "evaluation_count", "created_at",
        ]
        read_only_fields = ["status", "created_at"]


class EvaluationAnswerSerializer(serializers.ModelSerializer):
    question_label = serializers.CharField(source="question.label", read_only=True)
    question_type = serializers.CharField(source="question.type", read_only=True)
    section = serializers.CharField(source="question.section", read_only=True)

    class Meta:
        model = EvaluationAnswer
        fields = ["id", "question", "question_label", "question_type", "section",
                  "self_value", "manager_value", "comment"]
        read_only_fields = fields


class EvaluationSerializer(serializers.ModelSerializer):
    answers = EvaluationAnswerSerializer(many=True, read_only=True)
    employee_name = serializers.CharField(source="employee.user.get_full_name", read_only=True)
    campaign_name = serializers.CharField(source="campaign.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    form = serializers.IntegerField(source="campaign.form_id", read_only=True)
    questions = serializers.SerializerMethodField()

    class Meta:
        model = Evaluation
        fields = [
            "id", "campaign", "campaign_name", "employee", "employee_name", "evaluator",
            "status", "status_display", "self_score", "manager_score", "overall_comment",
            "employee_comment", "form", "questions", "answers", "created_at", "finalized_at",
        ]
        read_only_fields = fields

    def get_questions(self, obj):
        return EvaluationQuestionSerializer(obj.campaign.form.questions.all(), many=True).data
