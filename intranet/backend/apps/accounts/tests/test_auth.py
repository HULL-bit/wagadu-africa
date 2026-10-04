import pytest
from django.conf import settings

from apps.accounts.models import LoginAttempt
from apps.audit.models import AuditLogEntry

pytestmark = pytest.mark.django_db

PWD = "Wagadu2026!Hub"


def test_login_returns_tokens_and_user(api, employee):
    resp = api.post(
        "/api/v1/auth/login/",
        {"email": employee.email, "password": PWD},
        format="json",
    )
    assert resp.status_code == 200
    assert "access" in resp.data and "refresh" in resp.data
    assert resp.data["user"]["email"] == employee.email
    assert AuditLogEntry.objects.filter(action="login", actor=employee).exists()


def test_login_wrong_password_records_failure(api, employee):
    resp = api.post(
        "/api/v1/auth/login/",
        {"email": employee.email, "password": "nope"},
        format="json",
    )
    assert resp.status_code == 400
    employee.refresh_from_db()
    assert employee.failed_login_count == 1
    assert LoginAttempt.objects.filter(email_tried=employee.email, successful=False).count() == 1


def test_account_locks_after_threshold(api, employee):
    threshold = settings.WAGADU["LOGIN_MAX_FAILED_ATTEMPTS"]
    for _ in range(threshold):
        api.post(
            "/api/v1/auth/login/",
            {"email": employee.email, "password": "nope"},
            format="json",
        )
    employee.refresh_from_db()
    assert employee.is_locked
    resp = api.post(
        "/api/v1/auth/login/",
        {"email": employee.email, "password": PWD},
        format="json",
    )
    assert resp.status_code == 400
    assert "verrouill" in str(resp.data).lower()


def test_successful_login_resets_failures(api, employee):
    api.post("/api/v1/auth/login/", {"email": employee.email, "password": "x"}, format="json")
    api.post("/api/v1/auth/login/", {"email": employee.email, "password": PWD}, format="json")
    employee.refresh_from_db()
    assert employee.failed_login_count == 0


def test_change_password_enforces_policy(auth, employee):
    resp = auth(employee).post(
        "/api/v1/auth/change-password/",
        {"current_password": PWD, "new_password": "short"},
        format="json",
    )
    assert resp.status_code == 400


def test_change_password_success(auth, employee):
    resp = auth(employee).post(
        "/api/v1/auth/change-password/",
        {"current_password": PWD, "new_password": "N0uveau!MotDePasse"},
        format="json",
    )
    assert resp.status_code == 200
    employee.refresh_from_db()
    assert employee.check_password("N0uveau!MotDePasse")


def test_logout_blacklists_refresh(api, employee):
    login = api.post(
        "/api/v1/auth/login/",
        {"email": employee.email, "password": PWD},
        format="json",
    )
    refresh = login.data["refresh"]
    api.force_authenticate(user=employee)
    resp = api.post("/api/v1/auth/logout/", {"refresh": refresh}, format="json")
    assert resp.status_code == 205
    api.force_authenticate(user=None)
    again = api.post("/api/v1/auth/refresh/", {"refresh": refresh}, format="json")
    assert again.status_code == 401


def test_me_self_service_update_is_audited(auth, employee):
    resp = auth(employee).patch(
        "/api/v1/auth/me/", {"phone": "+221770000000"}, format="json"
    )
    assert resp.status_code == 200
    employee.refresh_from_db()
    assert employee.phone == "+221770000000"
    assert AuditLogEntry.objects.filter(action="update", actor=employee, module="accounts").exists()


def test_login_view_declares_auth_throttle_scope():
    """La limitation de débit est câblée sur les endpoints d'authentification
    (désactivée en dev/test, active en production — voir settings.base)."""
    from rest_framework.throttling import ScopedRateThrottle

    from apps.accounts.views import ChangePasswordView, LoginView

    assert LoginView.throttle_scope == "auth"
    assert ChangePasswordView.throttle_scope == "auth"

    throttle = ScopedRateThrottle()
    throttle.scope = "auth"
    throttle.rate = "5/min"
    num, _period = throttle.parse_rate("10/min")
    assert num == 10


def test_2fa_enable_verify_flow(auth, employee):
    import pyotp

    client = auth(employee)
    enable = client.post("/api/v1/auth/2fa/enable/", {}, format="json")
    assert enable.status_code == 200
    secret = enable.data["secret"]
    code = pyotp.TOTP(secret).now()
    verify = client.post("/api/v1/auth/2fa/verify/", {"code": code}, format="json")
    assert verify.status_code == 200
    employee.refresh_from_db()
    assert employee.is_2fa_enabled
