from __future__ import annotations

from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.audit.models import AuditAction
from apps.audit.services import record
from apps.permissions.drf import HasPermission
from apps.permissions.services import has_permission
from apps.validation.engine import ValidationError as FlowError
from apps.validation.engine import get_process, submit_decision

from .models import Request, RequestAttachment, RequestComment, RequestStatus, RequestType
from .serializers import (
    RequestAttachmentSerializer,
    RequestCommentSerializer,
    RequestSerializer,
    RequestTypeSerializer,
)
from .services import cancel_request, submit_request

MANAGE_TYPES = HasPermission.of("requests.manage_types")


def visible_requests(user):
    qs = Request.objects.select_related("type", "requester")
    if user.is_super_admin or has_permission(user, "requests.validate"):
        return qs
    return qs.filter(Q(requester=user) | Q(requester__manager=user)).distinct()


class RequestTypeViewSet(viewsets.ModelViewSet):
    queryset = RequestType.objects.select_related("flow").all()
    serializer_class = RequestTypeSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), MANAGE_TYPES()]


class RequestViewSet(viewsets.ModelViewSet):
    serializer_class = RequestSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["type", "status"]
    search_fields = ["reference", "title"]

    def get_queryset(self):
        return visible_requests(self.request.user).prefetch_related(
            "attachments", "comments__author"
        )

    def perform_create(self, serializer):
        req = serializer.save(requester=self.request.user, status=RequestStatus.DRAFT)
        record(action=AuditAction.CREATE, module="demands", actor=self.request.user,
               target=req, message=f"Brouillon de demande {req.reference}")

    def perform_destroy(self, instance):
        if instance.requester_id != self.request.user.id:
            raise PermissionDenied("Non autorisé.")
        if instance.status not in (RequestStatus.DRAFT, RequestStatus.REJECTED):
            raise ValidationError("Seule une demande en brouillon peut être supprimée.")
        instance.delete()

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        req = self.get_object()
        if req.requester_id != request.user.id:
            raise PermissionDenied("Seul le demandeur peut soumettre.")
        try:
            submit_request(req, actor=request.user)
        except FlowError as exc:
            raise ValidationError(str(exc)) from exc
        return Response(RequestSerializer(req, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        req = self.get_object()
        if req.requester_id != request.user.id and not has_permission(request.user, "requests.validate"):
            raise PermissionDenied("Non autorisé.")
        cancel_request(req, actor=request.user)
        return Response(RequestSerializer(req, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def decide(self, request, pk=None):
        req = self.get_object()
        process = get_process(req)
        if process is None:
            raise ValidationError("Aucun circuit de validation en cours.")
        try:
            submit_decision(
                process, user=request.user,
                decision=request.data.get("decision"),
                comment=request.data.get("comment", ""),
            )
        except FlowError as exc:
            raise PermissionDenied(str(exc)) from exc
        req.refresh_from_db()
        return Response(RequestSerializer(req, context={"request": request}).data)

    @action(detail=False, methods=["get"])
    def mine(self, request):
        qs = Request.objects.filter(requester=request.user).select_related("type")
        return Response(RequestSerializer(qs, many=True, context={"request": request}).data)

    @action(detail=False, methods=["get"], url_path="to-validate")
    def to_validate(self, request):
        pending = Request.objects.filter(status=RequestStatus.IN_REVIEW).select_related(
            "type", "requester"
        )
        result = []
        for req in pending:
            process = get_process(req)
            if process and process.current_step:
                approver = process.current_step.resolve_approver(process.subject_user)
                if approver and approver.pk == request.user.pk:
                    result.append(req)
        return Response(RequestSerializer(result, many=True, context={"request": request}).data)


class RequestAttachmentViewSet(viewsets.ModelViewSet):
    queryset = RequestAttachment.objects.select_related("request").all()
    serializer_class = RequestAttachmentSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["request"]

    def perform_create(self, serializer):
        req = serializer.validated_data["request"]
        if req.requester_id != self.request.user.id:
            raise PermissionDenied("Non autorisé.")
        serializer.save(uploaded_by=self.request.user)


class RequestCommentViewSet(viewsets.ModelViewSet):
    serializer_class = RequestCommentSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["request"]

    def get_queryset(self):
        return RequestComment.objects.filter(
            request__in=visible_requests(self.request.user)
        ).select_related("author")

    def perform_create(self, serializer):
        from apps.notifications.services import notify

        comment = serializer.save(author=self.request.user)
        req = comment.request
        targets = {req.requester_id}
        process = get_process(req)
        if process and process.current_step:
            approver = process.current_step.resolve_approver(process.subject_user)
            if approver:
                targets.add(approver.id)
        targets.discard(self.request.user.id)
        from apps.accounts.models import User

        for uid in targets:
            notify(User.objects.get(id=uid), title="Commentaire sur une demande",
                   body=f"{req.reference} : {comment.body[:120]}",
                   url=f"/requests/{req.id}", type="request")
