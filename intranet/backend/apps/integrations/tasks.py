from __future__ import annotations

from celery import shared_task

from .rocketchat import is_configured


@shared_task
def provision_chat_user(user_id: str) -> dict:
    if not is_configured():
        return {"skipped": "rocketchat_not_configured"}
    from apps.accounts.models import User

    from .services import provision_user

    user = User.objects.filter(id=user_id).first()
    if not user:
        return {"error": "user_not_found"}
    account = provision_user(user)
    return {"provisioned": bool(account)}


@shared_task
def provision_chat_channel(*, name: str, kind: str, department_id=None, team_id=None) -> dict:
    if not is_configured():
        return {"skipped": "rocketchat_not_configured"}
    from apps.organization.models import Department, Team

    from .services import provision_channel

    provision_channel(
        name=name, kind=kind,
        department=Department.objects.filter(id=department_id).first() if department_id else None,
        team=Team.objects.filter(id=team_id).first() if team_id else None,
    )
    return {"provisioned": True}
