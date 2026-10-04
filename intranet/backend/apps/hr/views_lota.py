"""Vues Phase 7 Lot A : onboarding / offboarding / évaluations."""
from __future__ import annotations

from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.permissions.drf import HasPermission
from apps.permissions.services import has_permission

from .evaluation import (
    acknowledge,
    close_campaign,
    finalize,
    open_campaign,
    submit_manager_assessment,
    submit_self_assessment,
)
from .lifecycle import start_lifecycle, toggle_item
from .models import (
    Employee,
    Evaluation,
    EvaluationCampaign,
    EvaluationForm,
    LifecycleItem,
    LifecycleProcess,
    LifecycleTemplate,
)
from .serializers import (
    EvaluationCampaignSerializer,
    EvaluationFormSerializer,
    EvaluationSerializer,
    LifecycleItemSerializer,
    LifecycleProcessSerializer,
    LifecycleTemplateSerializer,
)

HR_MANAGE = HasPermission.of("hr.manage")


class LifecycleTemplateViewSet(viewsets.ModelViewSet):
    queryset = LifecycleTemplate.objects.prefetch_related("items").all()
    serializer_class = LifecycleTemplateSerializer
    filterset_fields = ["kind"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated(), HasPermission.of("hr.view")()]
        return [IsAuthenticated(), HR_MANAGE()]


class LifecycleProcessViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LifecycleProcessSerializer
    filterset_fields = ["kind", "status", "employee"]

    def get_queryset(self):
        user = self.request.user
        qs = LifecycleProcess.objects.select_related("employee__user").prefetch_related(
            "items__responsible"
        )
        if user.is_super_admin or has_permission(user, "hr.view"):
            return qs
        return qs.filter(
            Q(employee__user=user) | Q(employee__user__manager=user) | Q(items__responsible=user)
        ).distinct()

    @action(detail=False, methods=["post"])
    def start(self, request):
        if not has_permission(request.user, "hr.manage"):
            raise PermissionDenied("Permission « hr.manage » requise.")
        employee = Employee.objects.filter(pk=request.data.get("employee")).first()
        if not employee:
            raise ValidationError("Employé introuvable.")
        kind = request.data.get("kind")
        if kind not in ("onboarding", "offboarding"):
            raise ValidationError("kind = onboarding | offboarding.")
        template = LifecycleTemplate.objects.filter(pk=request.data.get("template")).first()
        process = start_lifecycle(employee=employee, kind=kind, actor=request.user, template=template,
                                  reference_date=request.data.get("reference_date") or None)
        return Response(LifecycleProcessSerializer(process).data, status=201)


class LifecycleItemViewSet(viewsets.GenericViewSet):
    serializer_class = LifecycleItemSerializer

    def get_queryset(self):
        user = self.request.user
        qs = LifecycleItem.objects.select_related("process__employee__user")
        if user.is_super_admin or has_permission(user, "hr.view"):
            return qs
        return qs.filter(
            Q(responsible=user) | Q(process__employee__user=user)
            | Q(process__employee__user__manager=user)
        )

    @action(detail=True, methods=["post"])
    def toggle(self, request, pk=None):
        item = self.get_queryset().filter(pk=pk).first()
        if not item:
            raise PermissionDenied("Élément introuvable ou hors de votre périmètre.")
        toggle_item(item, actor=request.user, done=bool(request.data.get("done", True)),
                    notes=request.data.get("notes", ""))
        return Response(LifecycleProcessSerializer(
            LifecycleProcess.objects.get(pk=item.process_id)
        ).data)


class EvaluationFormViewSet(viewsets.ModelViewSet):
    queryset = EvaluationForm.objects.prefetch_related("questions").all()
    serializer_class = EvaluationFormSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), HR_MANAGE()]


class EvaluationCampaignViewSet(viewsets.ModelViewSet):
    queryset = EvaluationCampaign.objects.select_related("form").all()
    serializer_class = EvaluationCampaignSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated(), HasPermission.of("hr.view")()]
        return [IsAuthenticated(), HR_MANAGE()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def open(self, request, pk=None):
        return Response(EvaluationCampaignSerializer(
            open_campaign(self.get_object(), actor=request.user)
        ).data)

    @action(detail=True, methods=["post"], url_path="close")
    def close(self, request, pk=None):
        return Response(EvaluationCampaignSerializer(
            close_campaign(self.get_object(), actor=request.user)
        ).data)


class EvaluationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EvaluationSerializer
    filterset_fields = ["campaign", "status", "employee"]

    def get_queryset(self):
        user = self.request.user
        qs = Evaluation.objects.select_related("campaign__form", "employee__user").prefetch_related(
            "answers__question"
        )
        if user.is_super_admin or has_permission(user, "hr.manage"):
            return qs
        return qs.filter(Q(employee__user=user) | Q(evaluator=user)).distinct()

    def _get(self, pk):
        obj = self.get_queryset().filter(pk=pk).first()
        if not obj:
            raise PermissionDenied("Évaluation introuvable ou hors de votre périmètre.")
        return obj

    @action(detail=False, methods=["get"])
    def mine(self, request):
        qs = Evaluation.objects.filter(employee__user=request.user).select_related("campaign")
        return Response(EvaluationSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"], url_path="to-evaluate")
    def to_evaluate(self, request):
        qs = Evaluation.objects.filter(
            evaluator=request.user, status=Evaluation.Status.SELF_ASSESSED
        ).select_related("campaign", "employee__user")
        return Response(EvaluationSerializer(qs, many=True).data)

    @action(detail=True, methods=["post"], url_path="self-assess")
    def self_assess(self, request, pk=None):
        ev = submit_self_assessment(self._get(pk), user=request.user,
                                    answers=request.data.get("answers", {}),
                                    comment=request.data.get("comment", ""))
        return Response(EvaluationSerializer(ev).data)

    @action(detail=True, methods=["post"], url_path="manager-assess")
    def manager_assess(self, request, pk=None):
        ev = submit_manager_assessment(self._get(pk), user=request.user,
                                       answers=request.data.get("answers", {}),
                                       comment=request.data.get("comment", ""))
        return Response(EvaluationSerializer(ev).data)

    @action(detail=True, methods=["post"])
    def acknowledge(self, request, pk=None):
        ev = acknowledge(self._get(pk), user=request.user, comment=request.data.get("comment", ""))
        return Response(EvaluationSerializer(ev).data)

    @action(detail=True, methods=["post"])
    def finalize(self, request, pk=None):
        ev = finalize(self._get(pk), user=request.user)
        return Response(EvaluationSerializer(ev).data)
