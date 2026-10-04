from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class Announcement(models.Model):
    """Fil d'actualités internes — mur d'annonces épinglées (§2.11)."""

    class Audience(models.TextChoices):
        ALL = "all", _("Tout le personnel")
        DEPARTMENT = "department", _("Un département")

    title = models.CharField(max_length=200)
    body = models.TextField()
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    pinned = models.BooleanField(default=False)
    audience = models.CharField(max_length=20, choices=Audience.choices, default=Audience.ALL)
    department = models.ForeignKey(
        "organization.Department", on_delete=models.CASCADE, null=True, blank=True
    )
    publish_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-pinned", "-publish_at"]
        verbose_name = _("annonce")

    def __str__(self) -> str:
        return self.title

    @property
    def is_live(self) -> bool:
        now = timezone.now()
        return self.publish_at <= now and (self.expires_at is None or self.expires_at > now)


class Poll(models.Model):
    """Sondage / vote interne pour décision collective rapide (§2.11)."""

    question = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    is_open = models.BooleanField(default=True)
    is_anonymous = models.BooleanField(default=False)
    multiple_choice = models.BooleanField(default=False)
    closes_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = _("sondage interne")

    def __str__(self) -> str:
        return self.question

    @property
    def total_votes(self) -> int:
        return PollVote.objects.filter(option__poll=self).values("user").distinct().count()


class PollOption(models.Model):
    poll = models.ForeignKey(Poll, on_delete=models.CASCADE, related_name="options")
    label = models.CharField(max_length=200)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self) -> str:
        return self.label

    @property
    def vote_count(self) -> int:
        return self.votes.count()


class PollVote(models.Model):
    option = models.ForeignKey(PollOption, on_delete=models.CASCADE, related_name="votes")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    voted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["option", "user"], name="uniq_engagement_poll_vote")
        ]

    def __str__(self) -> str:
        return f"{self.user} → {self.option_id}"
