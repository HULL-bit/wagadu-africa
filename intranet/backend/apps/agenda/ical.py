"""Export / import iCalendar (compatibilité Google Calendar, Outlook)."""
from __future__ import annotations

import datetime

from django.utils import timezone
from icalendar import Calendar, Event

from .feed import build_feed
from .models import CalendarEvent


def export_ics(user, *, days: int = 120) -> bytes:
    now = timezone.now()
    items = build_feed(user, now - datetime.timedelta(days=30), now + datetime.timedelta(days=days))

    cal = Calendar()
    cal.add("prodid", "-//Wagadu Hub//Agenda//FR")
    cal.add("version", "2.0")
    cal.add("x-wr-calname", f"Wagadu Hub — {user.get_full_name() or user.email}")

    for item in items:
        ev = Event()
        ev.add("uid", f"{item.id}@wagadu-hub")
        ev.add("summary", item.title)
        ev.add("dtstart", item.start)
        ev.add("dtend", item.end)
        if item.location:
            ev.add("location", item.location)
        if item.meta.get("description"):
            ev.add("description", item.meta["description"])
        if item.meta.get("recurrence_rule"):
            ev.add("rrule", _parse_rrule(item.meta["recurrence_rule"]))
        cal.add_component(ev)

    return cal.to_ical()


def _parse_rrule(rule: str) -> dict:
    out: dict = {}
    for part in rule.split(";"):
        if "=" not in part:
            continue
        key, value = part.split("=", 1)
        out[key.lower()] = value.split(",") if "," in value else value
    return out


def import_ics(user, raw: bytes) -> int:
    cal = Calendar.from_ical(raw)
    created = 0
    for component in cal.walk("VEVENT"):
        start = component.get("dtstart").dt
        end_prop = component.get("dtend")
        end = end_prop.dt if end_prop else start
        if isinstance(start, datetime.date) and not isinstance(start, datetime.datetime):
            start = timezone.make_aware(datetime.datetime.combine(start, datetime.time.min))
            end = timezone.make_aware(datetime.datetime.combine(end, datetime.time.max))
        elif timezone.is_naive(start):
            start = timezone.make_aware(start)
            end = timezone.make_aware(end) if timezone.is_naive(end) else end

        uid = str(component.get("uid", ""))
        if uid.endswith("@wagadu-hub"):
            continue  # ne pas ré-importer nos propres évènements

        CalendarEvent.objects.create(
            owner=user,
            title=str(component.get("summary", "Évènement importé")),
            description=str(component.get("description", "")),
            location=str(component.get("location", "")),
            start=start,
            end=end,
        )
        created += 1
    return created
