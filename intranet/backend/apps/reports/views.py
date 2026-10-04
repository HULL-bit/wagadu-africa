from __future__ import annotations

from django.http import HttpResponse
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import AuditAction
from apps.audit.services import record
from apps.permissions.services import has_permission

from .datasets import DATASETS, now_tag
from .exporters import to_pdf, to_xlsx

CONTENT_TYPES = {
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "pdf": "application/pdf",
}


class ReportCatalogView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response([
            {"key": d.key, "label": d.label, "formats": ["xlsx"] + (["pdf"] if d.pdf else [])}
            for d in DATASETS.values()
            if d.permission is None or has_permission(request.user, d.permission)
        ])


class ReportExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, dataset: str, fmt: str):
        spec = DATASETS.get(dataset)
        if spec is None or fmt not in CONTENT_TYPES:
            raise NotFound("Rapport ou format inconnu.")
        if spec.permission and not has_permission(request.user, spec.permission):
            raise PermissionDenied(f"Permission « {spec.permission} » requise.")
        if fmt == "pdf" and not spec.pdf:
            raise NotFound("Ce rapport n'est disponible qu'en XLSX.")

        rows = spec.rows(request)
        payload = (to_pdf if fmt == "pdf" else to_xlsx)(
            title=spec.label, headers=spec.headers, rows=rows
        )
        record(action=AuditAction.EXPORT, module="reports", actor=request.user,
               message=f"Export {spec.label} ({fmt.upper()}, {len(rows)} lignes)", request=request)

        resp = HttpResponse(payload, content_type=CONTENT_TYPES[fmt])
        resp["Content-Disposition"] = f'attachment; filename="{dataset}-{now_tag()}.{fmt}"'
        return resp
