import pytest

from apps.hr.models import LeaveType
from apps.validation.models import ProcessStatus

pytestmark = pytest.mark.django_db


@pytest.fixture
def leave_type(db):
    return LeaveType.objects.get(code="annuel")


def _submit(auth, employee, leave_type):
    client = auth(employee.user)
    created = client.post(
        "/api/v1/hr/leave-requests/",
        {"leave_type": leave_type.id, "start_date": "2026-10-05", "end_date": "2026-10-06"},
        format="json",
    ).data
    client.post(f"/api/v1/hr/leave-requests/{created['id']}/submit/")
    return created["id"]


def test_returned_decision_sends_request_back_to_draft(auth, make_employee, rh_user, leave_type):
    manager = make_employee("m@wagadu.africa", role_slug="chef")
    employee = make_employee("e@wagadu.africa", manager=manager.user)
    leave_id = _submit(auth, employee, leave_type)

    resp = auth(manager.user).post(
        f"/api/v1/hr/leave-requests/{leave_id}/decide/",
        {"decision": "returned", "comment": "Merci de préciser le motif"}, format="json",
    )
    assert resp.data["status"] == "draft"


def test_flow_config_requires_permission(auth, employee, admin_user):
    assert auth(employee).post("/api/v1/validation/flows/", {"code": "x", "label": "X"}, format="json").status_code == 403
    ok = auth(admin_user).post("/api/v1/validation/flows/", {"code": "achat", "label": "Demande d'achat"}, format="json")
    assert ok.status_code == 201


def test_process_visible_to_subject_and_super_admin(auth, make_employee, rh_user, leave_type, super_admin):
    manager = make_employee("m2@wagadu.africa", role_slug="chef")
    employee = make_employee("e2@wagadu.africa", manager=manager.user)
    _submit(auth, employee, leave_type)

    assert auth(employee.user).get("/api/v1/validation/processes/").data["count"] >= 1
    assert auth(super_admin).get("/api/v1/validation/processes/").data["count"] >= 1


def test_conges_flow_is_seeded():
    from apps.validation.models import ValidationFlow

    flow = ValidationFlow.objects.get(code="conges")
    steps = flow.ordered_steps
    assert [s.approver_type for s in steps] == ["manager", "role"]
    assert steps[1].approver_role.slug == "rh"
    assert ProcessStatus.APPROVED == "approved"
