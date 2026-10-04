from __future__ import annotations

from apps.notifications.services import notify_many


def project_recipients(project, *, exclude=None):
    """Membres du projet + chef de projet, hors `exclude`."""
    users = set(project.members.filter(is_active=True))
    if project.lead_id and project.lead.is_active:
        users.add(project.lead)
    if exclude is not None:
        users.discard(exclude)
    return users


def notify_project(project, *, actor, title: str, body: str = "", url: str | None = None) -> None:
    recipients = project_recipients(project, exclude=actor)
    if not recipients:
        return
    notify_many(
        recipients,
        title=title,
        body=body,
        url=url or f"/projets/{project.id}",
        type="project",
    )
