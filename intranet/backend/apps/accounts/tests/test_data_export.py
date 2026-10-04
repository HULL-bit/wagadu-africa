import json

import pytest

from apps.audit.models import AuditLogEntry

pytestmark = pytest.mark.django_db


def test_personal_data_export(auth, make_employee):
    emp = make_employee("export-me@wagadu.africa")
    resp = auth(emp.user).get("/api/v1/auth/me/export/")
    assert resp.status_code == 200
    assert resp["Content-Disposition"].startswith("attachment")
    payload = json.loads(b"".join(resp.streaming_content) if resp.streaming else resp.content)
    assert payload["account"]["email"] == "export-me@wagadu.africa"
    assert "employee" in payload
    assert "leave_requests" in payload
    assert "tasks_assigned" in payload
    assert AuditLogEntry.objects.filter(
        module="accounts", action="export", actor=emp.user
    ).exists()


def test_export_requires_auth(api):
    assert api.get("/api/v1/auth/me/export/").status_code == 401
