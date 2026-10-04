from __future__ import annotations

import csv

from django.db.models import Q
from django.http import HttpResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.audit.models import AuditAction
from apps.audit.services import record
from apps.organization.models import Department
from apps.permissions.drf import HasPermission
from apps.permissions.services import has_permission

from .models import (
    Mail,
    MailAttachment,
    MailCategory,
    MailStatus,
    MailTemplate,
)
from .serializers import (
    MailAttachmentSerializer,
    MailCategorySerializer,
    MailCreateSerializer,
    MailSerializer,
    MailTemplateSerializer,
)
from .services import acknowledge_mail, assign_mail, change_status, log_view, register_mail

MAIL_VIEW = HasPermission.of("mail.view")
MAIL_REGISTER = HasPermission.of("mail.register")
MAIL_ASSIGN = HasPermission.of("mail.assign")


class MailViewSet(viewsets.ModelViewSet):
    queryset = Mail.objects.select_related(
        "category", "registered_by", "assigned_to", "assigned_department"
    ).prefetch_related("attachments", "events__actor", "acknowledgements__user")
    filterset_fields = ["direction", "status", "category", "confidentiality", "assigned_to"]
    search_fields = ["reference", "subject", "correspondent", "body"]
    ordering_fields = ["registered_at", "mail_date", "due_date"]

    def get_serializer_class(self):
        return MailCreateSerializer if self.action == "create" else MailSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve", "register_export", "acknowledge"):
            return [IsAuthenticated(), MAIL_VIEW()]
        if self.action == "create":
            return [IsAuthenticated(), MAIL_REGISTER()]
        if self.action in ("assign", "transfer"):
            return [IsAuthenticated(), MAIL_ASSIGN()]
        if self.action == "set_status":
            return [IsAuthenticated(), HasPermission.of("mail.process")()]
        return [IsAuthenticated(), MAIL_REGISTER()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_super_admin or has_permission(user, "mail.assign"):
            return qs
        # Sans droit d'affectation : courrier enregistré par soi, affecté à soi
        # ou à son département, hors confidentiel non concerné.
        return qs.filter(
            Q(registered_by=user)
            | Q(assigned_to=user)
            | Q(assigned_department_id=user.department_id)
        ).exclude(
            Q(confidentiality="confidential") & ~Q(assigned_to=user) & ~Q(registered_by=user)
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        log_view(instance, actor=request.user)
        # relire pour inclure l'évènement « Consulté » qui vient d'être créé
        fresh = self.get_queryset().get(pk=instance.pk)
        return Response(self.get_serializer(fresh).data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dept_id = serializer.validated_data.pop("register_for_department", None)
        department = Department.objects.filter(pk=dept_id).first() if dept_id else None
        mail = register_mail(
            data=serializer.validated_data, actor=request.user, department=department
        )
        return Response(MailSerializer(mail).data, status=201)

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        return self._assign(request, transfer=False)

    @action(detail=True, methods=["post"])
    def transfer(self, request, pk=None):
        return self._assign(request, transfer=True)

    def _assign(self, request, *, transfer: bool):
        from apps.accounts.models import User

        mail = self.get_object()
        user = User.objects.filter(pk=request.data.get("user")).first() if request.data.get("user") else None
        department = Department.objects.filter(pk=request.data.get("department")).first() if request.data.get("department") else None
        if not user and not department:
            raise ValidationError("Préciser un utilisateur ou un département.")
        assign_mail(mail, actor=request.user, user=user, department=department, transfer=transfer)
        return Response(MailSerializer(self.get_queryset().get(pk=mail.pk)).data)

    @action(detail=True, methods=["post"], url_path="status")
    def set_status(self, request, pk=None):
        mail = self.get_object()
        new_status = request.data.get("status")
        if new_status not in MailStatus.values:
            raise ValidationError("Statut invalide.")
        change_status(mail, actor=request.user, status=new_status)
        return Response(MailSerializer(self.get_queryset().get(pk=mail.pk)).data)

    @action(detail=True, methods=["post"])
    def acknowledge(self, request, pk=None):
        mail = self.get_object()
        acknowledge_mail(mail, actor=request.user)
        fresh = self.get_queryset().get(pk=mail.pk)
        return Response(MailSerializer(fresh).data)

    @action(detail=False, methods=["get"], url_path="export")
    def register_export(self, request):
        if not has_permission(request.user, "mail.export"):
            raise ValidationError("Permission « mail.export » requise.")
        queryset = self.filter_queryset(self.get_queryset())
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="registre-courrier.csv"'
        writer = csv.writer(response)
        writer.writerow(["Référence", "Sens", "Date", "Objet", "Correspondant", "Statut", "Affecté à"])
        for m in queryset.iterator():
            writer.writerow([
                m.reference, m.get_direction_display(), m.mail_date, m.subject,
                m.correspondent, m.get_status_display(),
                m.assigned_to.email if m.assigned_to else "",
            ])
        record(action=AuditAction.EXPORT, module="mail", actor=request.user,
               message="Export du registre du courrier (CSV)", request=request)
        return response


class MailAttachmentViewSet(viewsets.ModelViewSet):
    queryset = MailAttachment.objects.select_related("mail").all()
    serializer_class = MailAttachmentSerializer
    permission_classes = [IsAuthenticated, MAIL_REGISTER]
    filterset_fields = ["mail"]

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class MailCategoryViewSet(viewsets.ModelViewSet):
    queryset = MailCategory.objects.all()
    serializer_class = MailCategorySerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated(), MAIL_VIEW()]
        return [IsAuthenticated(), MAIL_REGISTER()]


class MailTemplateViewSet(viewsets.ModelViewSet):
    queryset = MailTemplate.objects.select_related("category").all()
    serializer_class = MailTemplateSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated(), MAIL_VIEW()]
        return [IsAuthenticated(), HasPermission.of("mail.template.manage")()]
