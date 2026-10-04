import pytest

pytestmark = pytest.mark.django_db


def test_dashboard_requires_auth(api):
    assert api.get("/api/v1/dashboard/").status_code == 401


def test_employee_dashboard_has_no_admin_widgets(auth, employee):
    resp = auth(employee).get("/api/v1/dashboard/")
    assert resp.status_code == 200
    assert "administration" not in resp.data["widgets"]
    assert "tasks.submit" in resp.data["permissions"]


def test_admin_dashboard_exposes_admin_widgets(auth, admin_user):
    resp = auth(admin_user).get("/api/v1/dashboard/")
    assert resp.status_code == 200
    assert "administration" in resp.data["widgets"]
    assert "audit" in resp.data["widgets"]


def test_super_admin_dashboard(auth, super_admin):
    resp = auth(super_admin).get("/api/v1/dashboard/")
    assert resp.data["user"]["is_super_admin"] is True
