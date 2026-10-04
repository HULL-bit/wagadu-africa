from __future__ import annotations

import datetime

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


def leave_attachment_path(instance, filename):
    return f"hr/leave/{instance.employee_id}/{filename}"


def employee_document_path(instance, filename):
    return f"hr/employees/{instance.employee_id}/{filename}"


def contract_document_path(instance, filename):
    return f"hr/contracts/{instance.employee_id}/{filename}"


class EmploymentType(models.TextChoices):
    CDI = "cdi", _("CDI")
    CDD = "cdd", _("CDD")
    INTERNSHIP = "internship", _("Stage")
    SERVICE = "service", _("Prestation de service")
    VOLUNTEER = "volunteer", _("Volontariat")


class HrStatus(models.TextChoices):
    ONBOARDING = "onboarding", _("Intégration")
    ACTIVE = "active", _("En poste")
    ON_LEAVE = "on_leave", _("En congé")
    PROBATION = "probation", _("Période d'essai")
    LEFT = "left", _("Parti")


class Employee(models.Model):
    """Fiche RH liée à un compte utilisateur (section 2.1 / 5.4)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="employee"
    )
    matricule = models.CharField(max_length=30, unique=True)
    job_title = models.CharField(max_length=150, blank=True)
    hire_date = models.DateField(null=True, blank=True)
    employment_type = models.CharField(
        max_length=20, choices=EmploymentType.choices, default=EmploymentType.CDI
    )
    hr_status = models.CharField(
        max_length=20, choices=HrStatus.choices, default=HrStatus.ACTIVE
    )
    probation_end = models.DateField(null=True, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    national_id = models.CharField(max_length=50, blank=True)
    social_security_number = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["matricule"]
        verbose_name = _("employé")

    def __str__(self) -> str:
        return f"{self.matricule} — {self.user.get_full_name() or self.user.email}"

    @property
    def seniority_years(self) -> float | None:
        if not self.hire_date:
            return None
        return round((timezone.now().date() - self.hire_date).days / 365.25, 1)


class Contract(models.Model):
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="contracts"
    )
    reference = models.CharField(max_length=50, blank=True)
    type = models.CharField(max_length=20, choices=EmploymentType.choices)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    gross_salary = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    document = models.FileField(upload_to=contract_document_path, blank=True)
    renewal_notice_days = models.PositiveIntegerField(
        default=30, help_text=_("Délai d'alerte avant l'échéance.")
    )
    expiry_alert_sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_date"]
        verbose_name = _("contrat")

    def __str__(self) -> str:
        return f"{self.get_type_display()} — {self.employee.matricule}"

    @property
    def is_open_ended(self) -> bool:
        return self.end_date is None

    @property
    def days_to_expiry(self) -> int | None:
        if not self.end_date:
            return None
        return (self.end_date - timezone.now().date()).days


class EmployeeDocument(models.Model):
    class Kind(models.TextChoices):
        ID = "id", _("Pièce d'identité")
        DIPLOMA = "diploma", _("Diplôme")
        CERTIFICATE = "certificate", _("Attestation")
        CONTRACT = "contract", _("Contrat")
        OTHER = "other", _("Autre")

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="documents"
    )
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.OTHER)
    label = models.CharField(max_length=150)
    file = models.FileField(upload_to=employee_document_path)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self) -> str:
        return f"{self.label} ({self.employee.matricule})"


class CareerEvent(models.Model):
    class Type(models.TextChoices):
        PROMOTION = "promotion", _("Promotion")
        TRAINING = "training", _("Formation")
        WARNING = "warning", _("Avertissement")
        ROLE_CHANGE = "role_change", _("Changement de poste")
        TRANSFER = "transfer", _("Mutation")
        OTHER = "other", _("Autre")

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="career_events"
    )
    type = models.CharField(max_length=20, choices=Type.choices)
    date = models.DateField()
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]
        verbose_name = _("évènement de carrière")

    def __str__(self) -> str:
        return f"{self.get_type_display()} — {self.employee.matricule} ({self.date})"


class HealthRecordType(models.TextChoices):
    MEDICAL_VISIT = "medical_visit", _("Visite médicale")
    CERTIFICATION = "certification", _("Habilitation")


class HealthRecord(models.Model):
    """Visite médicale ou habilitation obligatoire, avec alerte de renouvellement."""

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="health_records"
    )
    record_type = models.CharField(max_length=20, choices=HealthRecordType.choices)
    label = models.CharField(max_length=150)
    date = models.DateField()
    expiry_date = models.DateField(null=True, blank=True)
    renewal_notice_days = models.PositiveIntegerField(default=30)
    expiry_alert_sent_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-date"]
        verbose_name = _("suivi médical / habilitation")

    def __str__(self) -> str:
        return f"{self.label} — {self.employee.matricule}"

    @property
    def days_to_expiry(self) -> int | None:
        if not self.expiry_date:
            return None
        return (self.expiry_date - timezone.now().date()).days


class PublicHoliday(models.Model):
    date = models.DateField(unique=True)
    label = models.CharField(max_length=120)

    class Meta:
        ordering = ["date"]
        verbose_name = _("jour férié")

    def __str__(self) -> str:
        return f"{self.date} — {self.label}"


class LeaveType(models.Model):
    code = models.SlugField(max_length=40, unique=True)
    label = models.CharField(max_length=120)
    annual_quota_days = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    paid = models.BooleanField(default=True)
    requires_certificate = models.BooleanField(default=False)
    color = models.CharField(max_length=7, default="#D2812E")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["label"]
        verbose_name = _("type de congé")

    def __str__(self) -> str:
        return self.label


class LeaveBalance(models.Model):
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="leave_balances"
    )
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE)
    year = models.PositiveIntegerField()
    entitled_days = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    carried_over_days = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    taken_days = models.DecimalField(max_digits=5, decimal_places=1, default=0)

    class Meta:
        ordering = ["-year"]
        constraints = [
            models.UniqueConstraint(
                fields=["employee", "leave_type", "year"], name="uniq_leave_balance"
            )
        ]

    def __str__(self) -> str:
        return f"{self.employee.matricule} · {self.leave_type.code} {self.year}"

    @property
    def remaining_days(self):
        return self.entitled_days + self.carried_over_days - self.taken_days


class LeaveStatus(models.TextChoices):
    DRAFT = "draft", _("Brouillon")
    SUBMITTED = "submitted", _("Soumis")
    IN_REVIEW = "in_review", _("En validation")
    APPROVED = "approved", _("Approuvé")
    REJECTED = "rejected", _("Rejeté")
    CANCELLED = "cancelled", _("Annulé")


class LeaveRequest(models.Model):
    LEAVE_FLOW_CODE = "conges"

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="leave_requests"
    )
    leave_type = models.ForeignKey(LeaveType, on_delete=models.PROTECT)
    start_date = models.DateField()
    end_date = models.DateField()
    half_day_start = models.BooleanField(default=False)
    half_day_end = models.BooleanField(default=False)
    reason = models.TextField(blank=True)
    attachment = models.FileField(upload_to=leave_attachment_path, blank=True)
    working_days = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    status = models.CharField(
        max_length=16, choices=LeaveStatus.choices, default=LeaveStatus.DRAFT
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    decided_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_date"]
        verbose_name = _("demande de congé")

    def __str__(self) -> str:
        return f"{self.employee.matricule} · {self.leave_type.code} {self.start_date}→{self.end_date}"

    # --- Hooks appelés par le moteur de validation ---
    def on_approval_approved(self, *, process, actor=None, comment=""):
        from .services import apply_approved_leave

        apply_approved_leave(self)

    def on_approval_rejected(self, *, process, actor=None, comment=""):
        self.status = LeaveStatus.REJECTED
        self.decided_at = timezone.now()
        self.save(update_fields=["status", "decided_at"])

    def on_approval_returned(self, *, process, actor=None, comment=""):
        self.status = LeaveStatus.DRAFT
        self.save(update_fields=["status"])

    def on_approval_cancelled(self, *, process, actor=None, comment=""):
        self.status = LeaveStatus.CANCELLED
        self.save(update_fields=["status"])

    @staticmethod
    def business_days(start: datetime.date, end: datetime.date,
                      half_start: bool = False, half_end: bool = False) -> float:
        holidays = set(
            PublicHoliday.objects.filter(date__range=(start, end)).values_list("date", flat=True)
        )
        days = 0.0
        current = start
        while current <= end:
            if current.weekday() < 5 and current not in holidays:
                days += 1
            current += datetime.timedelta(days=1)
        if days and half_start:
            days -= 0.5
        if days and half_end and start != end:
            days -= 0.5
        return days


# ═══════════════════════════════════════════════════════════════════════
#  Phase 7 — Lot A : onboarding / offboarding / évaluations
# ═══════════════════════════════════════════════════════════════════════


class ResponsibleRole(models.TextChoices):
    HR = "hr", _("RH")
    MANAGER = "manager", _("Responsable hiérarchique")
    EMPLOYEE = "employee", _("Employé")
    IT = "it", _("Informatique")


class ChecklistCategory(models.TextChoices):
    TASK = "task", _("Tâche")
    DOCUMENT = "document", _("Document à fournir")
    EQUIPMENT = "equipment", _("Matériel")
    ACCESS = "access", _("Accès / comptes")
    HANDOVER = "handover", _("Passation")
    ADMIN = "admin", _("Administratif")


class LifecycleKind(models.TextChoices):
    ONBOARDING = "onboarding", _("Intégration")
    OFFBOARDING = "offboarding", _("Départ")


class LifecycleTemplate(models.Model):
    kind = models.CharField(max_length=16, choices=LifecycleKind.choices)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["kind", "name"]
        verbose_name = _("modèle de checklist RH")

    def __str__(self) -> str:
        return f"[{self.get_kind_display()}] {self.name}"


class LifecycleTemplateItem(models.Model):
    template = models.ForeignKey(
        LifecycleTemplate, on_delete=models.CASCADE, related_name="items"
    )
    label = models.CharField(max_length=200)
    category = models.CharField(
        max_length=16, choices=ChecklistCategory.choices, default=ChecklistCategory.TASK
    )
    responsible_role = models.CharField(
        max_length=16, choices=ResponsibleRole.choices, default=ResponsibleRole.HR
    )
    order = models.PositiveIntegerField(default=0)
    due_offset_days = models.IntegerField(
        default=0, help_text=_("Échéance = date d'entrée/départ + N jours (peut être négatif).")
    )

    class Meta:
        ordering = ["order", "id"]

    def __str__(self) -> str:
        return self.label


class LifecycleProcess(models.Model):
    class Status(models.TextChoices):
        IN_PROGRESS = "in_progress", _("En cours")
        COMPLETED = "completed", _("Terminé")
        CANCELLED = "cancelled", _("Annulé")

    kind = models.CharField(max_length=16, choices=LifecycleKind.choices)
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="lifecycle_processes"
    )
    template = models.ForeignKey(LifecycleTemplate, on_delete=models.SET_NULL, null=True)
    reference_date = models.DateField(
        help_text=_("Date d'entrée (onboarding) ou dernier jour (offboarding).")
    )
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.IN_PROGRESS)
    started_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["kind", "employee"],
                condition=models.Q(status="in_progress"),
                name="uniq_active_lifecycle_per_employee",
            )
        ]
        verbose_name = _("processus d'intégration / départ")

    def __str__(self) -> str:
        return f"{self.get_kind_display()} — {self.employee.matricule}"

    @property
    def progress(self) -> dict:
        total = self.items.count()
        done = self.items.filter(is_done=True).count()
        return {"done": done, "total": total, "percent": round(done / total * 100) if total else 0}

    def refresh_status(self) -> None:
        if self.status == self.Status.IN_PROGRESS and self.items.exists() and not self.items.filter(is_done=False).exists():
            self.status = self.Status.COMPLETED
            self.completed_at = timezone.now()
            self.save(update_fields=["status", "completed_at"])


class LifecycleItem(models.Model):
    process = models.ForeignKey(LifecycleProcess, on_delete=models.CASCADE, related_name="items")
    label = models.CharField(max_length=200)
    category = models.CharField(max_length=16, choices=ChecklistCategory.choices)
    responsible_role = models.CharField(max_length=16, choices=ResponsibleRole.choices)
    responsible = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    due_date = models.DateField(null=True, blank=True)
    is_done = models.BooleanField(default=False)
    done_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    done_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    document = models.ForeignKey(
        "documents.Document", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self) -> str:
        return f"{'✓' if self.is_done else '○'} {self.label}"


# ─── Évaluations de performance ───────────────────────────────────────

class QuestionType(models.TextChoices):
    RATING = "rating_1_5", _("Note de 1 à 5")
    TEXT = "text", _("Texte libre")
    YES_NO = "yes_no", _("Oui / Non")


class EvaluationForm(models.Model):
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name = _("formulaire d'évaluation")

    def __str__(self) -> str:
        return self.name


class EvaluationQuestion(models.Model):
    form = models.ForeignKey(EvaluationForm, on_delete=models.CASCADE, related_name="questions")
    section = models.CharField(max_length=120, default="Général")
    label = models.CharField(max_length=255)
    type = models.CharField(max_length=16, choices=QuestionType.choices, default=QuestionType.RATING)
    weight = models.DecimalField(max_digits=4, decimal_places=1, default=1)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self) -> str:
        return self.label


class EvaluationCampaign(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", _("Brouillon")
        OPEN = "open", _("Ouverte")
        CLOSED = "closed", _("Clôturée")

    name = models.CharField(max_length=150)
    form = models.ForeignKey(EvaluationForm, on_delete=models.PROTECT)
    period_start = models.DateField()
    period_end = models.DateField()
    department = models.ForeignKey(
        "organization.Department", on_delete=models.SET_NULL, null=True, blank=True,
        help_text=_("Vide = tout le personnel."),
    )
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-period_start"]
        verbose_name = _("campagne d'évaluation")

    def __str__(self) -> str:
        return self.name


class Evaluation(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", _("À démarrer")
        SELF_ASSESSED = "self_assessed", _("Auto-évaluation faite")
        MANAGER_ASSESSED = "manager_assessed", _("Évaluée par le responsable")
        ACKNOWLEDGED = "acknowledged", _("Prise de connaissance")
        FINALIZED = "finalized", _("Finalisée")

    campaign = models.ForeignKey(EvaluationCampaign, on_delete=models.CASCADE, related_name="evaluations")
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="evaluations")
    evaluator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="evaluations_to_do"
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    self_score = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    manager_score = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    overall_comment = models.TextField(blank=True)
    employee_comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    finalized_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["campaign", "employee"], name="uniq_campaign_evaluation")
        ]
        verbose_name = _("évaluation de performance")

    def __str__(self) -> str:
        return f"{self.campaign.name} — {self.employee.matricule}"


class EvaluationAnswer(models.Model):
    evaluation = models.ForeignKey(Evaluation, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey(EvaluationQuestion, on_delete=models.CASCADE)
    self_value = models.CharField(max_length=2000, blank=True)
    manager_value = models.CharField(max_length=2000, blank=True)
    comment = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["evaluation", "question"], name="uniq_evaluation_answer")
        ]

    def __str__(self) -> str:
        return f"{self.evaluation_id} / {self.question_id}"
