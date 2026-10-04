import pytest

from apps.integrations.models import ChatAccount
from apps.integrations.rocketchat import is_configured

pytestmark = pytest.mark.django_db

RC_SETTINGS = {
    "URL": "https://chat.example.org",
    "ADMIN_USER": "admin",
    "ADMIN_PASSWORD": "secret",
}


def test_status_endpoint(auth, employee):
    resp = auth(employee).get("/api/v1/integrations/status/")
    assert resp.status_code == 200
    assert resp.data["rocketchat"]["configured"] is False
    assert resp.data["jitsi"]["configured"] is False


def test_sso_returns_503_when_not_configured(auth, employee):
    resp = auth(employee).post("/api/v1/chat/sso/", {}, format="json")
    assert resp.status_code == 503


def test_is_configured_reflects_settings(settings):
    assert is_configured() is False
    settings.WAGADU = {**settings.WAGADU, "ROCKETCHAT": RC_SETTINGS}
    assert is_configured() is True


def test_provision_user_is_noop_without_config(make_user):
    from apps.integrations.services import provision_user

    user = make_user("chatuser@wagadu.africa", "employe")
    assert provision_user(user) is None
    assert not ChatAccount.objects.filter(user=user).exists()


def test_sso_happy_path_with_mocked_rocketchat(auth, employee, settings, monkeypatch):
    settings.WAGADU = {**settings.WAGADU, "ROCKETCHAT": RC_SETTINGS}

    class FakeClient:
        def __init__(self):
            pass

        def upsert_user(self, **kw):
            assert kw["password"]
            return {"_id": "rc123", "username": "employe"}

        def login_token(self, *, username, password):
            assert username == "employe" and password
            return "sso-token-xyz"

    monkeypatch.setattr("apps.integrations.services.RocketChatClient", FakeClient)

    resp = auth(employee).post("/api/v1/chat/sso/", {}, format="json")
    assert resp.status_code == 200
    assert resp.data["auth_token"] == "sso-token-xyz"
    assert resp.data["user_id"] == "rc123"
    assert ChatAccount.objects.filter(user=employee, rc_user_id="rc123").exists()

    from apps.audit.models import AuditLogEntry

    assert AuditLogEntry.objects.filter(module="integrations", action="login").exists()


def test_channel_provisioning_signal_noop_without_config(db):
    from apps.integrations.models import ChatChannel
    from apps.organization.models import Department

    Department.objects.create(name="Comms", code="comms")
    assert not ChatChannel.objects.exists()
