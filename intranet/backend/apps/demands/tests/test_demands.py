import pytest

from apps.notifications.models import Notification

pytestmark = pytest.mark.django_db


@pytest.fixture
def achat_type(db):
    from apps.demands.models import RequestType

    return RequestType.objects.get(code="achat")


def _create(client, type_id, data):
    return client.post("/api/v1/requests/", {
        "type": type_id, "title": "Achat ordinateurs", "data": data,
    }, format="json")


def test_reference_is_auto_and_formatted(auth, employee, achat_type):
    resp = _create(auth(employee), achat_type.id, {"designation": "PC", "quantite": 2, "montant_estime": 800000, "justification": "Renouvellement"})
    assert resp.status_code == 201
    assert resp.data["reference"].startswith("DEM-")
    assert resp.data["status"] == "draft"


def test_submit_validates_required_fields(auth, employee, achat_type):
    rid = _create(auth(employee), achat_type.id, {"designation": "PC"}).data["id"]
    resp = auth(employee).post(f"/api/v1/requests/{rid}/submit/")
    assert resp.status_code == 400
    assert "data" in resp.data


def test_full_two_level_flow_manager_then_admin(auth, make_employee, admin_user, achat_type):
    manager = make_employee("mgr@wagadu.africa", role_slug="chef")
    emp = make_employee("agent@wagadu.africa", manager=manager.user)

    rid = _create(auth(emp.user), achat_type.id, {
        "designation": "PC", "quantite": 2, "montant_estime": 800000, "justification": "OK",
    }).data["id"]
    sub = auth(emp.user).post(f"/api/v1/requests/{rid}/submit/")
    assert sub.data["status"] == "in_review"
    assert Notification.objects.filter(recipient=manager.user, type="validation").exists()

    d1 = auth(manager.user).post(f"/api/v1/requests/{rid}/decide/", {"decision": "approved"}, format="json")
    assert d1.data["status"] == "in_review"  # passe à l'admin

    d2 = auth(admin_user).post(f"/api/v1/requests/{rid}/decide/", {"decision": "approved"}, format="json")
    assert d2.data["status"] == "approved"


def test_manager_rejection(auth, make_employee, achat_type):
    manager = make_employee("m2@wagadu.africa", role_slug="chef")
    emp = make_employee("a2@wagadu.africa", manager=manager.user)
    rid = _create(auth(emp.user), achat_type.id, {"designation": "X", "quantite": 1, "montant_estime": 1000, "justification": "x"}).data["id"]
    auth(emp.user).post(f"/api/v1/requests/{rid}/submit/")
    resp = auth(manager.user).post(f"/api/v1/requests/{rid}/decide/", {"decision": "rejected", "comment": "Non prioritaire"}, format="json")
    assert resp.data["status"] == "rejected"


def test_non_approver_cannot_decide(auth, make_employee, achat_type, chef):
    manager = make_employee("m3@wagadu.africa", role_slug="chef")
    emp = make_employee("a3@wagadu.africa", manager=manager.user)
    rid = _create(auth(emp.user), achat_type.id, {"designation": "X", "quantite": 1, "montant_estime": 1, "justification": "x"}).data["id"]
    auth(emp.user).post(f"/api/v1/requests/{rid}/submit/")
    assert auth(chef).post(f"/api/v1/requests/{rid}/decide/", {"decision": "approved"}, format="json").status_code == 403


def test_employee_only_sees_own_requests(auth, make_employee, achat_type):
    a = make_employee("x1@wagadu.africa")
    b = make_employee("x2@wagadu.africa")
    _create(auth(a.user), achat_type.id, {})
    assert auth(b.user).get("/api/v1/requests/").data["count"] == 0
    assert auth(a.user).get("/api/v1/requests/mine/").status_code == 200


def test_request_types_seeded_and_readonly_for_employee(auth, employee):
    resp = auth(employee).get("/api/v1/request-types/")
    assert {t["code"] for t in resp.data["results"]} == {"achat", "mission", "remboursement"}
    assert auth(employee).post("/api/v1/request-types/", {"code": "x", "label": "X"}, format="json").status_code == 403
