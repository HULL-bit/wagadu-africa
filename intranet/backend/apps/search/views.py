"""Recherche globale transverse (§2.11) : un seul champ pour retrouver une
tâche, un courrier, un document, une personne, une réunion ou une demande.

Chaque source est filtrée selon les mêmes règles de visibilité que son module.
"""
from __future__ import annotations

from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.permissions.services import has_permission

LIMIT = 8


class GlobalSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        if len(q) < 2:
            return Response({"query": q, "results": []})
        user = request.user
        results: list[dict] = []
        results += self._people(q)
        results += self._tasks(q, user)
        results += self._mail(q, user)
        results += self._documents(q, user)
        results += self._meetings(q, user)
        results += self._requests(q, user)
        return Response({"query": q, "results": results})

    def _people(self, q):
        from apps.accounts.models import User

        rows = User.objects.filter(
            Q(first_name__icontains=q) | Q(last_name__icontains=q) | Q(email__icontains=q),
            is_active=True,
        )[:LIMIT]
        return [{"type": "person", "id": str(u.id), "title": u.get_full_name() or u.email,
                 "subtitle": u.role_slug or "—", "url": f"/admin/users/{u.id}"} for u in rows]

    def _tasks(self, q, user):
        from apps.tasks.views import visible_tasks

        rows = visible_tasks(user).filter(Q(title__icontains=q) | Q(description__icontains=q))[:LIMIT]
        return [{"type": "task", "id": t.id, "title": t.title,
                 "subtitle": t.get_status_display(), "url": f"/tasks/{t.id}"} for t in rows]

    def _mail(self, q, user):
        from apps.correspondence.models import Mail

        qs = Mail.objects.filter(
            Q(subject__icontains=q) | Q(reference__icontains=q) | Q(correspondent__icontains=q)
        )
        if not (user.is_super_admin or has_permission(user, "mail.assign")):
            qs = qs.filter(Q(registered_by=user) | Q(assigned_to=user)
                           | Q(assigned_department_id=user.department_id))
        return [{"type": "mail", "id": m.id, "title": f"{m.reference} — {m.subject}",
                 "subtitle": m.get_status_display(), "url": f"/mail/{m.id}"} for m in qs[:LIMIT]]

    def _documents(self, q, user):
        from apps.documents.models import Document
        from apps.documents.services import search_documents

        rows = search_documents(Document.objects.live().visible_to(user), q)[:LIMIT]
        return [{"type": "document", "id": d.id, "title": d.title,
                 "subtitle": d.folder.name if d.folder else "Document", "url": f"/documents/{d.id}"}
                for d in rows]

    def _meetings(self, q, user):
        from apps.meetings.models import Meeting

        rows = Meeting.objects.filter(
            Q(title__icontains=q) | Q(description__icontains=q)
        ).filter(Q(organizer=user) | Q(participants=user)).distinct()[:LIMIT]
        return [{"type": "meeting", "id": m.id, "title": m.title,
                 "subtitle": m.start.strftime("%d/%m/%Y %H:%M"), "url": f"/meetings/{m.id}"}
                for m in rows]

    def _requests(self, q, user):
        from apps.demands.views import visible_requests

        rows = visible_requests(user).filter(
            Q(title__icontains=q) | Q(reference__icontains=q)
        )[:LIMIT]
        return [{"type": "request", "id": r.id, "title": f"{r.reference} — {r.title}",
                 "subtitle": r.get_status_display(), "url": f"/requests/{r.id}"} for r in rows]
