import datetime

import pytest

from apps.hr.models import LeaveBalance, LeaveRequest, LeaveType, PublicHoliday

pytestmark = pytest.mark.django_db


@pytest.fixture
def leave_type(db):
    return LeaveType.objects.get(code="annuel")


def _create_request(client, employee, leave_type, start, end):
    return client.post(
        "/api/v1/hr/leave-requests/",
        {"leave_type": leave_type.id, "start_date": start, "end_date": end, "reason": "RAS"},
        format="json",
    )


def test_business_days_excludes_weekends_and_holidays(db):
    PublicHoliday.objects.get_or_create(date=datetime.date(2026, 9, 2), defaults={"label": "Test"})
    # 2026-08-31 (lun) → 2026-09-04 (ven) = 5 jours ouvrés, moins 1 férié = 4
    days = LeaveRequest.business_days(datetime.date(2026, 8, 31), datetime.date(2026, 9, 4))
    assert days == 4


def test_full_two_level_approval_deducts_balance(auth, make_employee, rh_user, leave_type):
    manager = make_employee("mgr@wagadu.africa", role_slug="chef")
    employee = make_employee("agent@wagadu.africa", manager=manager.user)

    resp = _create_request(auth(employee.user), employee, leave_type, "2026-09-07", "2026-09-11")
    assert resp.status_code == 201
    leave_id = resp.data["id"]

    submit = auth(employee.user).post(f"/api/v1/hr/leave-requests/{leave_id}/submit/")
    assert submit.status_code == 200
    assert submit.data["status"] == "in_review"
    assert float(submit.data["working_days"]) == 5

    # Étape 1 : le manager approuve
    d1 = auth(manager.user).post(
        f"/api/v1/hr/leave-requests/{leave_id}/decide/", {"decision": "approved"}, format="json"
    )
    assert d1.status_code == 200
    assert d1.data["status"] == "in_review"  # passe à l'étape RH

    # Étape 2 : le RH confirme
    d2 = auth(rh_user).post(
        f"/api/v1/hr/leave-requests/{leave_id}/decide/", {"decision": "approved"}, format="json"
    )
    assert d2.status_code == 200
    assert d2.data["status"] == "approved"

    balance = LeaveBalance.objects.get(employee=employee, leave_type=leave_type, year=2026)
    assert float(balance.taken_days) == 5


def test_manager_rejection_stops_the_process(auth, make_employee, rh_user, leave_type):
    manager = make_employee("mgr2@wagadu.africa", role_slug="chef")
    employee = make_employee("agent2@wagadu.africa", manager=manager.user)
    leave_id = _create_request(auth(employee.user), employee, leave_type, "2026-09-07", "2026-09-08").data["id"]
    auth(employee.user).post(f"/api/v1/hr/leave-requests/{leave_id}/submit/")

    resp = auth(manager.user).post(
        f"/api/v1/hr/leave-requests/{leave_id}/decide/",
        {"decision": "rejected", "comment": "Période chargée"}, format="json",
    )
    assert resp.data["status"] == "rejected"
    balance = LeaveBalance.objects.filter(employee=employee, leave_type=leave_type).first()
    assert balance is None or float(balance.taken_days) == 0


def test_employee_without_manager_goes_straight_to_rh(auth, make_employee, rh_user, leave_type):
    employee = make_employee("solo@wagadu.africa")  # pas de manager
    leave_id = _create_request(auth(employee.user), employee, leave_type, "2026-09-07", "2026-09-08").data["id"]
    auth(employee.user).post(f"/api/v1/hr/leave-requests/{leave_id}/submit/")

    resp = auth(rh_user).post(
        f"/api/v1/hr/leave-requests/{leave_id}/decide/", {"decision": "approved"}, format="json"
    )
    assert resp.data["status"] == "approved"


def test_non_approver_cannot_decide(auth, make_employee, rh_user, leave_type, chef):
    manager = make_employee("mgr3@wagadu.africa", role_slug="chef")
    employee = make_employee("agent3@wagadu.africa", manager=manager.user)
    leave_id = _create_request(auth(employee.user), employee, leave_type, "2026-09-07", "2026-09-08").data["id"]
    auth(employee.user).post(f"/api/v1/hr/leave-requests/{leave_id}/submit/")

    # un autre chef, pas le manager de l'employé
    resp = auth(chef).post(
        f"/api/v1/hr/leave-requests/{leave_id}/decide/", {"decision": "approved"}, format="json"
    )
    assert resp.status_code == 403


def test_insufficient_balance_blocks_submission(auth, make_employee, leave_type):
    employee = make_employee("greedy@wagadu.africa")
    # quota annuel = 30 j ; on demande une longue période > 30 j ouvrés
    leave_id = _create_request(
        auth(employee.user), employee, leave_type, "2026-09-01", "2026-11-30"
    ).data["id"]
    resp = auth(employee.user).post(f"/api/v1/hr/leave-requests/{leave_id}/submit/")
    assert resp.status_code == 400
    assert "solde" in str(resp.data).lower()


def test_sick_leave_requires_certificate(auth, make_employee):
    employee = make_employee("sick@wagadu.africa")
    sick = LeaveType.objects.get(code="maladie")
    leave_id = _create_request(auth(employee.user), employee, sick, "2026-09-07", "2026-09-08").data["id"]
    resp = auth(employee.user).post(f"/api/v1/hr/leave-requests/{leave_id}/submit/")
    assert resp.status_code == 400
    assert "justificatif" in str(resp.data).lower() or "certificat" in str(resp.data).lower()
