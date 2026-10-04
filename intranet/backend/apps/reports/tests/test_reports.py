import pytest

from apps.audit.models import AuditLogEntry

pytestmark = pytest.mark.django_db

XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def test_catalog_filtered_by_permission(auth, employee, admin_user):
    emp_keys = {d["key"] for d in auth(employee).get("/api/v1/reports/").data}
    adm_keys = {d["key"] for d in auth(admin_user).get("/api/v1/reports/").data}
    assert "audit" not in emp_keys
    assert {"audit", "mail", "requests"} <= adm_keys


def test_xlsx_export_of_leave(auth, rh_user):
    resp = auth(rh_user).get("/api/v1/reports/leave.xlsx")
    assert resp.status_code == 200
    assert resp["Content-Type"] == XLSX
    assert resp.content[:2] == b"PK"  # zip/xlsx magic
    assert AuditLogEntry.objects.filter(module="reports", action="export").exists()


def test_pdf_only_for_official_registers(auth, admin_user):
    assert auth(admin_user).get("/api/v1/reports/mail.pdf").status_code == 200
    assert auth(admin_user).get("/api/v1/reports/tasks.pdf").status_code == 404  # xlsx-only


def test_export_denied_without_permission(auth, employee):
    assert auth(employee).get("/api/v1/reports/audit.xlsx").status_code == 403
    assert auth(employee).get("/api/v1/reports/leave.xlsx").status_code == 403


def test_pdf_content_is_pdf(auth, admin_user):
    resp = auth(admin_user).get("/api/v1/reports/audit.pdf")
    assert resp.status_code == 200 and resp.content[:4] == b"%PDF"
