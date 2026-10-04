from __future__ import annotations

from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.audit.models import AuditAction
from apps.audit.services import record
from apps.permissions.drf import HasPermission

from .models import Indicator, Milestone, ProgressUpdate, Project, ProjectDocument
from .serializers import (
    IndicatorSerializer,
    MilestoneSerializer,
    ProgressUpdateSerializer,
    ProjectDetailSerializer,
    ProjectDocumentSerializer,
    ProjectListSerializer,
    ProjectWriteSerializer,
)
from .services import notify_project

VIEW = HasPermission.of("projects.view")
MANAGE = HasPermission.of("projects.manage")


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.select_related("lead", "department", "created_by")
    filterset_fields = ["status", "department", "lead"]
    search_fields = ["code", "name", "summary", "donor", "location"]
    ordering_fields = ["updated_at", "start_date", "end_date", "name"]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ProjectWriteSerializer
        if self.action == "retrieve":
            return ProjectDetailSerializer
        return ProjectListSerializer

    def get_queryset(self):
        qs = self.queryset
        if self.action == "retrieve":
            qs = qs.prefetch_related(
                "milestones", "indicators", "updates__author", "members",
                "project_documents__document__current_version", "project_documents__added_by",
                "tasks__assignments__user",
            )
        if self.request.query_params.get("mine") == "1":
            u = self.request.user
            qs = qs.filter(Q(lead=u) | Q(members=u)).distinct()
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated(), VIEW()]
        return [IsAuthenticated(), MANAGE()]

    def perform_create(self, serializer):
        project = serializer.save(created_by=self.request.user)
        if project.lead_id:
            project.members.add(project.lead)
        record(action=AuditAction.CREATE, module="projects", actor=self.request.user,
               target=project, message=f"Création du projet {project.code}", request=self.request)
        notify_project(project, actor=self.request.user,
                       title=f"Nouveau projet : {project.name}",
                       body=f"Vous êtes associé au projet {project.code}.")

    def perform_update(self, serializer):
        project = serializer.save()
        record(action=AuditAction.UPDATE, module="projects", actor=self.request.user,
               target=project, message=f"Mise à jour du projet {project.code}", request=self.request)
        notify_project(project, actor=self.request.user,
                       title=f"Projet mis à jour : {project.name}")

    def perform_destroy(self, instance):
        record(action=AuditAction.DELETE, module="projects", actor=self.request.user,
               target=instance, target_repr=str(instance),
               message=f"Suppression du projet {instance.code}", request=self.request)
        instance.delete()

    def _fresh(self, pk):
        return self.get_queryset().prefetch_related(
            "milestones", "indicators", "updates__author", "members"
        ).get(pk=pk)

    @action(detail=True, methods=["post"], url_path="set-status")
    def set_status(self, request, pk=None):
        project = self.get_object()
        new = request.data.get("status")
        valid = {c for c, _ in Project._meta.get_field("status").choices}
        if new not in valid:
            return Response({"status": ["Statut inconnu."]}, status=400)
        project.status = new
        project.save(update_fields=["status", "updated_at"])
        record(action=AuditAction.UPDATE, module="projects", actor=request.user, target=project,
               message=f"Projet {project.code} → {project.get_status_display()}", request=request)
        notify_project(project, actor=request.user,
                       title=f"{project.name} : statut « {project.get_status_display()} »")
        return Response(ProjectDetailSerializer(self._fresh(project.pk), context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def updates(self, request, pk=None):
        project = self.get_object()
        serializer = ProgressUpdateSerializer(data={**request.data, "project": project.pk})
        serializer.is_valid(raise_exception=True)
        serializer.save(author=request.user, project=project)
        notify_project(project, actor=request.user,
                       title=f"{project.name} : nouveau point de suivi",
                       body=(serializer.validated_data.get("body") or "")[:160])
        return Response(
            ProjectDetailSerializer(self._fresh(project.pk), context={"request": request}).data,
            status=201,
        )

    @action(detail=True, methods=["get", "post"], url_path="documents")
    def documents(self, request, pk=None):
        project = self.get_object()
        if request.method == "GET":
            qs = project.project_documents.select_related("document", "added_by")
            return Response(ProjectDocumentSerializer(qs, many=True).data)

        upload = request.FILES.get("file")
        if not upload:
            return Response({"file": ["Fichier requis."]}, status=400)

        from apps.documents.services import create_document

        doc = create_document(
            data={
                "title": (request.data.get("title") or upload.name)[:200],
                "visibility": "restricted",
                "keywords": f"projet, {project.code}",
            },
            file=upload,
            actor=request.user,
            note=f"Document projet {project.code}",
        )
        link = ProjectDocument.objects.create(project=project, document=doc, added_by=request.user)
        record(action=AuditAction.CREATE, module="projects", actor=request.user, target=project,
               message=f"Document ajouté au projet {project.code} : {doc.title}", request=request)
        notify_project(project, actor=request.user,
                       title=f"{project.name} : nouveau document",
                       body=doc.title)
        return Response(ProjectDocumentSerializer(link).data, status=201)


class _ProjectChildViewSet(viewsets.ModelViewSet):
    filterset_fields = ["project"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated(), VIEW()]
        return [IsAuthenticated(), MANAGE()]


class MilestoneViewSet(_ProjectChildViewSet):
    queryset = Milestone.objects.select_related("project")
    serializer_class = MilestoneSerializer

    def perform_update(self, serializer):
        was_done = serializer.instance.status == Milestone.Status.DONE
        milestone = serializer.save()
        if milestone.status == Milestone.Status.DONE and not milestone.completed_at:
            milestone.completed_at = timezone.now().date()
            milestone.save(update_fields=["completed_at"])
        elif milestone.status != Milestone.Status.DONE and milestone.completed_at:
            milestone.completed_at = None
            milestone.save(update_fields=["completed_at"])
        if milestone.status == Milestone.Status.DONE and not was_done:
            notify_project(milestone.project, actor=self.request.user,
                           title=f"{milestone.project.name} : jalon atteint",
                           body=milestone.title)


class ProjectDocumentViewSet(viewsets.ModelViewSet):
    queryset = ProjectDocument.objects.select_related("project", "document", "added_by")
    serializer_class = ProjectDocumentSerializer
    filterset_fields = ["project"]
    http_method_names = ["get", "delete", "head", "options"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated(), VIEW()]
        return [IsAuthenticated(), MANAGE()]

    def perform_destroy(self, instance):
        instance.document.deleted_at = timezone.now()
        instance.document.deleted_by = self.request.user
        instance.document.save(update_fields=["deleted_at", "deleted_by"])
        instance.delete()


class IndicatorViewSet(_ProjectChildViewSet):
    queryset = Indicator.objects.select_related("project")
    serializer_class = IndicatorSerializer


class ProgressUpdateViewSet(_ProjectChildViewSet):
    queryset = ProgressUpdate.objects.select_related("project", "author")
    serializer_class = ProgressUpdateSerializer

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
