import datetime

import pytest
from django.utils import timezone

from apps.audit.models import AuditLogEntry
from apps.notifications.models import Notification
from apps.tasks.models import (
    RecurringTaskTemplate,
    Task,
)
from apps.tasks.tasks import generate_recurring_tasks, send_task_deadline_reminders

pytestmark = pytest.mark.django_db


def _create_task(client, chef, assignees, **overrides):
    payload = {
        "title": "Rapport hebdomadaire",
        "description": "Rapport d'activité de la semaine",
        "priority": "high",
        "due_at": (timezone.now() + timezone.timedelta(days=3)).isoformat(),
        "assignee_ids": [str(u.id) for u in assignees],
    }
    payload.update(overrides)
    return client.post("/api/v1/tasks/", payload, format="json")


def test_employee_cannot_create_task(auth, employee):
    assert _create_task(auth(employee), employee, [employee]).status_code == 403


def test_chef_creates_task_and_assignees_are_notified(auth, chef, make_user):
    a, b = make_user("a@wagadu.africa", "employe"), make_user("b@wagadu.africa", "employe")
    resp = _create_task(auth(chef), chef, [a, b])
    assert resp.status_code == 201
    assert len(resp.data["assignments"]) == 2
    assert Notification.objects.filter(recipient=a, type="task").exists()
    assert AuditLogEntry.objects.filter(module="tasks", action="create").exists()


def test_team_assignment_snapshots_current_members(auth, chef, make_user, roles):
    from apps.organization.models import Department, Team, TeamMembership

    dept = Department.objects.create(name="Programmes", code="prog")
    team = Team.objects.create(name="Terrain", department=dept)
    m1 = make_user("m1@wagadu.africa", "employe")
    m2 = make_user("m2@wagadu.africa", "employe")
    TeamMembership.objects.create(team=team, user=m1)
    TeamMembership.objects.create(team=team, user=m2)

    resp = _create_task(auth(chef), chef, [], assigned_team=team.id)
    assert resp.status_code == 201
    assert {str(a["user"]) for a in resp.data["assignments"]} == {str(m1.id), str(m2.id)}

    # un nouveau membre n'est pas ajouté automatiquement
    m3 = make_user("m3@wagadu.africa", "employe")
    TeamMembership.objects.create(team=team, user=m3)
    task = Task.objects.get(id=resp.data["id"])
    assert not task.assignments.filter(user=m3).exists()


def test_full_submit_validate_flow_closes_task(auth, chef, make_user):
    a = make_user("agent@wagadu.africa", "employe")
    b = make_user("agent2@wagadu.africa", "employe")
    task_id = _create_task(auth(chef), chef, [a, b]).data["id"]

    r1 = auth(a).post(f"/api/v1/tasks/{task_id}/submit/", {"report": "Fait", "declared_hours": 4}, format="json")
    assert r1.status_code == 200
    assert r1.data["status"] == "in_review"
    assert Notification.objects.filter(recipient=chef, type="task").exists()

    auth(b).post(f"/api/v1/tasks/{task_id}/submit/", {"report": "OK"}, format="json")

    auth(chef).post(f"/api/v1/tasks/{task_id}/decide/", {"user": str(a.id), "decision": "validated"}, format="json")
    resp = auth(chef).post(f"/api/v1/tasks/{task_id}/decide/", {"user": str(b.id), "decision": "validated"}, format="json")
    assert resp.data["status"] == "done"
    assert Task.objects.get(id=task_id).closed_at is not None


def test_returned_submission_reopens_task(auth, chef, make_user):
    a = make_user("agent3@wagadu.africa", "employe")
    task_id = _create_task(auth(chef), chef, [a]).data["id"]
    auth(a).post(f"/api/v1/tasks/{task_id}/submit/", {"report": "v1"}, format="json")
    resp = auth(chef).post(
        f"/api/v1/tasks/{task_id}/decide/",
        {"user": str(a.id), "decision": "returned", "comment": "À compléter"}, format="json",
    )
    assert resp.data["status"] == "in_progress"
    assert Notification.objects.filter(recipient=a, title__icontains="renvoyé").exists()


def test_non_assignee_cannot_submit(auth, chef, make_user):
    a = make_user("agent4@wagadu.africa", "employe")
    other = make_user("other@wagadu.africa", "employe")
    task_id = _create_task(auth(chef), chef, [a]).data["id"]
    assert auth(other).post(
        f"/api/v1/tasks/{task_id}/submit/", {"report": "x"}, format="json"
    ).status_code in (403, 404)


