import pytest

from apps.availability.models import Availability

pytestmark = pytest.mark.django_db


def test_user_signals_own_unavailability(api, make_user):
    u = make_user("u@wagadu.africa", "employe")
    api.force_authenticate(u)
    res = api.post(
        "/api/v1/availability/",
        {"start_date": "2026-09-01", "end_date": "2026-09-02", "kind": "absent", "note": "RDV"},
        format="json",
    )
    assert res.status_code == 201
    assert Availability.objects.get().user == u


def test_end_before_start_rejected(api, make_user):
    u = make_user("u@wagadu.africa", "employe")
    api.force_authenticate(u)
    res = api.post(
        "/api/v1/availability/",
        {"start_date": "2026-09-05", "end_date": "2026-09-01", "kind": "absent"},
        format="json",
    )
    assert res.status_code == 400


def test_cannot_delete_others(api, make_user):
    a = make_user("a@wagadu.africa", "employe")
    b = make_user("b@wagadu.africa", "employe")
    entry = Availability.objects.create(user=a, start_date="2026-09-01", end_date="2026-09-01")
    api.force_authenticate(b)
    assert api.delete(f"/api/v1/availability/{entry.id}/").status_code == 403


def test_team_sees_all_mine_sees_own(api, make_user):
    a = make_user("a@wagadu.africa", "employe")
    b = make_user("b@wagadu.africa", "employe")
    Availability.objects.create(user=a, start_date="2100-01-01", end_date="2100-01-02")
    Availability.objects.create(user=b, start_date="2100-01-03", end_date="2100-01-04")
    api.force_authenticate(a)
    assert api.get("/api/v1/availability/?upcoming=1").data["count"] == 2
    assert api.get("/api/v1/availability/?upcoming=1&scope=mine").data["count"] == 1
