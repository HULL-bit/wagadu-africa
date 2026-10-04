from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated

from apps.audit.models import AuditAction
from apps.audit.services import record
from apps.permissions.drf import HasPermission

from .models import ApprovalProcess, ValidationFlow, ValidationStep
from .serializers import (
    ApprovalProcessSerializer,
    ValidationFlowSerializer,
    ValidationStepSerializer,
)

MANAGE = HasPermission.of("platform.manage_validation_flows")


class ValidationFlowViewSet(viewsets.ModelViewSet):
    queryset = ValidationFlow.objects.prefetch_related("steps").all()
    serializer_class = ValidationFlowSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), MANAGE()]

    def perform_create(self, serializer):
        flow = serializer.save()
        record(action=AuditAction.CREATE, module="validation", actor=self.request.user,
               target=flow, message=f"Création du circuit {flow.code}", request=self.request)

    def perform_update(self, serializer):
        flow = serializer.save()
        record(action=AuditAction.UPDATE, module="validation", actor=self.request.user,
               target=flow, message=f"Modification du circuit {flow.code}", request=self.request)


class ValidationStepViewSet(viewsets.ModelViewSet):
    queryset = ValidationStep.objects.select_related("flow").all()
    serializer_class = ValidationStepSerializer
    filterset_fields = ["flow"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), MANAGE()]


class ApprovalProcessViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    serializer_class = ApprovalProcessSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "flow", "subject_user"]

    def get_queryset(self):
        qs = ApprovalProcess.objects.select_related("flow", "current_step").prefetch_related(
            "decisions"
        )
        user = self.request.user
        if user.is_super_admin:
            return qs
        # Un utilisateur voit les processus qui le concernent ou qu'il doit valider.
        return qs.filter(subject_user=user) | qs.filter(
            current_step__isnull=False
        ).filter(subject_user__manager=user)