def test_employee_only_sees_relevant_tasks(auth, chef, make_user):
    a = make_user("agent5@wagadu.africa", "employe")
    outsider = make_user("outsider@wagadu.africa", "employe")
    _create_task(auth(chef), chef, [a])
    assert auth(outsider).get("/api/v1/tasks/").data["count"] == 0
    assert auth(a).get("/api/v1/tasks/").data["count"] == 1


def test_mine_week_scope_filters_upcoming(auth, chef, make_user):
    a = make_user("agent6@wagadu.africa", "employe")
    _create_task(auth(chef), chef, [a], due_at=(timezone.now() + timezone.timedelta(days=2)).isoformat())
    _create_task(auth(chef), chef, [a], due_at=(timezone.now() + timezone.timedelta(days=20)).isoformat())
    resp = auth(a).get("/api/v1/tasks/mine/?scope=week")
    assert len(resp.data) == 1


def test_mine_current_scope_hides_old_done_tasks(auth, chef, make_user):
    a = make_user("agent6b@wagadu.africa", "employe")
    tid = _create_task(auth(chef), chef, [a]).data["id"]
    task = Task.objects.get(id=tid)
    task.status = "done"
    task.closed_at = timezone.now() - timezone.timedelta(days=30)
    task.save(update_fields=["status", "closed_at"])
    # tâche ouverte de la semaine
    _create_task(auth(chef), chef, [a])
    current = auth(a).get("/api/v1/tasks/mine/?scope=current").data
    assert tid not in [t["id"] for t in current]
    assert len(current) == 1


def test_history_groups_by_period(auth, chef, make_user):
    a = make_user("agent6c@wagadu.africa", "employe")
    tid = _create_task(auth(chef), chef, [a]).data["id"]
    task = Task.objects.get(id=tid)
    task.status = "done"
    task.closed_at = timezone.now() - timezone.timedelta(days=40)
    task.save(update_fields=["status", "closed_at"])
    data = auth(a).get("/api/v1/tasks/history/?granularity=month&scope=mine").data
    assert data["granularity"] == "month"
    assert sum(p["total"] for p in data["periods"]) >= 1
    assert any(p["done"] >= 1 for p in data["periods"])


def test_history_team_scope_denied_for_employee(auth, chef, make_user):
    a = make_user("agent6d@wagadu.africa", "employe")
    _create_task(auth(chef), chef, [a])
    data = auth(a).get("/api/v1/tasks/history/?scope=team").data
    assert data["scope"] == "mine"


def test_comment_notifies_the_other_party(auth, chef, make_user):
    a = make_user("agent7@wagadu.africa", "employe")
    task_id = _create_task(auth(chef), chef, [a]).data["id"]
    auth(a).post("/api/v1/task-comments/", {"task": task_id, "body": "Une question"}, format="json")
    assert Notification.objects.filter(recipient=chef, type="task", title="Nouveau commentaire").exists()


def test_duplicate_task(auth, chef, make_user):
    a = make_user("agent8@wagadu.africa", "employe")
    task_id = _create_task(auth(chef), chef, [a]).data["id"]
    resp = auth(chef).post(f"/api/v1/tasks/{task_id}/duplicate/")
    assert resp.status_code == 201
    assert "(copie)" in resp.data["title"]


def test_recurring_template_generation(auth, chef, make_user):
    a = make_user("agent9@wagadu.africa", "employe")
    template = RecurringTaskTemplate.objects.create(
        title="Point d'équipe", frequency="weekly", interval=1, weekday=0,
        lead_time_days=5, created_by=chef,
        next_due_date=timezone.now().date() + datetime.timedelta(days=3),
    )
    template.default_assignees.add(a)
    result = generate_recurring_tasks()
    assert result["generated"] == 1
    template.refresh_from_db()
    assert template.next_due_date == timezone.now().date() + datetime.timedelta(days=10)
    assert Task.objects.filter(source_template=template).count() == 1


def test_deadline_reminder_day_before(auth, chef, make_user):
    a = make_user("agent10@wagadu.africa", "employe")
    _create_task(
        auth(chef), chef, [a],
        due_at=(timezone.now() + datetime.timedelta(days=1)).replace(hour=10).isoformat(),
    )
    assert send_task_deadline_reminders()["reminders"] == 1
    assert send_task_deadline_reminders()["reminders"] == 0  # pas de doublon
    assert Notification.objects.filter(recipient=a, type="task_reminder").exists()


def test_performance_endpoint_requires_responsible(auth, employee, chef):
    assert auth(employee).get("/api/v1/tasks/performance/").status_code == 403
    assert auth(chef).get("/api/v1/tasks/performance/").status_code == 200
