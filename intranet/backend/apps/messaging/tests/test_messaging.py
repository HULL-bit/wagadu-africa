import pytest

from apps.messaging.models import Channel
from apps.organization.models import Department

pytestmark = pytest.mark.django_db


@pytest.fixture
def dept(db):
    return Department.objects.create(name="Programmes", code="PROG")


def test_new_user_joins_general_and_department(make_user, dept):
    user = make_user("u1@wagadu.africa", "employe", department=dept)
    assert Channel.objects.filter(kind="general", members=user).exists()
    assert Channel.objects.filter(kind="department", department=dept, members=user).exists()


def test_general_channel_is_unique(make_user):
    make_user("a@wagadu.africa", "employe")
    make_user("b@wagadu.africa", "employe")
    assert Channel.objects.filter(kind="general").count() == 1


def test_member_lists_own_channels_only(api, make_user, dept):
    a = make_user("a@wagadu.africa", "employe", department=dept)
    make_user("b@wagadu.africa", "employe")  # autre service
    api.force_authenticate(a)
    res = api.get("/api/v1/messaging/channels/")
    kinds = {c["kind"] for c in res.data["results"]}
    assert res.status_code == 200
    assert kinds == {"general", "department"}


def test_post_and_read_message_clears_unread(api, make_user):
    a = make_user("a@wagadu.africa", "employe")
    b = make_user("b@wagadu.africa", "employe")
    general = Channel.objects.get(kind="general")

    api.force_authenticate(b)
    api.post(f"/api/v1/messaging/channels/{general.id}/messages/", {"body": "coucou"}, format="json")

    api.force_authenticate(a)
    listing = api.get("/api/v1/messaging/channels/").data["results"]
    assert next(c for c in listing if c["id"] == general.id)["unread"] == 1

    api.post(f"/api/v1/messaging/channels/{general.id}/read/")
    listing = api.get("/api/v1/messaging/channels/").data["results"]
    assert next(c for c in listing if c["id"] == general.id)["unread"] == 0


def test_empty_message_rejected(api, make_user):
    a = make_user("a@wagadu.africa", "employe")
    general = Channel.objects.get(kind="general")
    api.force_authenticate(a)
    res = api.post(f"/api/v1/messaging/channels/{general.id}/messages/", {"body": "   "}, format="json")
    assert res.status_code == 400


def test_direct_channel_is_reused(api, make_user):
    a = make_user("a@wagadu.africa", "employe")
    b = make_user("b@wagadu.africa", "employe")
    api.force_authenticate(a)
    first = api.post("/api/v1/messaging/channels/direct/", {"user": str(b.id)}, format="json").data
    second = api.post("/api/v1/messaging/channels/direct/", {"user": str(b.id)}, format="json").data
    assert first["id"] == second["id"]
    assert Channel.objects.filter(kind="direct").count() == 1


def test_non_member_cannot_read_channel(api, make_user):
    a = make_user("a@wagadu.africa", "employe")
    b = make_user("b@wagadu.africa", "employe")
    api.force_authenticate(a)
    other = api.post("/api/v1/messaging/channels/direct/", {"user": str(b.id)}, format="json").data
    c = make_user("c@wagadu.africa", "employe")
    api.force_authenticate(c)
    assert api.get(f"/api/v1/messaging/channels/{other['id']}/messages/").status_code == 404
