from __future__ import annotations

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import AuditAction
from apps.audit.services import record
from apps.permissions.drf import HasPermission
from apps.permissions.services import has_permission
from apps.validation.engine import ValidationError as FlowError
from apps.validation.engine import get_process, submit_decision

from .models import (
    CareerEvent,
    Contract,
    Employee,
    EmployeeDocument,
    HealthRecord,
    LeaveBalance,
    LeaveRequest,
    LeaveStatus,
    LeaveType,
    PublicHoliday,
)
from .permissions import HrObjectAccess
from .serializers import (
    CareerEventSerializer,
    ContractSerializer,
    EmployeeDocumentSerializer,
    EmployeeSerializer,
    HealthRecordSerializer,
    LeaveBalanceSerializer,
    LeaveRequestSerializer,
    LeaveTypeSerializer,
    PublicHolidaySerializer,
)
from .services import cancel_leave_request, submit_leave_request

HR_MANAGE = HasPermission.of("hr.manage")
HR_VIEW = HasPermission.of("hr.view")


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related("user", "user__department").all()
    serializer_class = EmployeeSerializer
    filterset_fields = ["employment_type", "hr_status", "user__department"]
    search_fields = ["matricule", "job_title", "user__first_name", "user__last_name", "user__email"]

    def get_permissions(self):
        if self.action in ("list",):
            return [IsAuthenticated(), HR_VIEW()]
        if self.action in ("retrieve", "me"):
            return [IsAuthenticated(), HrObjectAccess()]
        return [IsAuthenticated(), HR_MANAGE()]

    def perform_create(self, serializer):
        employee = serializer.save()
        record(action=AuditAction.CREATE, module="hr", actor=self.request.user,
               target=employee, message=f"Création de la fiche employé {employee.matricule}",
               request=self.request)

    @action(detail=False, methods=["get"])
    def me(self, request):
        employee = Employee.objects.filter(user=request.user).first()
        if not employee:
            return Response({"detail": "Aucune fiche employé associée."}, status=404)
        return Response(self.get_serializer(employee).data)


class _HrChildViewSet(viewsets.ModelViewSet):
    filterset_fields = ["employee"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated(), HrObjectAccess()]
        return [IsAuthenticated(), HR_MANAGE()]

    def get_queryset(self):
        qs = self.queryset
        user = self.request.user
        if user.is_super_admin or has_permission(user, "hr.view"):
            return qs
        return qs.filter(Q(employee__user=user) | Q(employee__user__manager=user))


class ContractViewSet(_HrChildViewSet):
    queryset = Contract.objects.select_related("employee").all()
    serializer_class = ContractSerializer

    def perform_create(self, serializer):
        contract = serializer.save()
        record(action=AuditAction.CREATE, module="hr", actor=self.request.user,
               target=contract, message="Ajout d'un contrat", request=self.request)


class EmployeeDocumentViewSet(_HrChildViewSet):
    queryset = EmployeeDocument.objects.select_related("employee").all()
    serializer_class = EmployeeDocumentSerializer

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class CareerEventViewSet(_HrChildViewSet):
    queryset = CareerEvent.objects.select_related("employee").all()
    serializer_class = CareerEventSerializer

    def perform_create(self, serializer):
        event = serializer.save(recorded_by=self.request.user)
        record(action=AuditAction.CREATE, module="hr", actor=self.request.user,
               target=event, message=f"Évènement de carrière : {event.title}",
               request=self.request)


class HealthRecordViewSet(_HrChildViewSet):
    queryset = HealthRecord.objects.select_related("employee").all()
    serializer_class = HealthRecordSerializer
    filterset_fields = ["employee", "record_type"]


class PublicHolidayViewSet(viewsets.ModelViewSet):
    queryset = PublicHoliday.objects.all()
    serializer_class = PublicHolidaySerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), HR_MANAGE()]


class LeaveTypeViewSet(viewsets.ModelViewSet):
    queryset = LeaveType.objects.all()
    serializer_class = LeaveTypeSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), HR_MANAGE()]


class LeaveBalanceViewSet(viewsets.ModelViewSet):
    queryset = LeaveBalance.objects.select_related("employee", "leave_type").all()
    serializer_class = LeaveBalanceSerializer
    filterset_fields = ["employee", "leave_type", "year"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), HR_MANAGE()]

    def get_queryset(self):
        user = self.request.user
        if user.is_super_admin or has_permission(user, "hr.view"):
            return self.queryset
        return self.queryset.filter(employee__user=user)


