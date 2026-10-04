from __future__ import annotations

from django.db.models import Count, F, Q
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import User
from apps.audit.models import AuditAction
from apps.audit.services import record
from apps.permissions.drf import HasPermission
from apps.permissions.services import has_permission

from .models import (
    ChecklistItem,
    RecurringTaskTemplate,
    Task,
    TaskAttachment,
    TaskComment,
    TaskLabel,
    TaskStatus,
    TaskSubmissionAttachment,
)
from .serializers import (
    ChecklistItemSerializer,
    RecurringTaskTemplateSerializer,
    SubmissionAttachmentSerializer,
    TaskAttachmentSerializer,
    TaskCommentSerializer,
    TaskLabelSerializer,
    TaskSerializer,
    TaskWriteSerializer,
)
from .services import (
    create_task,
    duplicate_task,
    review_submission,
    set_assignees,
    set_progress,
    set_task_status,
    submit_task,
)

ASSIGN = HasPermission.of("tasks.assign")
OVERSEE = HasPermission.of("tasks.oversee")


def visible_tasks(user):
    qs = Task.objects.select_related("created_by").prefetch_related(
        "assignments__user", "labels", "checklist", "attachments",
        "comments__author", "submissions__attachments", "subtasks",
    )
    if user.is_super_admin or has_permission(user, "tasks.oversee"):
        return qs
    return qs.filter(
        Q(assignments__user=user)
        | Q(created_by=user)
        | Q(assignments__user__manager=user)
    ).distinct()


