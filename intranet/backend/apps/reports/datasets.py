"""Définition des jeux de données exportables, par module.

Chaque dataset : la permission requise, l'entête, une fonction produisant les
lignes à partir du `request` (filtres via query params), et si le PDF est permis.
"""
from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from django.utils import timezone


@dataclass
class Dataset:
    key: str
    label: str
    permission: str | None
    headers: list[str]
    rows: Callable
    pdf: bool = False


def _mail_rows(request):
    from apps.correspondence.models import Mail

    qs = Mail.objects.select_related("assigned_to", "category").order_by("-registered_at")
    if request.query_params.get("direction"):
        qs = qs.filter(direction=request.query_params["direction"])
    if request.query_params.get("status"):
        qs = qs.filter(status=request.query_params["status"])
    return [
        [m.reference, m.get_direction_display(), m.mail_date, m.subject, m.correspondent,
         m.get_status_display(), m.assigned_to.email if m.assigned_to else "",
         m.category.name if m.category else ""]
        for m in qs
    ]


def _requests_rows(request):
    from apps.demands.models import Request

    qs = Request.objects.select_related("type", "requester").order_by("-created_at")
    if request.query_params.get("status"):
        qs = qs.filter(status=request.query_params["status"])
    if request.query_params.get("type"):
        qs = qs.filter(type_id=request.query_params["type"])
    return [
        [r.reference, r.type.label, r.requester.get_full_name() or r.requester.email,
         r.title, r.get_status_display(),
         r.submitted_at.strftime("%Y-%m-%d") if r.submitted_at else "",
         r.decided_at.strftime("%Y-%m-%d") if r.decided_at else ""]
        for r in qs
    ]


def _leave_rows(request):
    from apps.hr.models import LeaveRequest

    qs = LeaveRequest.objects.select_related("employee__user", "leave_type").order_by("-start_date")
    if request.query_params.get("status"):
        qs = qs.filter(status=request.query_params["status"])
    return [
        [lr.employee.matricule, lr.employee.user.get_full_name() or lr.employee.user.email,
         lr.leave_type.label, lr.start_date, lr.end_date, float(lr.working_days),
         lr.get_status_display()]
        for lr in qs
    ]


def _tasks_rows(request):
    from apps.tasks.views import visible_tasks

    qs = visible_tasks(request.user).order_by("-created_at")
    if request.query_params.get("status"):
        qs = qs.filter(status=request.query_params["status"])
    return [
        [t.title, t.get_priority_display(), t.get_status_display(),
         t.due_at.strftime("%Y-%m-%d %H:%M") if t.due_at else "",
         ", ".join(a.user.email for a in t.assignments.all()),
         t.created_by.email if t.created_by else ""]
        for t in qs.prefetch_related("assignments__user")
    ]


def _hr_headcount_rows(request):
    from django.db.models import Count

    from apps.hr.models import Employee

    return [
        [row["user__department__name"] or "Non affecté", row["employment_type"], row["n"]]
        for row in Employee.objects.values("user__department__name", "employment_type")
        .annotate(n=Count("id")).order_by("user__department__name")
    ]


def _documents_rows(request):
    from apps.documents.models import Document

    qs = Document.objects.live().visible_to(request.user).select_related("folder", "owner", "current_version")
    return [
        [d.title, d.folder.name if d.folder else "", d.owner.email if d.owner else "",
         d.visibility, d.current_version.version_number if d.current_version else "",
         d.updated_at.strftime("%Y-%m-%d")]
        for d in qs
    ]


def _audit_rows(request):
    from apps.audit.models import AuditLogEntry

    qs = AuditLogEntry.objects.select_related("actor").order_by("-timestamp")
    if not (request.user.is_super_admin):
        qs = qs.exclude(actor_is_admin=True)
    if request.query_params.get("module"):
        qs = qs.filter(module=request.query_params["module"])
    return [
        [e.timestamp.isoformat(), e.actor_label, e.module, e.get_action_display(),
         e.severity, e.target_repr, e.message]
        for e in qs[:5000]
    ]


DATASETS: dict[str, Dataset] = {
    "mail": Dataset("mail", "Registre du courrier", "mail.export",
                    ["Référence", "Sens", "Date", "Objet", "Correspondant", "Statut", "Affecté à", "Catégorie"],
                    _mail_rows, pdf=True),
    "requests": Dataset("requests", "Registre des demandes", "requests.validate",
                        ["Référence", "Type", "Demandeur", "Objet", "Statut", "Soumise le", "Décidée le"],
                        _requests_rows, pdf=True),
    "leave": Dataset("leave", "Congés", "hr.export",
                     ["Matricule", "Employé", "Type", "Début", "Fin", "Jours", "Statut"],
                     _leave_rows),
    "tasks": Dataset("tasks", "Tâches", "tasks.oversee",
                     ["Titre", "Priorité", "Statut", "Échéance", "Assignés", "Créée par"],
                     _tasks_rows),
    "hr-headcount": Dataset("hr-headcount", "Effectifs par département", "hr.export",
                            ["Département", "Type de contrat", "Effectif"], _hr_headcount_rows),
    "documents": Dataset("documents", "Bibliothèque documentaire", "documents.view",
                         ["Titre", "Dossier", "Propriétaire", "Visibilité", "Version", "Maj"],
                         _documents_rows),
    "audit": Dataset("audit", "Journal d'audit", "audit.export",
                     ["Date", "Auteur", "Module", "Action", "Sévérité", "Cible", "Message"],
                     _audit_rows, pdf=True),
}


def now_tag() -> str:
    return timezone.now().strftime("%Y%m%d-%H%M")
