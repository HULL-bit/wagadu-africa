"""Réglages communs à tous les environnements de Wagadu Hub."""
from __future__ import annotations

import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent

load_dotenv(BASE_DIR.parent / "infra" / ".env")
load_dotenv(BASE_DIR / ".env")


def env(key: str, default: str | None = None) -> str | None:
    return os.environ.get(key, default)


def env_bool(key: str, default: bool = False) -> bool:
    return str(os.environ.get(key, default)).lower() in {"1", "true", "yes", "on"}


def env_list(key: str, default: str = "") -> list[str]:
    raw = os.environ.get(key, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


SECRET_KEY = env("DJANGO_SECRET_KEY", "dev-insecure-change-me")
DEBUG = env_bool("DJANGO_DEBUG", False)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

# --- Applications ---------------------------------------------------------
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "django_celery_beat",
]

LOCAL_APPS = [
    "apps.accounts",
    "apps.organization",
    "apps.permissions",
    "apps.audit",
    "apps.notifications",
    "apps.dashboard",
    "apps.validation",
    "apps.hr",
    "apps.correspondence",
    "apps.tasks",
    "apps.documents",
    "apps.agenda",
    "apps.meetings",
    "apps.integrations",
    "apps.messaging",
    "apps.projects",
    "apps.availability",
    "apps.demands",
    "apps.engagement",
    "apps.search",
    "apps.reports",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.audit.middleware.CurrentRequestMiddleware",
]

ROOT_URLCONF = "wagadu.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "wagadu.wsgi.application"
ASGI_APPLICATION = "wagadu.asgi.application"

# --- Base de données -----------------------------------------------------
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("POSTGRES_DB", "wagadu"),
        "USER": env("POSTGRES_USER", "wagadu"),
        "PASSWORD": env("POSTGRES_PASSWORD", "wagadu"),
        "HOST": env("POSTGRES_HOST", "localhost"),
        "PORT": env("POSTGRES_PORT", "5432"),
        "CONN_MAX_AGE": 60,
    }
}

# --- Authentification ---------------------------------------------------
AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 10},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- Internationalisation --------------------------------------------------
LANGUAGE_CODE = "fr"
LANGUAGES = [("fr", "Français"), ("en", "English")]
LOCALE_PATHS = [BASE_DIR / "locale"]
TIME_ZONE = env("DJANGO_TIME_ZONE", "Africa/Dakar")
USE_I18N = True
USE_TZ = True

# --- Fichiers statiques / médias ----------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Fichiers utilisateurs : stockage objet S3-compatible (Cloudflare R2 en prod)
# dès qu'une clé d'accès est fournie ; disque local sinon (développement).
# Les variables gardent le préfixe MINIO_ pour compat historique ; pour R2 :
#   MINIO_ENDPOINT=https://<account>.r2.cloudflarestorage.com
#   MINIO_REGION=auto   MINIO_USE_SSL=1
if env("MINIO_ACCESS_KEY"):
    _default_storage = {
        "BACKEND": "storages.backends.s3.S3Storage",
        "OPTIONS": {
            "bucket_name": env("MINIO_BUCKET", "wagadu-hub"),
            "endpoint_url": env("MINIO_ENDPOINT", "http://minio:9000"),
            "access_key": env("MINIO_ACCESS_KEY"),
            "secret_key": env("MINIO_SECRET_KEY"),
            "region_name": env("MINIO_REGION", "auto"),
            "use_ssl": env_bool("MINIO_USE_SSL", True),
            "addressing_style": "path",
            "file_overwrite": False,
            "querystring_auth": True,
            "signature_version": "s3v4",
        },
    }
    # URL publique fixe si un domaine personnalisé R2 est branché (bucket public) :
    if env("MEDIA_PUBLIC_DOMAIN"):
        _default_storage["OPTIONS"]["custom_domain"] = env("MEDIA_PUBLIC_DOMAIN")
        _default_storage["OPTIONS"]["querystring_auth"] = False
else:
    _default_storage = {"BACKEND": "django.core.files.storage.FileSystemStorage"}

STORAGES = {
    "default": _default_storage,
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"
    },
}
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "mediafiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Django REST Framework ---------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.LimitOffsetPagination",
    "PAGE_SIZE": 25,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.ScopedRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "auth": "10/min",
        "api": "1000/hour",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Wagadu Hub API",
    "DESCRIPTION": "API interne de Wagadu Africa — plateforme Wagadu Hub.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# --- CORS -------------------------------------------------------------
CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost"
)
CORS_ALLOW_CREDENTIALS = True

# --- Cache ---------------------------------------------------------
if env("REDIS_URL"):
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": env("REDIS_URL"),
        }
    }
else:
    CACHES = {
        "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}
    }