class TaskViewSet(viewsets.ModelViewSet):
    filterset_fields = ["status", "priority", "assigned_department", "assigned_team", "parent", "project"]
    search_fields = ["title", "description"]
    ordering_fields = ["due_at", "created_at", "priority"]

    def get_queryset(self):
        qs = visible_tasks(self.request.user)
        params = self.request.query_params
        if params.get("assignee"):
            qs = qs.filter(assignments__user_id=params["assignee"])
        if params.get("label"):
            qs = qs.filter(labels__id=params["label"])
        if params.get("overdue") == "true":
            qs = qs.filter(due_at__lt=timezone.now()).exclude(status=TaskStatus.DONE)
        return qs.distinct()

    def get_serializer_class(self):
        return TaskWriteSerializer if self.action in ("create", "update", "partial_update") else TaskSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy",
                           "assign", "set_status", "decide", "duplicate"):
            return [IsAuthenticated(), ASSIGN()]
        return [IsAuthenticated()]

    def _notify_project(self, task, verb):
        if task.project_id:
            from apps.projects.services import notify_project
            notify_project(task.project, actor=self.request.user,
                           title=f"{task.project.name} : tâche {verb}", body=task.title)

    def perform_update(self, serializer):
        task = serializer.save()
        self._notify_project(task, "modifiée")

    def create(self, request, *args, **kwargs):
        serializer = TaskWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        v = serializer.validated_data
        assignee_ids = v.pop("assignee_ids", [])
        label_ids = v.pop("label_ids", [])
        team = v.pop("assigned_team", None)
        department = v.pop("assigned_department", None)
        task = create_task(
            data={**v, "assigned_team": team, "assigned_department": department},
            actor=request.user,
            assignee_users=list(User.objects.filter(id__in=assignee_ids)),
            team=team, department=department, label_ids=label_ids,
        )
        self._notify_project(task, "ajoutée")
        return Response(TaskSerializer(task).data, status=201)

    def perform_destroy(self, instance):
        u = self.request.user
        if (instance.created_by_id != u.id and not u.is_super_admin
                and not has_permission(u, "tasks.assign")):
            raise PermissionDenied("Seul le créateur ou un responsable peut supprimer la tâche.")
        self._notify_project(instance, "supprimée")
        record(action=AuditAction.DELETE, module="tasks", actor=u,
               target=instance, target_repr=instance.title, message="Suppression de la tâche")
        instance.delete()

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        task = self.get_object()
        set_assignees(
            task, actor=request.user,
            add_user_ids=request.data.get("add", []),
            remove_user_ids=request.data.get("remove", []),
        )
        return Response(TaskSerializer(self.get_queryset().get(pk=task.pk)).data)

    @action(detail=True, methods=["post"], url_path="status")
    def set_status(self, request, pk=None):
        task = self.get_object()
        set_task_status(task, actor=request.user, status=request.data.get("status"))
        return Response(TaskSerializer(self.get_queryset().get(pk=task.pk)).data)

    @action(detail=True, methods=["post"])
    def progress(self, request, pk=None):
        task = self.get_object()
        set_progress(task, user=request.user, progress=request.data.get("progress"))
        return Response(TaskSerializer(self.get_queryset().get(pk=task.pk)).data)

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        task = self.get_object()
        submit_task(
            task, user=request.user,
            report=request.data.get("report", ""),
            declared_hours=request.data.get("declared_hours"),
        )
        return Response(TaskSerializer(self.get_queryset().get(pk=task.pk)).data)

    @action(detail=True, methods=["post"])
    def decide(self, request, pk=None):
        task = self.get_object()
        review_submission(
            task, reviewer=request.user,
            target_user_id=request.data.get("user"),
            decision=request.data.get("decision"),
            comment=request.data.get("comment", ""),
        )
        return Response(TaskSerializer(self.get_queryset().get(pk=task.pk)).data)

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        clone = duplicate_task(self.get_object(), actor=request.user)
        return Response(TaskSerializer(clone).data, status=201)

    @action(detail=False, methods=["get"])
    def mine(self, request):
        qs = Task.objects.filter(assignments__user=request.user).prefetch_related(
            "assignments__user", "labels"
        ).distinct()
        scope = request.query_params.get("scope")
        if scope == "week":
            end = timezone.now() + timezone.timedelta(days=7)
            qs = qs.filter(due_at__lte=end).exclude(status=TaskStatus.DONE)
        elif scope == "current":
            # Semaine en cours : tâches ouvertes + celles bouclées cette semaine.
            # Une fois la semaine passée, les tâches terminées basculent dans l'historique.
            monday = (timezone.now() - timezone.timedelta(days=timezone.now().weekday())).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            qs = qs.filter(
                ~Q(status=TaskStatus.DONE) | Q(closed_at__gte=monday)
            )
        return Response(TaskSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def history(self, request):
        """Historique des tâches regroupé par semaine, mois ou semestre.

        ?granularity=week|month|semester  ?scope=mine|team
        """
        import datetime as _dt

        gran = request.query_params.get("granularity", "month")
        scope = request.query_params.get("scope", "mine")
        can_team = (
            request.user.is_super_admin
            or has_permission(request.user, "tasks.oversee")
            or has_permission(request.user, "tasks.assign")
        )
        if scope == "team" and can_team:
            qs = visible_tasks(request.user)
        else:
            scope = "mine"
            qs = Task.objects.filter(assignments__user=request.user).prefetch_related(
                "assignments__user", "labels"
            )
        qs = qs.distinct()

        MONTHS = ["", "janvier", "février", "mars", "avril", "mai", "juin", "juillet",
                  "août", "septembre", "octobre", "novembre", "décembre"]

        def ref_date(task) -> _dt.date:
            moment = task.closed_at or task.due_at or task.created_at
            return timezone.localtime(moment).date()

        def key_of(d: _dt.date):
            if gran == "week":
                iso = d.isocalendar()
                return (iso[0], iso[1], 0)
            if gran == "semester":
                return (d.year, 1 if d.month <= 6 else 2, 0)
            return (d.year, d.month, 0)

        def label_of(k):
            if gran == "week":
                return f"Semaine {k[1]} — {k[0]}"
            if gran == "semester":
                return f"{'1er' if k[1] == 1 else '2e'} semestre {k[0]}"
            return f"{MONTHS[k[1]].capitalize()} {k[0]}"

        buckets: dict = {}
        for task in qs:
            buckets.setdefault(key_of(ref_date(task)), []).append(task)

        periods = []
        for k in sorted(buckets, reverse=True)[:10]:
            tasks = buckets[k]
            done = [t for t in tasks if t.status == TaskStatus.DONE]
            on_time = sum(
                1 for t in done
                if not t.due_at or (t.closed_at and t.closed_at <= t.due_at)
            )
            tasks.sort(key=lambda t: (t.status != TaskStatus.DONE, t.closed_at or t.due_at or t.created_at))
            periods.append({
                "key": f"{k[0]}-{k[1]}",
                "label": label_of(k),
                "total": len(tasks),
                "done": len(done),
                "on_time": on_time,
                "late": len(done) - on_time,
                "tasks": TaskSerializer(tasks, many=True).data,
            })
        return Response({"granularity": gran, "scope": scope, "periods": periods})

    @action(detail=False, methods=["get"])
    def board(self, request):
        qs = self.get_queryset()
        if request.query_params.get("assignee"):
            qs = qs.filter(assignments__user_id=request.query_params["assignee"])
        columns = {s: [] for s in TaskStatus.values}
        for task in qs:
            columns[task.status].append(TaskSerializer(task).data)
        return Response(columns)

    @action(detail=False, methods=["get"])
    def performance(self, request):
        if not (request.user.is_super_admin or has_permission(request.user, "tasks.oversee")
                or has_permission(request.user, "tasks.assign")):
            raise PermissionDenied("Accès réservé aux responsables.")
        base = visible_tasks(request.user).filter(status=TaskStatus.DONE, closed_at__isnull=False)
        on_time = base.filter(Q(due_at__isnull=True) | Q(closed_at__lte=F("due_at"))).count()
        late = base.count() - on_time
        per_user = list(
            Task.objects.filter(assignments__user__isnull=False)
            .values("assignments__user__email")
            .annotate(
                total=Count("id", distinct=True),
                done=Count("id", filter=Q(status=TaskStatus.DONE), distinct=True),
            )
            .order_by("-total")[:20]
        )
        return Response({
            "completed": base.count(),
            "on_time": on_time,
            "late": late,
            "open_overdue": visible_tasks(request.user).filter(
                due_at__lt=timezone.now()
            ).exclude(status=TaskStatus.DONE).count(),
            "per_user": per_user,
        })


class TaskCommentViewSet(viewsets.ModelViewSet):
    serializer_class = TaskCommentSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["task"]

    def get_queryset(self):
        return TaskComment.objects.select_related("author").filter(
            task__in=visible_tasks(self.request.user)
        )

    def perform_create(self, serializer):
        comment = serializer.save(author=self.request.user)
        task = comment.task
        record(action=AuditAction.CREATE, module="tasks", actor=self.request.user,
               target=task, message="Commentaire ajouté")
        recipients = {a.user_id for a in task.assignments.all()} | {task.created_by_id}
        recipients.discard(self.request.user.id)
        from apps.notifications.services import notify

        for uid in recipients:
            notify(User.objects.get(id=uid), title="Nouveau commentaire",
                   body=f"« {task.title} » : {comment.body[:120]}",
                   url=f"/tasks/{task.id}", type="task")


class ChecklistItemViewSet(viewsets.ModelViewSet):
    serializer_class = ChecklistItemSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["task"]

    def get_queryset(self):
        return ChecklistItem.objects.filter(task__in=visible_tasks(self.request.user))

    def perform_update(self, serializer):
        item = serializer.save()
        if "is_done" in serializer.validated_data:
            item.done_by = self.request.user if item.is_done else None
            item.done_at = timezone.now() if item.is_done else None
            item.save(update_fields=["done_by", "done_at"])


class TaskLabelViewSet(viewsets.ModelViewSet):
    queryset = TaskLabel.objects.all()
    serializer_class = TaskLabelSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), ASSIGN()]


