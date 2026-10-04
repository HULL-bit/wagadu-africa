"""Feed d'agenda unifié : fusionne les évènements personnels et les échéances
provenant des autres modules (tâches, réunions, congés) — sans les dupliquer en
base. Les évènements « virtuels » ne sont pas éditables depuis l'agenda."""
from __future__ import annotations

import datetime
from dataclasses import dataclass, field

from django.db.models import Q
from django.utils import timezone

from .models import TYPE_COLOR, CalendarEvent, EventType


@dataclass
class FeedItem:
    id: str
    title: str
    start: datetime.datetime
    end: datetime.datetime
    type: str
    color: str
    all_day: bool = False
    editable: bool = False
    location: str = ""
    url: str = ""
    source_id: int | None = None
    meta: dict = field(default_factory=dict)

    def as_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "start": self.start.isoformat(),
            "end": self.end.isoformat(),
            "type": self.type,
            "color": self.color,
            "all_day": self.all_day,
            "editable": self.editable,
            "location": self.location,
            "url": self.url,
            "source_id": self.source_id,
            **self.meta,
        }


def build_feed(user, start: datetime.datetime, end: datetime.datetime, *,
               include: set[str] | None = None) -> list[FeedItem]:
    include = include or {"personal", "task", "meeting", "leave"}
    items: list[FeedItem] = []

    if "personal" in include:
        items += _personal_events(user, start, end)
    if "task" in include:
        items += _task_events(user, start, end)
    if "meeting" in include:
        items += _meeting_events(user, start, end)
    if "leave" in include:
        items += _leave_events(user, start, end)

    items.sort(key=lambda i: i.start)
    return items


def _personal_events(user, start, end) -> list[FeedItem]:
    qs = CalendarEvent.objects.filter(
        Q(owner=user) | Q(attendees=user)
    ).filter(start__lt=end, end__gt=start).distinct()
    out = []
    for ev in qs:
        out.append(FeedItem(
            id=f"event-{ev.id}", title=ev.title, start=ev.start, end=ev.end,
            type=ev.type, color=ev.display_color, all_day=ev.all_day,
            editable=(ev.owner_id == user.id), location=ev.location,
            source_id=ev.id,
            meta={"description": ev.description, "recurrence_rule": ev.recurrence_rule},
        ))
    return out


def _task_events(user, start, end) -> list[FeedItem]:
    from apps.tasks.models import Task, TaskStatus

    qs = Task.objects.filter(
        assignments__user=user, due_at__isnull=False,
        due_at__gte=start, due_at__lte=end,
    ).exclude(status=TaskStatus.DONE).distinct()
    return [
        FeedItem(
            id=f"task-{t.id}", title=f"⏰ {t.title}", start=t.due_at,
            end=t.due_at + datetime.timedelta(minutes=30),
            type=EventType.TASK, color=TYPE_COLOR[EventType.TASK],
            url=f"/tasks/{t.id}", source_id=t.id,
            meta={"priority": t.priority, "overdue": t.is_overdue},
        )
        for t in qs
    ]


def _meeting_events(user, start, end) -> list[FeedItem]:
    from apps.meetings.models import Meeting, MeetingStatus

    qs = Meeting.objects.filter(
        Q(organizer=user) | Q(participants=user),
        start__lt=end, end__gt=start,
    ).exclude(status=MeetingStatus.CANCELLED).distinct()
    return [
        FeedItem(
            id=f"meeting-{m.id}", title=f"📹 {m.title}", start=m.start, end=m.end,
            type=EventType.MEETING, color=TYPE_COLOR[EventType.MEETING],
            url=f"/meetings/{m.id}", location=m.join_url, source_id=m.id,
            meta={"status": m.status},
        )
        for m in qs
    ]


def _leave_events(user, start, end) -> list[FeedItem]:
    from apps.hr.models import LeaveRequest, LeaveStatus

    qs = LeaveRequest.objects.filter(
        employee__user=user, status=LeaveStatus.APPROVED,
    ).filter(start_date__lte=end.date(), end_date__gte=start.date()).select_related("leave_type")
    out = []
    for lr in qs:
        s = timezone.make_aware(datetime.datetime.combine(lr.start_date, datetime.time.min))
        e = timezone.make_aware(datetime.datetime.combine(lr.end_date, datetime.time.max))
        out.append(FeedItem(
            id=f"leave-{lr.id}", title=f"🌴 {lr.leave_type.label}", start=s, end=e,
            type=EventType.LEAVE, color=TYPE_COLOR[EventType.LEAVE], all_day=True,
            url="/leave", source_id=lr.id,
        ))
    return out
