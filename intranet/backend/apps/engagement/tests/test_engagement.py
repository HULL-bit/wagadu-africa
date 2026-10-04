import pytest

from apps.engagement.models import Announcement

pytestmark = pytest.mark.django_db


def test_employee_cannot_publish_announcement(auth, employee):
    resp = auth(employee).post("/api/v1/announcements/", {"title": "T", "body": "B"}, format="json")
    assert resp.status_code == 403


def test_admin_publishes_pinned_announcement_visible_to_all(auth, admin_user, employee):
    auth(admin_user).post("/api/v1/announcements/", {"title": "Fermeture", "body": "Vendredi", "pinned": True}, format="json")
    feed = auth(employee).get("/api/v1/announcements/")
    assert feed.data["count"] == 1 and feed.data["results"][0]["pinned"] is True


def test_expired_announcement_hidden(auth, admin_user, employee):
    from django.utils import timezone

    a = Announcement.objects.create(title="Vieux", body="x",
                                    expires_at=timezone.now() - timezone.timedelta(days=1))
    assert not any(x["id"] == a.id for x in auth(employee).get("/api/v1/announcements/").data["results"])


def test_poll_single_choice_vote_and_close(auth, chef, employee):
    poll = auth(chef).post("/api/v1/polls/", {
        "question": "Date du séminaire ?", "option_labels": ["Mars", "Avril", "Mai"],
    }, format="json")
    assert poll.status_code == 201
    opts = poll.data["options"]

    auth(employee).post(f"/api/v1/polls/{poll.data['id']}/vote/", {"option": opts[0]["id"]}, format="json")
    v = auth(employee).post(f"/api/v1/polls/{poll.data['id']}/vote/", {"option": opts[1]["id"]}, format="json")
    counts = {o["label"]: o["vote_count"] for o in v.data["options"]}
    assert counts == {"Mars": 0, "Avril": 1, "Mai": 0}
    assert v.data["my_votes"] == [opts[1]["id"]]

    auth(chef).post(f"/api/v1/polls/{poll.data['id']}/close/")
    assert auth(employee).post(f"/api/v1/polls/{poll.data['id']}/vote/", {"option": opts[0]["id"]}, format="json").status_code == 400


def test_poll_multiple_choice(auth, chef, employee):
    poll = auth(chef).post("/api/v1/polls/", {
        "question": "Sujets à traiter ?", "multiple_choice": True,
        "option_labels": ["Budget", "RH", "Terrain"],
    }, format="json")
    ids = [o["id"] for o in poll.data["options"][:2]]
    v = auth(employee).post(f"/api/v1/polls/{poll.data['id']}/vote/", {"options": ids}, format="json")
    assert sorted(v.data["my_votes"]) == sorted(ids)
    assert v.data["total_votes"] == 1
