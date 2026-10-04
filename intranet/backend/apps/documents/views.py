from __future__ import annotations

from django.http import FileResponse, Http404
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import AuditAction
from apps.audit.services import record
from apps.permissions.drf import HasPermission
from apps.permissions.services import has_permission

from .models import (
    Document,
    DocumentDistribution,
    DocumentRecipient,
    DocumentVisibilityRule,
    Folder,
    ShareLink,
)
from .serializers import (
    DocumentDistributionSerializer,
    DocumentSerializer,
    FolderSerializer,
    ReceivedDocumentSerializer,
    ShareLinkSerializer,
)
from .services import (
    add_version,
    create_document,
    distribute_document,
    mark_document_read,
    remind_unread,
    search_documents,
)

MANAGE_LIBRARY = HasPermission.of("documents.manage_library")
SEND = HasPermission.of("documents.send")


class FolderViewSet(viewsets.ModelViewSet):
    queryset = Folder.objects.all()
    serializer_class = FolderSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated(), HasPermission.of("documents.view")()]
        return [IsAuthenticated(), MANAGE_LIBRARY()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    filterset_fields = ["folder", "is_in_library", "visibility"]
    ordering_fields = ["updated_at", "created_at", "title"]

    def get_permissions(self):
        if self.action in ("create",):
            return [IsAuthenticated(), HasPermission.of("documents.view")()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        params = self.request.query_params
        base = Document.objects.select_related("folder", "owner", "current_version").prefetch_related(
            "versions", "visibility_rules"
        )
        scoped = base.trashed() if params.get("trashed") == "true" else base.live()
        qs = scoped.visible_to(user)
        if params.get("mine") == "true":
            qs = qs.filter(owner=user)
        if params.get("library") == "true":
            qs = qs.filter(is_in_library=True)
        if params.get("search"):
            qs = search_documents(qs, params["search"])
        return qs

    def _guard_manage(self, document: Document):
        u = self.request.user
        if document.owner_id == u.id or u.is_super_admin or has_permission(u, "documents.manage_library"):
            return
        raise PermissionDenied("Vous ne pouvez pas modifier ce document.")

    def create(self, request, *args, **kwargs):
        file = request.FILES.get("file")
        if not file:
            raise ValidationError("Fichier requis (champ « file »).")
        is_library = str(request.data.get("is_in_library", "false")).lower() == "true"
        if is_library and not has_permission(request.user, "documents.manage_library"):
            raise PermissionDenied("Permission « documents.manage_library » requise pour la bibliothèque.")
        document = create_document(
            data={
                "title": request.data.get("title") or file.name,
                "description": request.data.get("description", ""),
                "keywords": request.data.get("keywords", ""),
                "folder_id": request.data.get("folder") or None,
                "is_in_library": is_library,
                "visibility": request.data.get("visibility", "public"),
            },
            file=file, actor=request.user, note=request.data.get("note", ""),
        )
        return Response(DocumentSerializer(document).data, status=201)

    def perform_update(self, serializer):
        self._guard_manage(self.get_object())
        serializer.save()

    def perform_destroy(self, instance):
        self._guard_manage(instance)
        instance.soft_delete(self.request.user)
        record(action=AuditAction.DELETE, module="documents", actor=self.request.user,
               target=instance, target_repr=instance.title, message="Document mis à la corbeille")

    def _fresh(self, pk):
        return Document.objects.select_related(
            "folder", "owner", "current_version"
        ).prefetch_related("versions", "visibility_rules").get(pk=pk)

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        document = Document.objects.filter(pk=pk).first()
        if not document:
            raise Http404
        self._guard_manage(document)
        document.restore()
        record(action=AuditAction.UPDATE, module="documents", actor=request.user,
               target=document, message="Document restauré depuis la corbeille")
        return Response(DocumentSerializer(self._fresh(pk)).data)

    @action(detail=True, methods=["post"])
    def versions(self, request, pk=None):
        document = self.get_object()
        self._guard_manage(document)
        file = request.FILES.get("file")
        if not file:
            raise ValidationError("Fichier requis.")
        add_version(document, file=file, actor=request.user, note=request.data.get("note", ""))
        return Response(DocumentSerializer(self._fresh(pk)).data, status=201)

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        document = self.get_object()
        version = document.current_version
        vnum = request.query_params.get("version")
        if vnum:
            version = document.versions.filter(version_number=vnum).first()
        if not version:
            raise Http404
        mark_document_read(document, user=request.user)
        record(action=AuditAction.EXPORT, module="documents", actor=request.user,
               target=document, message=f"Téléchargement v{version.version_number}")
        return FileResponse(version.file.open("rb"), as_attachment=True,
                            filename=version.original_filename or version.file.name)

    @action(detail=True, methods=["get"])
    def preview(self, request, pk=None):
        document = self.get_object()
        version = document.current_version
        if not version:
            raise Http404
        mark_document_read(document, user=request.user)
        return FileResponse(version.file.open("rb"), as_attachment=False,
                            filename=version.original_filename or version.file.name)

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        mark_document_read(self.get_object(), user=request.user)
        return Response({"detail": "Marqué comme lu."})

    @action(detail=True, methods=["post"])
    def sign(self, request, pk=None):
        from .models import DocumentSignature

        document = self.get_object()
        version = document.current_version
        if not version:
            raise ValidationError("Aucune version à signer.")
        xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
        ip = xff.split(",")[0].strip() if xff else request.META.get("REMOTE_ADDR")
        sig, created = DocumentSignature.objects.get_or_create(
            document=document, version=version, signer=request.user,
            defaults={"statement": request.data.get("statement", "Lu et approuvé"), "ip_address": ip},
        )
        if created:
            mark_document_read(document, user=request.user)
            record(action=AuditAction.VALIDATE, module="documents", actor=request.user,
                   target=document, message=f"Signature simple v{version.version_number}",
                   request=request)
        return Response(DocumentSerializer(self._fresh(document.pk)).data)

    @action(detail=True, methods=["put"])
    def visibility(self, request, pk=None):
        document = self.get_object()
        self._guard_manage(document)
        rules = request.data.get("rules", [])
        document.visibility = request.data.get("visibility", document.visibility)
        document.save(update_fields=["visibility"])
        DocumentVisibilityRule.objects.filter(document=document).delete()
        for r in rules:
            DocumentVisibilityRule.objects.create(
                document=document, subject_type=r["subject_type"], subject_id=str(r["subject_id"])
            )
        record(action=AuditAction.UPDATE, module="documents", actor=request.user,
               target=document, message="Modification des règles de visibilité")
        return Response(DocumentSerializer(self._fresh(document.pk)).data)

    @action(detail=True, methods=["post"])
    def distribute(self, request, pk=None):
        if not has_permission(request.user, "documents.send"):
            raise PermissionDenied("Permission « documents.send » requise.")
        document = self.get_object()
        mode = request.data.get("mode", "user")
        if mode == "broadcast" and not has_permission(request.user, "documents.broadcast"):
            raise PermissionDenied("Permission « documents.broadcast » requise.")
        distribution = distribute_document(
            document, actor=request.user, mode=mode,
            user_ids=request.data.get("user_ids", []),
            message=request.data.get("message", ""),
        )
        return Response(DocumentDistributionSerializer(distribution).data, status=201)

    @action(detail=False, methods=["get"])
    def received(self, request):
        qs = DocumentRecipient.objects.select_related(
            "document", "distribution__sent_by"
        ).filter(user=request.user, document__deleted_at__isnull=True)
        if request.query_params.get("unread") == "true":
            qs = qs.filter(is_read=False)
        return Response(ReceivedDocumentSerializer(qs, many=True).data)

    @action(detail=True, methods=["get", "post"], url_path="share-links")
    def share_links(self, request, pk=None):
        document = self.get_object()
        if request.method == "GET":
            return Response(ShareLinkSerializer(document.share_links.all(), many=True).data)
        if not has_permission(request.user, "documents.share_external"):
            raise PermissionDenied("Permission « documents.share_external » requise.")
        serializer = ShareLinkSerializer(data={
            **request.data,
            "document": document.id,
            "version": request.data.get("version") or (document.current_version_id),
        })
        serializer.is_valid(raise_exception=True)
        link = serializer.save(created_by=request.user)
        record(action=AuditAction.CREATE, module="documents", actor=request.user,
               target=document, message="Création d'un lien de partage externe")
        return Response(ShareLinkSerializer(link).data, status=201)

    @action(detail=True, methods=["post"], url_path="share-links/(?P<link_id>[^/.]+)/revoke")
    def revoke_share_link(self, request, pk=None, link_id=None):
        link = ShareLink.objects.filter(pk=link_id, document_id=pk).first()
        if not link:
            raise Http404
        self._guard_manage(link.document)
        link.is_revoked = True
        link.save(update_fields=["is_revoked"])
        return Response({"detail": "Lien révoqué."})


class DocumentDistributionViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    serializer_class = DocumentDistributionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["document", "mode"]

    def get_queryset(self):
        user = self.request.user
        qs = DocumentDistribution.objects.select_related("document", "sent_by").prefetch_related(
            "recipients__user"
        )
        if user.is_super_admin or has_permission(user, "documents.manage_library"):
            return qs
        return qs.filter(sent_by=user)

    @action(detail=True, methods=["post"])
    def remind(self, request, pk=None):
        distribution = self.get_object()
        if distribution.sent_by_id != request.user.id and not request.user.is_super_admin:
            raise PermissionDenied("Seul l'expéditeur peut relancer.")
        count = remind_unread(distribution, actor=request.user)
        return Response({"reminded": count})


class PublicShareView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def get(self, request, token):
        link = ShareLink.objects.filter(token=token).select_related("document", "version").first()
        if not link or not link.is_active:
            raise Http404
        return Response({
            "title": link.document.title,
            "description": link.document.description,
            "filename": link.version.original_filename,
            "size": link.version.size,
            "password_required": bool(link.password_hash),
            "expires_at": link.expires_at,
        })

    def post(self, request, token):
        link = ShareLink.objects.filter(token=token).select_related("document", "version").first()
        if not link or not link.is_active:
            raise Http404
        if not link.check_password(request.data.get("password")):
            raise PermissionDenied("Mot de passe incorrect.")
        link.download_count += 1
        link.save(update_fields=["download_count"])
        record(action=AuditAction.EXPORT, module="documents", actor=None,
               target=link.document, message=f"Téléchargement externe via lien {token[:8]}…",
               request=request)
        return FileResponse(link.version.file.open("rb"), as_attachment=True,
                            filename=link.version.original_filename or link.version.file.name)
