import datetime

import pytest
from django.utils import timezone

from apps.agenda.models import CalendarEvent, EventReminder
from apps.agenda.tasks import send_event_reminders
from apps.notifications.models import Notification

pytestmark = pytest.mark.django_db


def _range(days=30):
    now = timezone.now()
    fmt = "%Y-%m-%dT%H:%M:%S"
    return now.strftime(fmt), (now + datetime.timedelta(days=days)).strftime(fmt)


def test_create_personal_event_with_reminder(auth, employee):
    start = (timezone.now() + datetime.timedelta(days=1)).isoformat()
    end = (timezone.now() + datetime.timedelta(days=1, hours=1)).isoformat()
    resp = auth(employee).post("/api/v1/agenda/events/", {
        "title": "RDV dentiste", "start": start, "end": end,
        "reminders": [{"minutes_before": 30, "channel": "notification"}],
    }, format="json")
    assert resp.status_code == 201
    assert resp.data["display_color"]
    assert EventReminder.objects.filter(event_id=resp.data["id"]).count() == 1


def test_feed_merges_tasks_meetings_leaves(auth, chef, make_employee, rh_user):
    from apps.hr.models import LeaveRequest, LeaveStatus, LeaveType

    emp = make_employee("a@wagadu.africa", manager=chef)
    agent = emp.user

    # tâche
    task = auth(chef).post("/api/v1/tasks/", {
        "title": "Livrable", "due_at": (timezone.now() + datetime.timedelta(days=2)).isoformat(),
        "assignee_ids": [str(agent.id)],
    }, format="json")
    assert task.status_code == 201

    # réunion
    mt = auth(chef).post("/api/v1/meetings/", {
        "title": "Point équipe",
        "start": (timezone.now() + datetime.timedelta(days=1)).isoformat(),
        "end": (timezone.now() + datetime.timedelta(days=1, hours=1)).isoformat(),
        "participant_ids": [str(agent.id)],
    }, format="json")
    assert mt.status_code == 201

    # congé approuvé
    LeaveRequest.objects.create(
        employee=emp, leave_type=LeaveType.objects.get(code="annuel"),
        start_date=(timezone.now() + datetime.timedelta(days=5)).date(),
        end_date=(timezone.now() + datetime.timedelta(days=6)).date(),
        status=LeaveStatus.APPROVED, working_days=2,
    )

    start, end = _range()
    feed = auth(agent).get(f"/api/v1/agenda/?start={start}&end={end}")
    types = {i["type"] for i in feed.data}
    assert {"task", "meeting", "leave"} <= types
    assert all(i["editable"] is False for i in feed.data if i["type"] != "personal")


def test_feed_requires_range(auth, employee):
    assert auth(employee).get("/api/v1/agenda/").status_code == 400


def test_invite_and_respond(auth, employee, chef):
    start = (timezone.now() + datetime.timedelta(days=1)).isoformat()
    end = (timezone.now() + datetime.timedelta(days=1, hours=1)).isoformat()
    ev = auth(chef).post("/api/v1/agenda/events/", {
        "title": "Atelier", "start": start, "end": end,
        "visibility": "shared", "attendee_ids": [str(employee.id)],
    }, format="json").data
    assert Notification.objects.filter(recipient=employee, type="agenda").exists()

    resp = auth(employee).post(f"/api/v1/agenda/events/{ev['id']}/respond/", {"response": "accepted"}, format="json")
    assert resp.status_code == 200
    assert resp.data["my_response"] == "accepted"


def test_non_owner_cannot_edit(auth, employee, chef):
    ev = auth(chef).post("/api/v1/agenda/events/", {
        "title": "X", "start": timezone.now().isoformat(),
        "end": (timezone.now() + datetime.timedelta(hours=1)).isoformat(),
        "attendee_ids": [str(employee.id)],
    }, format="json").data
    assert auth(employee).patch(f"/api/v1/agenda/events/{ev['id']}/", {"title": "hack"}, format="json").status_code == 403


def test_ical_export_and_import_roundtrip(auth, employee):
    auth(employee).post("/api/v1/agenda/events/", {
        "title": "Réunion budget",
        "start": (timezone.now() + datetime.timedelta(days=1)).isoformat(),
        "end": (timezone.now() + datetime.timedelta(days=1, hours=2)).isoformat(),
    }, format="json")
    export = auth(employee).get("/api/v1/agenda/export.ics")
    assert export.status_code == 200
    assert b"BEGIN:VCALENDAR" in export.content
    assert "Réunion budget" in export.content.decode("utf-8")

    # import d'un .ics tiers
    ics = (
        b"BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Test//EN\r\n"
        b"BEGIN:VEVENT\r\nUID:ext-1@example.com\r\nSUMMARY:Conf externe\r\n"
        b"DTSTART:20260910T090000Z\r\nDTEND:20260910T100000Z\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n"
    )
    from django.core.files.uploadedfile import SimpleUploadedFile

    imp = auth(employee).post("/api/v1/agenda/import/",
                              {"file": SimpleUploadedFile("c.ics", ics)}, format="multipart")
    assert imp.status_code == 201 and imp.data["imported"] == 1
    assert CalendarEvent.objects.filter(owner=employee, title="Conf externe").exists()


def test_reminder_task_fires_in_window(auth, employee):
    start = timezone.now() + datetime.timedelta(minutes=10)
    ev = CalendarEvent.objects.create(
        owner=employee, title="Bientôt", start=start, end=start + datetime.timedelta(hours=1),
    )
    EventReminder.objects.create(event=ev, minutes_before=15, channel="notification")
    assert send_event_reminders()["reminders"] == 1
    assert send_event_reminders()["reminders"] == 0
    assert Notification.objects.filter(recipient=employee, type="agenda_reminder").exists()


def test_team_view_for_manager(auth, chef, make_employee):
    make_employee("r1@wagadu.africa", manager=chef)
    start, end = _range()
    resp = auth(chef).get(f"/api/v1/agenda/team/?start={start}&end={end}")
    assert resp.status_code == 200 and len(resp.data) == 1
