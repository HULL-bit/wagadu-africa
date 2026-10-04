from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Department(models.Model):
    name = models.CharField(max_length=150)
    code = models.SlugField(max_length=30, unique=True)
    parent = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="children"
    )
    head = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="headed_departments",
    )
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = _("département")

    def __str__(self) -> str:
        return self.name


class Team(models.Model):
    name = models.CharField(max_length=150)
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name="teams"
    )
    lead = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="led_teams",
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL, through="TeamMembership", related_name="teams"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name = _("équipe")

    def __str__(self) -> str:
        return self.name


class TeamMembership(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="team_memberships"
    )
    role_in_team = models.CharField(max_length=80, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["team", "user"], name="uniq_team_member")
        ]

    def __str__(self) -> str:
        return f"{self.user} @ {self.team}"
