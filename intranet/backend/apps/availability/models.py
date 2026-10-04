from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Availability(models.Model):
    """Signalement d'indisponibilité (sans circuit de validation).

    « Je ne peux pas venir tel jour » : l'agent le déclare, l'équipe le voit.
    """

    class Kind(models.TextChoices):
        ABSENT = "absent", _("Absent")
        REMOTE = "remote", _("Télétravail")
        MORNING = "morning", _("Indisponible le matin")
        AFTERNOON = "afternoon", _("Indisponible l'après-midi")
        MISSION = "mission", _("En mission / terrain")

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="availabilities"
    )
    start_date = models.DateField()
    end_date = models.DateField()
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.ABSENT)
    note = models.CharField(max_length=280, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_date"]
        verbose_name = _("disponibilité")
        verbose_name_plural = _("disponibilités")

    def __str__(self) -> str:
        return f"{self.user_id} {self.get_kind_display()} {self.start_date}→{self.end_date}"
