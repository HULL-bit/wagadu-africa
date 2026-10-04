from __future__ import annotations

import re

from apps.audit.models import AuditAction
from apps.audit.services import record

from .models import ChatAccount, ChatChannel
from .rocketchat import RocketChatClient, RocketChatError, derived_password, is_configured


def _username_for(user) -> str:
    base = re.sub(r"[^a-z0-9._-]", "", (user.email.split("@")[0] or "user").lower())
    return base or f"user{str(user.id)[:6]}"


def provision_user(user) -> ChatAccount | None:
    """Crée/rafraîchit le compte Rocket.Chat lié. No-op si RC non configuré."""
    if not is_configured() or not user.is_active:
        return None
    try:
        client = RocketChatClient()
        rc_user = client.upsert_user(
            email=user.email,
            name=user.get_full_name() or user.email,
            username=_username_for(user),
            password=derived_password(user),
        )
    except RocketChatError:
        return None
    account, _ = ChatAccount.objects.update_or_create(
        user=user,
        defaults={"rc_user_id": rc_user["_id"], "rc_username": rc_user["username"]},
    )
    return account


def issue_sso_token(user) -> dict:
    if not is_configured():
        raise RocketChatError("Messagerie non configurée.")
    account = provision_user(user)
    if account is None:
        raise RocketChatError("Impossible de provisionner le compte messagerie.")
    client = RocketChatClient()
    token = client.login_token(username=account.rc_username, password=derived_password(user))
    from django.conf import settings

    record(action=AuditAction.LOGIN, module="integrations", actor=user,
           message="Connexion SSO à la messagerie")
    return {
        "url": settings.WAGADU["ROCKETCHAT"]["URL"],
        "user_id": account.rc_user_id,
        "auth_token": token,
    }


def provision_channel(*, name: str, kind: str, department=None, team=None) -> ChatChannel | None:
    channel, _ = ChatChannel.objects.get_or_create(
        kind=kind, department=department, team=team,
        defaults={"name": name},
    )
    if channel.rc_room_id or not is_configured():
        return channel
    try:
        room = RocketChatClient().create_channel(name=_slug(name))
        channel.rc_room_id = room["_id"]
        channel.save(update_fields=["rc_room_id"])
    except RocketChatError:
        pass
    return channel


def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9-]", "-", name.lower()).strip("-")[:60]