class TaskAttachmentViewSet(viewsets.ModelViewSet):
    serializer_class = TaskAttachmentSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["task"]

    def get_queryset(self):
        return TaskAttachment.objects.filter(task__in=visible_tasks(self.request.user))

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class SubmissionAttachmentViewSet(viewsets.ModelViewSet):
    serializer_class = SubmissionAttachmentSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["submission"]

    def get_queryset(self):
        return TaskSubmissionAttachment.objects.filter(
            submission__task__in=visible_tasks(self.request.user)
        )

    def perform_create(self, serializer):
        submission = serializer.validated_data["submission"]
        if submission.submitted_by_id != self.request.user.id:
            raise PermissionDenied("Vous ne pouvez joindre un fichier qu'à votre propre soumission.")
        serializer.save()


class RecurringTaskTemplateViewSet(viewsets.ModelViewSet):
    queryset = RecurringTaskTemplate.objects.prefetch_related("default_assignees").all()
    serializer_class = RecurringTaskTemplateSerializer
    permission_classes = [IsAuthenticated, ASSIGN]

    def perform_create(self, serializer):
        template = serializer.save(created_by=self.request.user)
        record(action=AuditAction.CREATE, module="tasks", actor=self.request.user,
               target=template, message=f"Modèle de tâche récurrente « {template.title} »")

    @action(detail=True, methods=["post"])
    def generate_now(self, request, pk=None):
        from .services import generate_task_from_template

        task = generate_task_from_template(self.get_object())
        return Response(TaskSerializer(task).data if task else {}, status=201 if task else 400)
