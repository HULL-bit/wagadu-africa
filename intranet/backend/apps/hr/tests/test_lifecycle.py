import pytest

from apps.audit.models import AuditLogEntry
from apps.hr.models import HrStatus, LifecycleKind, LifecycleProcess
from apps.notifications.models import Notification

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _enable_onboarding(settings):
    """Le cycle de vie RH est optionnel (désactivé par défaut) — on l'active ici."""
    settings.WAGADU = {**settings.WAGADU, "HR_AUTO_ONBOARDING": True}


def test_onboarding_auto_starts_on_employee_creation(make_employee):
    emp = make_employee("newhire@wagadu.africa")
    proc = LifecycleProcess.objects.filter(employee=emp, kind=LifecycleKind.ONBOARDING).first()
    assert proc is not None
    assert proc.items.count() == 11
    assert proc.progress["total"] == 11
    assert AuditLogEntry.objects.filter(module="hr", target_repr__icontains="Intégration").exists()


def test_offboarding_triggers_when_status_left(make_employee):
    emp = make_employee("leaver@wagadu.africa")
    emp.hr_status = HrStatus.LEFT
    emp.save()
    assert LifecycleProcess.objects.filter(employee=emp, kind=LifecycleKind.OFFBOARDING).exists()


def test_employee_can_only_toggle_own_or_assigned_items(auth, make_employee, rh_user):
    manager = make_employee("mgr-lc@wagadu.africa", role_slug="chef")
    emp = make_employee("agent-lc@wagadu.africa", manager=manager.user)
    proc = LifecycleProcess.objects.get(employee=emp, kind=LifecycleKind.ONBOARDING)

    # item dont l'employé est responsable (role=employee → résolu à emp.user)
    own_item = proc.items.filter(responsible=emp.user).first()
    assert own_item is not None
    resp = auth(emp.user).post(f"/api/v1/hr/lifecycle-items/{own_item.id}/toggle/", {"done": True}, format="json")
    assert resp.status_code == 200
    own_item.refresh_from_db()
    assert own_item.is_done and own_item.done_by == emp.user

    # item RH → l'employé ne le voit pas
    hr_item = proc.items.filter(responsible_role="hr").first()
    outsider = make_employee("outsider-lc@wagadu.africa")
    assert auth(outsider.user).post(
        f"/api/v1/hr/lifecycle-items/{hr_item.id}/toggle/", {"done": True}, format="json"
    ).status_code == 403


def test_process_completes_when_all_items_done(auth, rh_user, make_employee):
    emp = make_employee("complete-lc@wagadu.africa")
    proc = LifecycleProcess.objects.get(employee=emp, kind=LifecycleKind.ONBOARDING)
    for item in proc.items.all():
        auth(rh_user).post(f"/api/v1/hr/lifecycle-items/{item.id}/toggle/", {"done": True}, format="json")
    proc.refresh_from_db()
    assert proc.status == LifecycleProcess.Status.COMPLETED
    assert proc.completed_at is not None


def test_rh_can_list_all_processes_employee_only_own(auth, rh_user, employee, make_employee):
    make_employee("p1@wagadu.africa")
    make_employee("p2@wagadu.africa")
    assert auth(rh_user).get("/api/v1/hr/lifecycle-processes/").data["count"] >= 2
    assert auth(employee).get("/api/v1/hr/lifecycle-processes/").data["count"] == 0


def test_responsible_is_notified(make_employee):
    emp = make_employee("notif-lc@wagadu.africa")
    assert Notification.objects.filter(recipient=emp.user, type="hr_lifecycle").exists()
