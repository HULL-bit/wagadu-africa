"""Génération du lien et du jeton Jitsi.

Si ``JITSI_APP_ID`` et ``JITSI_APP_SECRET`` sont configurés, un JWT est émis :
l'organisateur devient modérateur, l'accès est réservé aux personnes invitées.
Sinon, seul le lien de salle est fourni (instance publique / sans auth).
"""
from __future__ import annotations

import time

import jwt
from django.conf import settings


def _jitsi_conf() -> dict:
    return settings.WAGADU.get("JITSI", {})


def is_configured() -> bool:
    return bool(_jitsi_conf().get("URL"))


def has_jwt() -> bool:
    conf = _jitsi_conf()
    return bool(conf.get("APP_ID") and conf.get("APP_SECRET"))


def build_token(meeting, user, *, moderator: bool) -> str | None:
    if not has_jwt():
        return None
    conf = _jitsi_conf()
    now = int(time.time())
    payload = {
        "aud": conf.get("APP_ID"),
        "iss": conf.get("APP_ID"),
        "sub": conf.get("DOMAIN") or _domain_from_url(conf["URL"]),
        "room": meeting.room_slug,
        "iat": now,
        "nbf": now - 10,
        "exp": now + 4 * 3600,
        "context": {
            "user": {
                "id": str(user.id),
                "name": user.get_full_name() or user.email,
                "email": user.email,
                "moderator": moderator,
            },
            "features": {"recording": moderator, "livestreaming": False},
        },
    }
    return jwt.encode(payload, conf["APP_SECRET"], algorithm="HS256")


def _domain_from_url(url: str) -> str:
    return url.replace("https://", "").replace("http://", "").split("/")[0]
