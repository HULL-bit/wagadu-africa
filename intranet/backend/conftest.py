import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.permissions.models import Role


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def roles(db):
    return {r.slug: r for r in Role.objects.all()}


@pytest.fixture
def make_user(db, roles):
    def _make(email, role_slug=None, password="Wagadu2026!Hub", **extra):
        return User.objects.create_user(
            email=email,
            password=password,
            role=roles.get(role_slug) if role_slug else None,
            **extra,
        )

    return _make


@pytest.fixture
def super_admin(db):
    return User.objects.create_superuser(
        email="root@wagadu.africa", password="Wagadu2026!Hub"
    )


@pytest.fixture
def employee(make_user):
    return make_user("employe@wagadu.africa", "employe")


@pytest.fixture
def chef(make_user):
    return make_user("chef@wagadu.africa", "chef")


@pytest.fixture
def admin_user(make_user):
    return make_user("admin@wagadu.africa", "admin")


@pytest.fixture
def auth(api):
    def _auth(user):
        api.force_authenticate(user=user)
        return api

    return _auth


@pytest.fixture
def rh_user(make_user):
    return make_user("rh@wagadu.africa", "rh")


@pytest.fixture
def make_employee(db, make_user):
    _counter = {"n": 0}

    def _make(email=None, *, role_slug="employe", manager=None, **employee_kwargs):
        from apps.hr.models import Employee

        _counter["n"] += 1
        n = _counter["n"]
        user = make_user(email or f"emp{n}@wagadu.africa", role_slug, manager=manager)
        return Employee.objects.create(
            user=user,
            matricule=employee_kwargs.pop("matricule", f"WAG-{n:04d}"),
            hire_date=employee_kwargs.pop("hire_date", "2024-01-15"),
            **employee_kwargs,
        )

    return _make

