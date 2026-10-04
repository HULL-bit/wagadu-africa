"""Client REST minimal pour l'API d'administration Rocket.Chat.

Configuré via ``settings.WAGADU["ROCKETCHAT"]`` :
``{"URL": ..., "ADMIN_USER": ..., "ADMIN_PASSWORD": ...}``.
Si l'URL est absente, :func:`is_configured` renvoie ``False`` et l'appelant doit
dégrader proprement (endpoints 503, UI « non configuré »).
"""
from __future__ import annotations

import hashlib
import hmac

import requests
from django.conf import settings
from django.core.cache import cache

TIMEOUT = 10


def derived_password(user) -> str:
    """Mot de passe Rocket.Chat déterministe par utilisateur (jamais stocké).

    Dérivé de ``SECRET_KEY`` : reproductible côté serveur pour ré-authentifier
    l'utilisateur et émettre un jeton SSO, sans conserver de secret en base.
    """
    digest = hmac.new(
        settings.SECRET_KEY.encode(), f"rocketchat:{user.pk}".encode(), hashlib.sha256
    ).hexdigest()
    return f"Wh1!{digest[:28]}"  # respecte la politique de complexité RC


class RocketChatError(RuntimeError):
    pass


def _conf() -> dict:
    return settings.WAGADU.get("ROCKETCHAT", {})


def is_configured() -> bool:
    c = _conf()
    return bool(c.get("URL") and c.get("ADMIN_USER") and c.get("ADMIN_PASSWORD"))


class RocketChatClient:
    def __init__(self):
        if not is_configured():
            raise RocketChatError("Rocket.Chat n'est pas configuré.")
        c = _conf()
        # Appels serveur→RC : URL interne (réseau Docker) si fournie.
        self.base = (c.get("API_URL") or c["URL"]).rstrip("/")
        self._auth = None

    # --- Authentification admin (jeton mis en cache) ---
    def _login(self) -> dict:
        cached = cache.get("rc_admin_auth")
        if cached:
            return cached
        resp = requests.post(
            f"{self.base}/api/v1/login",
            json={"user": _conf()["ADMIN_USER"], "password": _conf()["ADMIN_PASSWORD"]},
            timeout=TIMEOUT,
        )
        data = self._json(resp)
        auth = {
            "X-Auth-Token": data["data"]["authToken"],
            "X-User-Id": data["data"]["userId"],
        }
        cache.set("rc_admin_auth", auth, 60 * 30)
        return auth

    def _headers(self) -> dict:
        if self._auth is None:
            self._auth = self._login()
        return self._auth

    @staticmethod
    def _json(resp) -> dict:
        try:
            body = resp.json()
        except ValueError as exc:
            raise RocketChatError(f"Réponse non-JSON ({resp.status_code}).") from exc
        if not resp.ok or body.get("success") is False:
            raise RocketChatError(body.get("error") or f"Erreur HTTP {resp.status_code}")
        return body

    def _post(self, path: str, payload: dict) -> dict:
        return self._json(requests.post(
            f"{self.base}/api/v1/{path}", json=payload,
            headers=self._headers(), timeout=TIMEOUT,
        ))

    def _get(self, path: str, params: dict | None = None) -> dict:
        return self._json(requests.get(
            f"{self.base}/api/v1/{path}", params=params or {},
            headers=self._headers(), timeout=TIMEOUT,
        ))

    # --- Utilisateurs ---
    def upsert_user(self, *, email: str, name: str, username: str, password: str) -> dict:
        """Crée le compte RC ou aligne son mot de passe sur `password` (dérivé)."""
        existing = requests.get(
            f"{self.base}/api/v1/users.info", params={"username": username},
            headers=self._headers(), timeout=TIMEOUT,
        )
        if existing.ok and existing.json().get("success"):
            user = existing.json()["user"]
            self._post("users.update", {
                "userId": user["_id"],
                "data": {"password": password, "verified": True, "requirePasswordChange": False},
            })
            return user
        body = self._post("users.create", {
            "email": email, "name": name, "username": username,
            "password": password,
            "requirePasswordChange": False, "verified": True,
            "joinDefaultChannels": True,
        })
        return body["user"]

    def login_token(self, *, username: str, password: str) -> str:
        """Jeton d'authentification pour l'iframe (`login-with-token` côté client)."""
        resp = requests.post(
            f"{self.base}/api/v1/login",
            json={"user": username, "password": password},
            timeout=TIMEOUT,
        )
        return self._json(resp)["data"]["authToken"]

    def set_status(self, *, user_id: str, status: str, message: str = "") -> None:
        self._post("users.setStatus", {"userId": user_id, "status": status, "message": message})

    # --- Canaux ---
    def create_channel(self, *, name: str, members: list[str] | None = None) -> dict:
        body = self._post("channels.create", {"name": name, "members": members or []})
        return body["channel"]
