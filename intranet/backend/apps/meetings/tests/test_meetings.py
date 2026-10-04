import datetime

import pytest
from django.utils import timezone

from apps.meetings.models import Meeting, MeetingStatus
from apps.notifications.models import Notification

pytestmark = pytest.mark.django_db


def _mk(client, chef, participants=(), **extra):
    payload = {
        "title": "Réunion hebdo",
        "start": (timezone.now() + datetime.timedelta(hours=2)).isoformat(),
        "end": (timezone.now() + datetime.timedelta(hours=3)).isoformat(),
        "participant_ids": [str(u.id) for u in participants],
    }
    payload.update(extra)
    return client.post("/api/v1/meetings/", payload, format="json")


def test_employee_can_create_meeting(auth, employee, make_user):
    # meetings.create est accordé à tous les rôles
    other = make_user("p@wagadu.africa", "employe")
    resp = _mk(auth(employee), employee, [other])
    assert resp.status_code == 201
    assert resp.data["room_slug"].startswith("wagadu-")
    assert resp.data["join_url"].endswith(resp.data["room_slug"])
    assert Notification.objects.filter(recipient=other, type="meeting").exists()


def test_join_without_jwt_returns_plain_url(auth, chef, make_user):
    p = make_user("q@wagadu.africa", "employe")
    mid = _mk(auth(chef), chef, [p]).data["id"]
    resp = auth(p).get(f"/api/v1/meetings/{mid}/join/")
    assert resp.status_code == 200
    assert resp.data["jwt"] is None
    assert resp.data["moderator"] is False
    assert resp.data["configured"] is False


def test_join_with_jwt_when_configured(auth, chef, settings):
    settings.WAGADU = {**settings.WAGADU, "JITSI": {
        "URL": "https://meet.example.org", "DOMAIN": "meet.example.org",
        "APP_ID": "wagadu", "APP_SECRET": "s3cr3t",
    }}
    mid = _mk(auth(chef), chef).data["id"]
    resp = auth(chef).get(f"/api/v1/meetings/{mid}/join/")
    assert resp.data["jwt"] and resp.data["moderator"] is True

    import jwt as pyjwt

    decoded = pyjwt.decode(resp.data["jwt"], "s3cr3t", algorithms=["HS256"], audience="wagadu")
    assert decoded["room"] == resp.data["room"]
    assert decoded["context"]["user"]["moderator"] is True


def test_invited_only_blocks_outsider(auth, chef, make_user):
    outsider = make_user("out@wagadu.africa", "employe")
    mid = _mk(auth(chef), chef).data["id"]
    assert auth(outsider).get(f"/api/v1/meetings/{mid}/join/").status_code in (403, 404)


def test_open_meeting_allows_anyone(auth, chef, make_user):
    outsider = make_user("open@wagadu.africa", "employe")
    mid = _mk(auth(chef), chef, access="open").data["id"]
    assert auth(outsider).get(f"/api/v1/meetings/{mid}/join/").status_code == 200


def test_respond_to_invitation(auth, chef, make_user):
    p = make_user("resp@wagadu.africa", "employe")
    mid = _mk(auth(chef), chef, [p]).data["id"]
    r = auth(p).post(f"/api/v1/meetings/{mid}/respond/", {"response": "declined"}, format="json")
    assert r.status_code == 200
    assert Notification.objects.filter(recipient=chef, type="meeting").exists()


def test_only_organizer_manages_participants_and_cancels(auth, chef, make_user):
    p = make_user("p2@wagadu.africa", "employe")
    mid = _mk(auth(chef), chef, [p]).data["id"]
    assert auth(p).post(f"/api/v1/meetings/{mid}/participants/", {"add": []}, format="json").status_code == 403
    assert auth(p).delete(f"/api/v1/meetings/{mid}/").status_code == 403
    assert auth(chef).delete(f"/api/v1/meetings/{mid}/").status_code == 204
    assert Meeting.objects.get(id=mid).status == MeetingStatus.CANCELLED


def test_close_meeting_with_minutes(auth, chef):
    mid = _mk(auth(chef), chef).data["id"]
    r = auth(chef).post(f"/api/v1/meetings/{mid}/close/", {"minutes": "Décisions prises : ..."}, format="json")
    assert r.data["status"] == "ended" and "Décisions" in r.data["minutes"]


def test_minutes_document_upload_closes_meeting(auth, chef):
    from django.core.files.uploadedfile import SimpleUploadedFile

    mid = _mk(auth(chef), chef).data["id"]
    f = SimpleUploadedFile("cr.txt", b"Compte-rendu de la reunion", content_type="text/plain")
    r = auth(chef).post(f"/api/v1/meetings/{mid}/minutes-document/", {"file": f}, format="multipart")
    assert r.status_code == 200
    assert r.data["status"] == "ended"
    assert r.data["minutes_document_detail"]["title"].startswith("Compte-rendu")


def test_minutes_document_requires_file(auth, chef):
    mid = _mk(auth(chef), chef).data["id"]
    assert auth(chef).post(f"/api/v1/meetings/{mid}/minutes-document/", {}, format="multipart").status_code == 400


def test_meeting_poll_single_choice_vote(auth, chef, make_user):
    p = make_user("voter@wagadu.africa", "employe")
    mid = _mk(auth(chef), chef, [p]).data["id"]
    poll = auth(chef).post("/api/v1/meeting-polls/", {
        "meeting": mid, "question": "Prochaine date ?", "option_labels": ["Lundi", "Mardi"],
    }, format="json")
    assert poll.status_code == 201
    opts = poll.data["options"]

    auth(p).post(f"/api/v1/meeting-polls/{poll.data['id']}/vote/", {"option": opts[0]["id"]}, format="json")
    v2 = auth(p).post(f"/api/v1/meeting-polls/{poll.data['id']}/vote/", {"option": opts[1]["id"]}, format="json")
    counts = {o["label"]: o["vote_count"] for o in v2.data["options"]}
    assert counts == {"Lundi": 0, "Mardi": 1}  # le 2e vote remplace le 1er

    auth(chef).post(f"/api/v1/meeting-polls/{poll.data['id']}/close/")
    closed = auth(p).post(f"/api/v1/meeting-polls/{poll.data['id']}/vote/", {"option": opts[0]["id"]}, format="json")
    assert closed.status_code == 400


def test_reminder_task(auth, chef, make_user):
    p = make_user("rem@wagadu.africa", "employe")
    Meeting.objects.filter(
        id=_mk(auth(chef), chef, [p], start=(timezone.now() + datetime.timedelta(minutes=10)).isoformat(),
               end=(timezone.now() + datetime.timedelta(minutes=70)).isoformat()).data["id"]
    )
    from apps.meetings.tasks import send_meeting_reminders

    assert send_meeting_reminders()["reminders"] >= 2  # organisateur + participant
    assert send_meeting_reminders()["reminders"] == 0
