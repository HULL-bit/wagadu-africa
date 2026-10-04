"""Provisionne Rocket.Chat : comptes de tous les membres + un canal par service.

    python manage.py provision_chat

À lancer une fois après avoir démarré le profil « chat » (ou quand de nouveaux
comptes ont été créés). Sans effet si Rocket.Chat n'est pas configuré.
"""

from __future__ import annotations

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Crée les comptes et canaux Rocket.Chat pour les membres et les services."

    def handle(self, *args, **opts):
        from apps.accounts.models import User
        from apps.integrations.rocketchat import is_configured
        from apps.integrations.services import provision_channel, provision_user
        from apps.organization.models import Department

        if not is_configured():
            self.stdout.write(self.style.WARNING(
                "Rocket.Chat non configuré (ROCKETCHAT_URL manquant). Rien à faire."
            ))
            return

        users = User.objects.filter(is_active=True)
        done = sum(1 for u in users if provision_user(u) is not None)
        self.stdout.write(f"Comptes messagerie provisionnés : {done}/{users.count()}")

        chans = 0
        for dept in Department.objects.all():
            ch = provision_channel(name=f"service-{dept.code or dept.name}", kind="department", department=dept)
            if ch and ch.rc_room_id:
                chans += 1
        self.stdout.write(f"Canaux de service : {chans}")
        self.stdout.write(self.style.SUCCESS("Terminé."))
