import pytest

from apps.audit.models import AuditLogEntry
from apps.hr.models import Contract
from apps.hr.tasks import check_contract_expirations

pytestmark = pytest.mark.django_db


def test_employee_cannot_list_all_employees(auth, employee, make_employee):
    make_employee("x@wagadu.africa")
    assert auth(employee).get("/api/v1/hr/employees/").status_code == 403


def test_rh_can_list_and_create_employee(auth, rh_user, make_user):
    target = make_user("newhire@wagadu.africa", "employe")
    resp = auth(rh_user).post(
        "/api/v1/hr/employees/",
        {"user": str(target.id), "matricule": "WAG-9999", "job_title": "Chargé de projet",
         "hire_date": "2026-02-01"},
        format="json",
    )
    assert resp.status_code == 201
    assert AuditLogEntry.objects.filter(module="hr", action="create").exists()


def test_employee_sees_only_own_file_via_me(auth, make_employee):
    emp = make_employee("self@wagadu.africa")
    resp = auth(emp.user).get("/api/v1/hr/employees/me/")
    assert resp.status_code == 200
    assert resp.data["matricule"] == emp.matricule


def test_manager_can_read_subordinate_file(auth, make_employee):
    manager = make_employee("boss@wagadu.africa", role_slug="chef")
    report = make_employee("report@wagadu.africa", manager=manager.user)
    resp = auth(manager.user).get(f"/api/v1/hr/employees/{report.id}/")
    assert resp.status_code == 200


def test_other_employee_cannot_read_file(auth, make_employee):
    a = make_employee("a@wagadu.africa")
    b = make_employee("b@wagadu.africa")
    assert auth(a.user).get(f"/api/v1/hr/employees/{b.id}/").status_code == 403


def test_contract_expiration_alert_notifies_hr_once(make_employee, rh_user):
    emp = make_employee("cdd@wagadu.africa")
    from django.utils import timezone

    Contract.objects.create(
        employee=emp, type="cdd", start_date="2025-01-01",
        end_date=(timezone.now().date() + timezone.timedelta(days=10)),
        renewal_notice_days=30,
    )
    assert check_contract_expirations()["alerts"] == 1
    assert check_contract_expirations()["alerts"] == 0  # pas de doublon

    from apps.notifications.models import Notification

    assert Notification.objects.filter(recipient=rh_user, type="hr_alert").exists()


def test_hr_dashboard_requires_permission(auth, employee, rh_user):
    assert auth(employee).get("/api/v1/hr/dashboard/").status_code == 403
    assert auth(rh_user).get("/api/v1/hr/dashboard/").status_code == 200