class LeaveRequestViewSet(viewsets.ModelViewSet):
    queryset = LeaveRequest.objects.select_related(
        "employee", "employee__user", "leave_type"
    ).all()
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["employee", "leave_type", "status"]
    ordering_fields = ["start_date", "created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = self.queryset
        if user.is_super_admin or has_permission(user, "hr.leave.validate") or has_permission(user, "hr.view"):
            return qs
        return qs.filter(
            Q(employee__user=user) | Q(employee__user__manager=user)
        )

    def _employee_for(self, request):
        emp = Employee.objects.filter(user=request.user).first()
        if not emp:
            raise ValidationError("Vous n'avez pas de fiche employé : contactez le RH.")
        return emp

    def perform_create(self, serializer):
        employee = serializer.validated_data.get("employee")
        if employee and employee.user_id != self.request.user.id:
            if not has_permission(self.request.user, "hr.manage"):
                raise PermissionDenied("Vous ne pouvez créer une demande que pour vous-même.")
        else:
            employee = self._employee_for(self.request)
        serializer.save(employee=employee, status=LeaveStatus.DRAFT)

    def perform_destroy(self, instance):
        if instance.status not in (LeaveStatus.DRAFT, LeaveStatus.REJECTED):
            raise ValidationError("Seule une demande en brouillon peut être supprimée.")
        if instance.employee.user_id != self.request.user.id and not has_permission(
            self.request.user, "hr.manage"
        ):
            raise PermissionDenied("Non autorisé.")
        instance.delete()

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        leave = self.get_object()
        if leave.employee.user_id != request.user.id and not has_permission(request.user, "hr.manage"):
            raise PermissionDenied("Non autorisé.")
        try:
            submit_leave_request(leave, actor=request.user)
        except FlowError as exc:
            raise ValidationError(str(exc)) from exc
        return Response(self.get_serializer(leave).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        leave = self.get_object()
        if leave.employee.user_id != request.user.id and not has_permission(request.user, "hr.manage"):
            raise PermissionDenied("Non autorisé.")
        cancel_leave_request(leave, actor=request.user)
        return Response(self.get_serializer(leave).data)

    @action(detail=True, methods=["post"])
    def decide(self, request, pk=None):
        leave = self.get_object()
        process = get_process(leave)
        if process is None:
            raise ValidationError("Aucun circuit de validation en cours.")
        try:
            submit_decision(
                process,
                user=request.user,
                decision=request.data.get("decision"),
                comment=request.data.get("comment", ""),
            )
        except FlowError as exc:
            raise PermissionDenied(str(exc)) from exc
        leave.refresh_from_db()
        return Response(self.get_serializer(leave).data)

    @action(detail=False, methods=["get"], url_path="to-validate")
    def to_validate(self, request):
        """Demandes de congé dont l'utilisateur courant est l'approbateur de l'étape en cours."""
        pending = LeaveRequest.objects.filter(status=LeaveStatus.IN_REVIEW).select_related(
            "employee__user", "leave_type"
        )
        result = []
        for leave in pending:
            process = get_process(leave)
            if process and process.current_step:
                approver = process.current_step.resolve_approver(process.subject_user)
                if approver and approver.pk == request.user.pk:
                    result.append(leave)
        return Response(self.get_serializer(result, many=True).data)


class HrDashboardView(APIView):
    permission_classes = [IsAuthenticated, HR_VIEW]

    def get(self, request):
        today = timezone.now().date()
        soon = today + timezone.timedelta(days=60)
        return Response({
            "headcount": Employee.objects.filter(hr_status__in=["active", "on_leave", "probation"]).count(),
            "by_department": list(
                Employee.objects.values("user__department__name")
                .annotate(count=Count("id")).order_by("-count")
            ),
            "on_leave_now": LeaveRequest.objects.filter(
                status=LeaveStatus.APPROVED, start_date__lte=today, end_date__gte=today
            ).count(),
            "pending_leave": LeaveRequest.objects.filter(status=LeaveStatus.IN_REVIEW).count(),
            "contracts_expiring": ContractSerializer(
                Contract.objects.filter(end_date__range=(today, soon)).select_related("employee"),
                many=True,
            ).data,
            "health_expiring": HealthRecordSerializer(
                HealthRecord.objects.filter(expiry_date__range=(today, soon)).select_related("employee"),
                many=True,
            ).data,
        })
