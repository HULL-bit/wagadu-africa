from __future__ import annotations

import gzip
import os
import shutil
import subprocess
from datetime import timedelta

from django.conf import settings
from django.db import connection
from django.http import StreamingHttpResponse
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import AuditAction, AuditLogEntry, AuditSeverity
from apps.audit.services import record
from apps.permissions.drf import HasPermission, IsSuperAdmin

from .filters import IncidentFilter
from .models import Incident, IncidentStatus
from .serializers import IncidentSerializer

CAN_VIEW_INCIDENTS = HasPermission.of("system.incidents.view")
CAN_MANAGE_INCIDENTS = HasPermission.of("system.incidents.manage")
CAN_VIEW_HEALTH = HasPermission.of("system.health.view")

RESOLVED_STATUSES = {IncidentStatus.RESOLVED, IncidentStatus.CLOSED}


class IncidentViewSet(viewsets.ModelViewSet):
    serializer_class = IncidentSerializer
    filterset_class = IncidentFilter
    search_fields = ["title", "description", "component"]
    ordering_fields = ["created_at", "updated_at", "severity", "status"]
    ordering = ["-created_at"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated(), CAN_VIEW_INCIDENTS()]
        return [IsAuthenticated(), CAN_MANAGE_INCIDENTS()]

    def get_queryset(self):
        return Incident.objects.select_related("reported_by", "assigned_to").all()

    def perform_create(self, serializer):
        incident = serializer.save(reported_by=self.request.user)
        record(
            action=AuditAction.CREATE, module="system", actor=self.request.user,
            target=incident, message=f"Incident ouvert « {incident.title} »",
            severity=AuditSeverity.WARNING if incident.severity in ("high", "critical") else AuditSeverity.INFO,
        )

    def perform_update(self, serializer):
        previous_status = serializer.instance.status
        extra = {}
        new_status = serializer.validated_data.get("status", previous_status)
        if new_status in RESOLVED_STATUSES and previous_status not in RESOLVED_STATUSES:
            extra["resolved_at"] = timezone.now()
        elif new_status not in RESOLVED_STATUSES:
            extra["resolved_at"] = None
        incident = serializer.save(**extra)
        record(
            action=AuditAction.UPDATE, module="system", actor=self.request.user,
            target=incident, message=f"Incident mis à jour « {incident.title} » → {incident.get_status_display()}",
        )

    def perform_destroy(self, instance):
        record(
            action=AuditAction.DELETE, module="system", actor=self.request.user,
            target_repr=str(instance), message=f"Incident supprimé « {instance.title} »",
            severity=AuditSeverity.WARNING,
        )
        instance.delete()


class SystemHealthView(APIView):
    """Instantané de l'état des services (admin système) — section pré-déploiement.

    Vérifie Postgres, Redis et les workers Celery en direct plutôt que de se
    fier à un statut mis en cache, pour que la page reflète l'état réel au
    moment où elle est ouverte.
    """

    permission_classes = [IsAuthenticated, CAN_VIEW_HEALTH]

    def get(self, request):
        return Response(
            {
                "checked_at": timezone.now(),
                "database": self._database(),
                "redis": self._redis(),
                "celery": self._celery(),
                "disk": self._disk(),
                "incidents": self._incidents(),
                "audit": self._audit(),
            }
        )

    def _database(self):
        try:
            with connection.cursor() as cursor:
                if connection.vendor == "postgresql":
                    cursor.execute("SELECT pg_database_size(current_database())")
                    size_bytes = cursor.fetchone()[0]
                    cursor.execute(
                        "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()"
                    )
                    connections = cursor.fetchone()[0]
                    return {"ok": True, "size_bytes": size_bytes, "connections": connections}
                # SQLite (CI / dev sans Docker) : pas de taille/connexions côté
                # serveur à interroger — on vérifie juste la connectivité.
                cursor.execute("SELECT 1")
                return {"ok": True, "size_bytes": None, "connections": None}
        except Exception as exc:  # pragma: no cover - chemin d'échec réseau/DB
            return {"ok": False, "error": str(exc)}

    def _redis(self):
        try:
            import redis

            client = redis.from_url(settings.CELERY_BROKER_URL, socket_connect_timeout=2)
            client.ping()
            info = client.info(section="memory")
            return {"ok": True, "used_memory_bytes": info.get("used_memory")}
        except Exception as exc:  # pragma: no cover
            return {"ok": False, "error": str(exc)}

    def _celery(self):
        try:
            from wagadu.celery import app as celery_app

            pong = celery_app.control.ping(timeout=1.0)
            return {"ok": bool(pong), "workers": len(pong)}
        except Exception as exc:  # pragma: no cover
            return {"ok": False, "error": str(exc)}

    def _disk(self):
        try:
            total, used, free = shutil.disk_usage("/")
            return {"ok": True, "total_bytes": total, "used_bytes": used, "free_bytes": free}
        except Exception as exc:  # pragma: no cover
            return {"ok": False, "error": str(exc)}

    def _incidents(self):
        qs = Incident.objects.exclude(status__in=RESOLVED_STATUSES)
        return {
            "open_total": qs.count(),
            "open_critical": qs.filter(severity="critical").count(),
        }

    def _audit(self):
        since = timezone.now() - timedelta(hours=24)
        qs = AuditLogEntry.objects.filter(timestamp__gte=since)
        return {
            "last_24h_total": qs.count(),
            "last_24h_critical": qs.filter(severity=AuditSeverity.CRITICAL).count(),
        }


def _pg_dump_command() -> list[str]:
    db = settings.DATABASES["default"]
    return [
        "pg_dump",
        "--host", db["HOST"],
        "--port", str(db["PORT"]),
        "--username", db["USER"],
        "--dbname", db["NAME"],
        "--no-password",
        "--clean",
        "--if-exists",
    ]


class DatabaseExportView(APIView):
    """Export complet de la base (dump SQL compressé) — Super Administrateur
    uniquement : un dump contient l'intégralité des données de tous les
    utilisateurs, pas seulement celles de qui le déclenche."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        if connection.vendor != "postgresql":
            return Response(
                {"detail": "Export disponible uniquement avec un moteur PostgreSQL."},
                status=501,
            )
        env = {**os.environ, "PGPASSWORD": settings.DATABASES["default"]["PASSWORD"]}
        process = subprocess.Popen(
            _pg_dump_command(), stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env
        )
        sql_bytes, stderr = process.communicate(timeout=120)
        if process.returncode != 0:
            return Response(
                {"detail": f"Échec de pg_dump : {stderr.decode(errors='replace')[:500]}"},
                status=500,
            )
        compressed = gzip.compress(sql_bytes)
        stamp = timezone.now().strftime("%Y%m%d-%H%M%S")
        record(
            action=AuditAction.EXPORT, module="system", actor=request.user,
            message=f"Export complet de la base ({len(compressed)} octets compressés)",
            severity=AuditSeverity.WARNING, confidential=True,
        )
        response = StreamingHttpResponse(iter([compressed]), content_type="application/gzip")
        response["Content-Disposition"] = f'attachment; filename="wagadu-{stamp}.sql.gz"'
        return response