# --- Celery ---------------------------------------------------------
CELERY_BROKER_URL = env("REDIS_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = env("REDIS_URL", "redis://localhost:6379/0")
CELERY_TASK_ALWAYS_EAGER = env_bool("CELERY_TASK_ALWAYS_EAGER", False)
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
CELERY_TIMEZONE = TIME_ZONE

from celery.schedules import crontab  # noqa: E402

CELERY_BEAT_SCHEDULE = {
    "purge-audit-log": {
        "task": "apps.audit.tasks.purge_audit_log",
        "schedule": crontab(hour=3, minute=0),
    },
    "check-contract-expirations": {
        "task": "apps.hr.tasks.check_contract_expirations",
        "schedule": crontab(hour=7, minute=0),
    },
    "check-health-record-renewals": {
        "task": "apps.hr.tasks.check_health_record_renewals",
        "schedule": crontab(hour=7, minute=15),
    },
    "remind-untreated-mail": {
        "task": "apps.correspondence.tasks.remind_untreated_mail",
        "schedule": crontab(hour=8, minute=0),
    },
    "generate-recurring-tasks": {
        "task": "apps.tasks.tasks.generate_recurring_tasks",
        "schedule": crontab(hour=6, minute=0),
    },
    "task-deadline-reminders": {
        "task": "apps.tasks.tasks.send_task_deadline_reminders",
        "schedule": crontab(hour=6, minute=30),
    },
    "purge-trashed-documents": {
        "task": "apps.documents.tasks.purge_trashed_documents",
        "schedule": crontab(hour=3, minute=30),
    },
    "meeting-reminders": {
        "task": "apps.meetings.tasks.send_meeting_reminders",
        "schedule": crontab(minute="*/5"),
    },
    "close-stale-meetings": {
        "task": "apps.meetings.tasks.close_stale_meetings",
        "schedule": crontab(minute=0),
    },
    "agenda-event-reminders": {
        "task": "apps.agenda.tasks.send_event_reminders",
        "schedule": crontab(minute="*/2"),
    },
    "notification-digest-daily": {
        "task": "apps.notifications.tasks.send_notification_digests",
        "schedule": crontab(hour=18, minute=0),
        "args": ("daily",),
    },
    "notification-digest-weekly": {
        "task": "apps.notifications.tasks.send_notification_digests",
        "schedule": crontab(hour=17, minute=0, day_of_week=5),
        "args": ("weekly",),
    },
}

# --- E-mail ---------------------------------------------------------
EMAIL_BACKEND = env(
    "DJANGO_EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend"
)
EMAIL_HOST = env("EMAIL_HOST", "")
EMAIL_PORT = int(env("EMAIL_PORT", "587"))
EMAIL_HOST_USER = env("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", "wagadu-hub@wagadu.africa")

# --- Stockage objet (MinIO / S3) --------------------------------------
AWS_ACCESS_KEY_ID = env("MINIO_ACCESS_KEY", "")
AWS_SECRET_ACCESS_KEY = env("MINIO_SECRET_KEY", "")
AWS_STORAGE_BUCKET_NAME = env("MINIO_BUCKET", "wagadu-hub")
AWS_S3_ENDPOINT_URL = env("MINIO_ENDPOINT", "http://minio:9000")
AWS_S3_REGION_NAME = env("MINIO_REGION", "us-east-1")
AWS_S3_USE_SSL = env_bool("MINIO_USE_SSL", False)

# --- Réglages métier Wagadu Hub -------------------------------------
WAGADU = {
    "SUPER_ADMIN_MAX": 2,
    "AUDIT_RETENTION_DAYS": 365,  # 12 mois glissants
    "LOGIN_MAX_FAILED_ATTEMPTS": 5,
    "LOGIN_LOCKOUT_MINUTES": 15,
    "DOC_TRASH_RETENTION_DAYS": 30,
    # --- Intégrations temps réel (Phase 5) — vides = désactivées ---
    "ROCKETCHAT": {
        # URL publique (iframe côté navigateur)
        "URL": env("ROCKETCHAT_URL", ""),
        # URL interne pour les appels API serveur→RC (réseau Docker) ;
        # à défaut, on réutilise URL.
        "API_URL": env("ROCKETCHAT_API_URL", "") or env("ROCKETCHAT_URL", ""),
        "ADMIN_USER": env("ROCKETCHAT_ADMIN_USER", ""),
        "ADMIN_PASSWORD": env("ROCKETCHAT_ADMIN_PASSWORD", ""),
    },
    "JITSI": {
        "URL": env("JITSI_URL", ""),
        "DOMAIN": env("JITSI_DOMAIN", ""),
        "APP_ID": env("JITSI_APP_ID", ""),
        "APP_SECRET": env("JITSI_APP_SECRET", ""),
    },
}

# --- Sécurité (renforcée en prod) -----------------------------------
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = False

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"simple": {"format": "[{levelname}] {name}: {message}", "style": "{"}},
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "simple"},
    },
    "root": {"handlers": ["console"], "level": env("DJANGO_LOG_LEVEL", "INFO")},
}
