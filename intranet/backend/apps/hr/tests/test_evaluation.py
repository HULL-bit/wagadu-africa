import pytest

from apps.hr.models import (
    CareerEvent,
    Evaluation,
    EvaluationCampaign,
    EvaluationForm,
)
from apps.notifications.models import Notification

pytestmark = pytest.mark.django_db


@pytest.fixture
def form(db):
    return EvaluationForm.objects.get(name="Évaluation de performance annuelle")


@pytest.fixture
def campaign(db, form, rh_user):
    return EvaluationCampaign.objects.create(
        name="Évaluation 2026", form=form,
        period_start="2026-01-01", period_end="2026-12-31", created_by=rh_user,
    )


def _rating_answers(form):
    return {str(q.id): "4" for q in form.questions.filter(type="rating_1_5")}


def test_rh_only_manages_forms_and_campaigns(auth, employee, rh_user, form):
    assert auth(employee).post("/api/v1/hr/evaluation-forms/", {"name": "X"}, format="json").status_code == 403
    assert auth(rh_user).get("/api/v1/hr/evaluation-campaigns/").status_code == 200


def test_open_campaign_creates_evaluations_and_notifies(auth, rh_user, campaign, make_employee):
    manager = make_employee("evmgr@wagadu.africa", role_slug="chef")
    emp = make_employee("evagent@wagadu.africa", manager=manager.user)

    resp = auth(rh_user).post(f"/api/v1/hr/evaluation-campaigns/{campaign.id}/open/")
    assert resp.status_code == 200 and resp.data["status"] == "open"
    ev = Evaluation.objects.get(campaign=campaign, employee=emp)
    assert ev.evaluator == manager.user
    assert Notification.objects.filter(recipient=emp.user, type="evaluation").exists()


def test_full_cycle_self_manager_ack_finalize(auth, rh_user, campaign, form, make_employee):
    manager = make_employee("cyc-mgr@wagadu.africa", role_slug="chef")
    emp = make_employee("cyc-agent@wagadu.africa", manager=manager.user)
    auth(rh_user).post(f"/api/v1/hr/evaluation-campaigns/{campaign.id}/open/")
    ev = Evaluation.objects.get(campaign=campaign, employee=emp)

    r1 = auth(emp.user).post(f"/api/v1/hr/evaluations/{ev.id}/self-assess/",
                             {"answers": _rating_answers(form), "comment": "Bonne année"}, format="json")
    assert r1.data["status"] == "self_assessed"
    assert float(r1.data["self_score"]) == 4.0

    r2 = auth(manager.user).post(f"/api/v1/hr/evaluations/{ev.id}/manager-assess/",
                                 {"answers": dict.fromkeys(_rating_answers(form), "3"), "comment": "À confirmer"}, format="json")
    assert r2.data["status"] == "manager_assessed"
    assert float(r2.data["manager_score"]) == 3.0

    r3 = auth(emp.user).post(f"/api/v1/hr/evaluations/{ev.id}/acknowledge/", {"comment": "Vu"}, format="json")
    assert r3.data["status"] == "acknowledged"

    r4 = auth(rh_user).post(f"/api/v1/hr/evaluations/{ev.id}/finalize/")
    assert r4.data["status"] == "finalized"
    assert CareerEvent.objects.filter(employee=emp, title__icontains="Évaluation").exists()


def test_manager_cannot_assess_before_self(auth, rh_user, campaign, form, make_employee):
    manager = make_employee("early-mgr@wagadu.africa", role_slug="chef")
    emp = make_employee("early-agent@wagadu.africa", manager=manager.user)
    auth(rh_user).post(f"/api/v1/hr/evaluation-campaigns/{campaign.id}/open/")
    ev = Evaluation.objects.get(campaign=campaign, employee=emp)
    assert auth(manager.user).post(
        f"/api/v1/hr/evaluations/{ev.id}/manager-assess/", {"answers": {}}, format="json"
    ).status_code == 400


def test_other_manager_cannot_assess(auth, rh_user, campaign, form, make_employee, chef):
    manager = make_employee("m-a@wagadu.africa", role_slug="chef")
    emp = make_employee("e-a@wagadu.africa", manager=manager.user)
    auth(rh_user).post(f"/api/v1/hr/evaluation-campaigns/{campaign.id}/open/")
    ev = Evaluation.objects.get(campaign=campaign, employee=emp)
    auth(emp.user).post(f"/api/v1/hr/evaluations/{ev.id}/self-assess/", {"answers": _rating_answers(form)}, format="json")
    assert auth(chef).post(
        f"/api/v1/hr/evaluations/{ev.id}/manager-assess/", {"answers": {}}, format="json"
    ).status_code in (403, 404)


def test_mine_and_to_evaluate_endpoints(auth, rh_user, campaign, form, make_employee):
    manager = make_employee("te-mgr@wagadu.africa", role_slug="chef")
    emp = make_employee("te-agent@wagadu.africa", manager=manager.user)
    auth(rh_user).post(f"/api/v1/hr/evaluation-campaigns/{campaign.id}/open/")
    ev = Evaluation.objects.get(campaign=campaign, employee=emp)

    assert len(auth(emp.user).get("/api/v1/hr/evaluations/mine/").data) == 1
    assert len(auth(manager.user).get("/api/v1/hr/evaluations/to-evaluate/").data) == 0
    auth(emp.user).post(f"/api/v1/hr/evaluations/{ev.id}/self-assess/", {"answers": _rating_answers(form)}, format="json")
    assert len(auth(manager.user).get("/api/v1/hr/evaluations/to-evaluate/").data) == 1
