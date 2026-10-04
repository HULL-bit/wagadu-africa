"""Réglages de production."""
# ruff: noqa: F403, F405
from .base import *  # noqa

DEBUG = False

if SECRET_KEY == "dev-insecure-change-me":  # pragma: no cover
    raise RuntimeError("DJANGO_SECRET_KEY doit être défini en production.")

SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS")

CELERY_TASK_ALWAYS_EAGER = False
