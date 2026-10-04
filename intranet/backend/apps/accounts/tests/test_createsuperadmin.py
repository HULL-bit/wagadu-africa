import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from apps.accounts.models import User
from apps.audit.models import AuditLogEntry

pytestmark = pytest.mark.django_db


def test_creates_first_super_admin():
    call_command(
        "createsuperadmin",
        noinput=True,
        email="root@wagadu.africa",
        password="Wagadu2026!Hub",
    )
    user = User.objects.get(email="root@wagadu.africa")
    assert user.is_super_admin
    assert AuditLogEntry.objects.filter(
        module="accounts", action="create", severity="critical"
    ).exists()


def test_refuses_second_super_admin(super_admin):
    with pytest.raises(CommandError):
        call_command(
            "createsuperadmin",
            noinput=True,
            email="root2@wagadu.africa",
            password="Wagadu2026!Hub",
        )


def test_rejects_weak_password():
    with pytest.raises(CommandError):
        call_command(
            "createsuperadmin", noinput=True, email="root@wagadu.africa", password="weak"
        )
