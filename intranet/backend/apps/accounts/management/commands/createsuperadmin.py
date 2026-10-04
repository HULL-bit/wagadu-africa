"""Amorçage du tout premier compte Super Administrateur (phase 1, section 12).

Ce compte est la condition préalable à la création de tout autre compte.
La commande refuse de s'exécuter si un Super Administrateur existe déjà.
"""
from __future__ import annotations

import getpass

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import User
from apps.accounts.services import validate_password_strength
from apps.audit.models import AuditAction, AuditSeverity
from apps.audit.services import record


class Command(BaseCommand):
    help = "Crée le premier compte Super Administrateur de Wagadu Hub."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--email")
        parser.add_argument("--password")
        parser.add_argument("--first-name", default="")
        parser.add_argument("--last-name", default="")
        parser.add_argument(
            "--noinput", action="store_true", help="Mode non interactif (CI)."
        )

    def handle(self, *args, **options):
        if User.objects.filter(is_super_admin=True).exists():
            raise CommandError(
                "Un compte Super Administrateur existe déjà. "
                "Utilisez l'interface d'administration pour en gérer un second "
                f"(maximum {settings.WAGADU['SUPER_ADMIN_MAX']})."
            )

        email = options["email"]
        password = options["password"]
        noinput = options["noinput"]

        if not noinput:
            email = email or input("E-mail du Super Administrateur : ").strip()
            if not password:
                password = getpass.getpass("Mot de passe : ")
                if password != getpass.getpass("Confirmez le mot de passe : "):
                    raise CommandError("Les mots de passe ne correspondent pas.")

        if not email or not password:
            raise CommandError("--email et --password sont requis.")

        try:
            validate_password_strength(password)
        except Exception as exc:  # noqa: BLE001
            raise CommandError(f"Mot de passe trop faible : {exc}") from exc

        user = User.objects.create_superuser(
            email=email,
            password=password,
            first_name=options["first_name"],
            last_name=options["last_name"],
        )
        record(
            action=AuditAction.CREATE,
            module="accounts",
            actor=user,
            target=user,
            message="Amorçage du premier Super Administrateur",
            severity=AuditSeverity.CRITICAL,
        )
        self.stdout.write(
            self.style.SUCCESS(f"Super Administrateur créé : {user.email}")
        )
