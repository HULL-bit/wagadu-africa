from __future__ import annotations

import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from django.utils.timezone import now as tz_now
from django.utils.translation import gettext_lazy as _

from .managers import UserManager


class UserStatus(models.TextChoices):
    INVITED = "invited", _("Invité")
    ACTIVE = "active", _("Actif")
    SUSPENDED = "suspended", _("Suspendu")
    OFFBOARDED = "offboarded", _("Parti")


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    email = models.EmailField(_("adresse e-mail"), unique=True)
    first_name = models.CharField(max_length=120, blank=True)
    last_name = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=40, blank=True)

    role = models.ForeignKey(
        "permissions.Role",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="users",
    )
    department = models.ForeignKey(
        "organization.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="members",
    )
    manager = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="direct_reports",
    )

    is_super_admin = models.BooleanField(
        _("Super Administrateur"),
        default=False,
        help_text=_("Rôle unique au sommet de la hiérarchie (1 à 2 comptes maximum)."),
    )
    status = models.CharField(
        max_length=20, choices=UserStatus.choices, default=UserStatus.ACTIVE
    )

    preferred_language = models.CharField(max_length=5, default="fr")
    timezone = models.CharField(max_length=64, default="Africa/Dakar")

    # Profil public
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    job_title = models.CharField(max_length=150, blank=True)
    bio = models.CharField(max_length=280, blank=True)
    secondary_email = models.EmailField(blank=True)
    linkedin_url = models.URLField(blank=True)
    twitter_url = models.URLField(blank=True)
    facebook_url = models.URLField(blank=True)
    website_url = models.URLField(blank=True)
    whatsapp = models.CharField(max_length=40, blank=True)

    # Libre-service employé
    emergency_contact = models.CharField(max_length=255, blank=True)
    bank_account = models.CharField(max_length=64, blank=True)

    # Sécurité — connexion
    failed_login_count = models.PositiveIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    last_password_change = models.DateTimeField(default=tz_now)

    # 2FA — socle (activation possible, non imposée en phase 1)
    is_2fa_enabled = models.BooleanField(default=False)
    totp_secret = models.CharField(max_length=64, blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    class Meta:
        ordering = ["email"]
        verbose_name = _("utilisateur")

    def __str__(self) -> str:
        return self.get_full_name() or self.email

    def get_full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self) -> str:
        return self.first_name or self.email

    def clean(self) -> None:
        super().clean()
        if self.is_super_admin:
            from django.conf import settings

            existing = User.objects.filter(is_super_admin=True).exclude(pk=self.pk).count()
            if existing >= settings.WAGADU["SUPER_ADMIN_MAX"]:
                raise ValidationError(
                    _("Nombre maximal de Super Administrateurs atteint (%(n)d).")
                    % {"n": settings.WAGADU["SUPER_ADMIN_MAX"]}
                )

    # --- Helpers de rôle ---
    @property
    def is_admin_account(self) -> bool:
        return self.is_super_admin or bool(self.role and self.role.slug == "admin")

    @property
    def role_slug(self) -> str | None:
        return self.role.slug if self.role else None

    # --- Verrouillage ---
    @property
    def is_locked(self) -> bool:
        return bool(self.locked_until and self.locked_until > timezone.now())

    def register_failed_login(self) -> None:
        from django.conf import settings

        self.failed_login_count += 1
        threshold = settings.WAGADU["LOGIN_MAX_FAILED_ATTEMPTS"]
        if self.failed_login_count >= threshold:
            self.locked_until = timezone.now() + timezone.timedelta(
                minutes=settings.WAGADU["LOGIN_LOCKOUT_MINUTES"]
            )
        self.save(update_fields=["failed_login_count", "locked_until"])

    def reset_login_failures(self) -> None:
        if self.failed_login_count or self.locked_until:
            self.failed_login_count = 0
            self.locked_until = None
            self.save(update_fields=["failed_login_count", "locked_until"])


class PasswordPolicy(models.Model):
    """Politique de mot de passe configurable (singleton, pk=1)."""

    min_length = models.PositiveIntegerField(default=10)
    require_uppercase = models.BooleanField(default=True)
    require_lowercase = models.BooleanField(default=True)
    require_digit = models.BooleanField(default=True)
    require_symbol = models.BooleanField(default=False)
    expiry_days = models.PositiveIntegerField(
        default=0, help_text=_("0 = pas d'expiration.")
    )
    max_failed_attempts = models.PositiveIntegerField(default=5)
    lockout_minutes = models.PositiveIntegerField(default=15)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("politique de mot de passe")
        verbose_name_plural = _("politique de mot de passe")

    def __str__(self) -> str:
        return "Politique de mot de passe"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls) -> PasswordPolicy:
        obj, _created = cls.objects.get_or_create(pk=1)
        return obj


class LoginAttempt(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="login_attempts"
    )
    email_tried = models.EmailField()
    successful = models.BooleanField(default=False)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        state = "OK" if self.successful else "KO"
        return f"[{state}] {self.email_tried} @ {self.created_at:%Y-%m-%d %H:%M}"
