from __future__ import annotations

import csv

from django.http import HttpResponse
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated

from apps.permissions.drf import HasPermission
from apps.permissions.services import has_permission

from .filters import AuditLogFilter
from .models import AuditAction, AuditLogEntry
from .serializers import AuditLogEntrySerializer
from .services import record


class AuditLogViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Journal d'audit en lecture seule (section 7).

    - ``audit.view`` : accès à la consultation.
    - Un utilisateur sans ``audit.view_admin_actions`` (ni Super Admin) ne voit
      pas les entrées concernant les autres administrateurs.
    """

    serializer_class = AuditLogEntrySerializer
    permission_classes = [IsAuthenticated, HasPermission.of("audit.view")]
    filterset_class = AuditLogFilter
    search_fields = ["actor_label", "target_repr", "message"]
    ordering_fields = ["timestamp", "severity", "module"]
    ordering = ["-timestamp"]

    def get_queryset(self):
        qs = AuditLogEntry.objects.select_related("actor").all()
        user = self.request.user
        is_super = getattr(user, "is_super_admin", False)
        if not is_super:
            # Entrées confidentielles : Super Administrateur uniquement.
            qs = qs.exclude(confidential=True)
            if not has_permission(user, "audit.view_admin_actions"):
                qs = qs.exclude(actor_is_admin=True)
        return qs

    @action(detail=False, methods=["get"])
    def export(self, request):
        if not has_permission(request.user, "audit.export"):
            raise PermissionDenied("Permission « audit.export » requise.")
        queryset = self.filter_queryset(self.get_queryset())
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="journal-audit.csv"'
        writer = csv.writer(response)
        writer.writerow(
            ["Date", "Auteur", "Admin", "Module", "Action", "Sévérité",
             "Cible", "Message", "IP"]
        )
        for e in queryset.iterator():
            writer.writerow([
                e.timestamp.isoformat(), e.actor_label, e.actor_is_admin, e.module,
                e.action, e.severity, e.target_repr, e.message, e.ip_address or "",
            ])
        record(
            action=AuditAction.EXPORT, module="audit", request=request,
            message="Export du journal d'audit (CSV)",
        )
        return response
