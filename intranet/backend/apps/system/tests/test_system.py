import gzip

import pytest
from django.db import connection

from apps.audit.models import AuditLogEntry
from apps.system.models import Incident, IncidentStatus

pytestmark = pytest.mark.django_db

requires_postgres = pytest.mark.skipif(
    connection.vendor != "postgresql",
    reason="pg_dump requires a real PostgreSQL connection (USE_SQLITE=1 in CI)",
)


def _create_incident(auth, admin_user, **overrides):
    payload = {
        "title": "Directus injoignable",
        "description": "Timeout sur /server/health",
        "component": "Directus",
        "severity": "high",
        **overrides,
    }
    return auth(admin_user).post("/api/v1/system/incidents/", payload, format="json")


def test_employee_cannot_view_incidents(auth, employee):
    assert auth(employee).get("/api/v1/system/incidents/").status_code == 403


def test_admin_can_create_and_view_incident(auth, admin_user):
    resp = _create_incident(auth, admin_user)
    assert resp.status_code == 201
    assert resp.data["status"] == IncidentStatus.OPEN
    assert resp.data["reported_by"] == admin_user.id
    assert Incident.objects.count() == 1


def test_incident_creation_is_audited(auth, admin_user):
    _create_incident(auth, admin_user)
    assert AuditLogEntry.objects.filter(module="system", action="create").exists()


def test_resolving_incident_stamps_resolved_at(auth, admin_user):
    created = _create_incident(auth, admin_user).data
    resp = auth(admin_user).patch(
        f"/api/v1/system/incidents/{created['id']}/",
        {"status": "resolved", "resolution_notes": "Redémarrage du conteneur"},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.data["resolved_at"] is not None

    # Réouverture : resolved_at doit repasser à null.
    resp2 = auth(admin_user).patch(
        f"/api/v1/system/incidents/{created['id']}/", {"status": "open"}, format="json"
    )
    assert resp2.data["resolved_at"] is None


def test_employee_cannot_view_system_health(auth, employee):
    assert auth(employee).get("/api/v1/system/health/").status_code == 403


def test_admin_can_view_system_health(auth, admin_user):
    resp = auth(admin_user).get("/api/v1/system/health/")
    assert resp.status_code == 200
    assert "database" in resp.data
    assert "redis" in resp.data
    assert resp.data["database"]["ok"] is True


def test_database_export_forbidden_for_non_super_admin(auth, admin_user):
    assert auth(admin_user).get("/api/v1/system/database/export/").status_code == 403


@requires_postgres
def test_database_export_allowed_for_super_admin(auth, super_admin):
    resp = auth(super_admin).get("/api/v1/system/database/export/")
    assert resp.status_code == 200
    assert resp["Content-Type"] == "application/gzip"
    body = b"".join(resp.streaming_content)
    sql = gzip.decompress(body).decode("utf-8", errors="replace")
    assert "PostgreSQL database dump" in sql
    assert AuditLogEntry.objects.filter(module="system", action="export", confidential=True).exists()
