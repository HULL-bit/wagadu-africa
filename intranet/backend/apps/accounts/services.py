from __future__ import annotations

import re

import pyotp
from django.utils import timezone
from rest_framework import serializers

from .models import LoginAttempt, PasswordPolicy, User


def validate_password_strength(password: str, user: User | None = None) -> None:
    policy = PasswordPolicy.get_solo()
    errors: list[str] = []
    if len(password) < policy.min_length:
        errors.append(f"Au moins {policy.min_length} caractères.")
    if policy.require_uppercase and not re.search(r"[A-Z]", password):
        errors.append("Au moins une majuscule.")
    if policy.require_lowercase and not re.search(r"[a-z]", password):
        errors.append("Au moins une minuscule.")
    if policy.require_digit and not re.search(r"\d", password):
        errors.append("Au moins un chiffre.")
    if policy.require_symbol and not re.search(r"[^\w\s]", password):
        errors.append("Au moins un caractère spécial.")
    if user and user.email and user.email.split("@")[0].lower() in password.lower():
        errors.append("Le mot de passe ne doit pas contenir l'identifiant.")
    if errors:
        raise serializers.ValidationError(errors)


def password_expired(user: User) -> bool:
    policy = PasswordPolicy.get_solo()
    if not policy.expiry_days:
        return False
    return user.last_password_change < timezone.now() - timezone.timedelta(
        days=policy.expiry_days
    )


def set_password(user: User, raw_password: str) -> None:
    validate_password_strength(raw_password, user)
    user.set_password(raw_password)
    user.last_password_change = timezone.now()
    user.reset_login_failures()
    user.save(update_fields=["password", "last_password_change"])


def record_login_attempt(email: str, request, *, user: User | None, success: bool) -> None:
    xff = request.META.get("HTTP_X_FORWARDED_FOR", "") if request else ""
    ip = (
        xff.split(",")[0].strip()
        if xff
        else (request.META.get("REMOTE_ADDR") if request else None)
    )
    LoginAttempt.objects.create(
        user=user,
        email_tried=email,
        successful=success,
        ip_address=ip,
        user_agent=(request.META.get("HTTP_USER_AGENT", "")[:255] if request else ""),
    )


# --- 2FA (socle) ---------------------------------------------------------
def generate_totp_secret() -> str:
    return pyotp.random_base32()


def totp_provisioning_uri(user: User, secret: str) -> str:
    return pyotp.TOTP(secret).provisioning_uri(
        name=user.email, issuer_name="Wagadu Hub"
    )


def verify_totp(secret: str, code: str) -> bool:
    if not secret:
        return False
    return pyotp.TOTP(secret).verify(code, valid_window=1)
