"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { api, tokenStore } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { EVENT_TYPE_LABEL, FeedEvent } from "@/lib/comms";
import { Paginated, UserRow } from "@/lib/types";

type ViewMode = "month" | "week" | "day";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function AgendaPage() {
  const [mode, setMode] = useState<ViewMode>("week");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));

  const { rangeStart, rangeEnd, days } = useMemo(() => {
    const s = startOfDay(cursor);
    if (mode === "day") {
      const e = new Date(s); e.setDate(e.getDate() + 1);
      return { rangeStart: s, rangeEnd: e, days: [s] };
    }
    if (mode === "week") {
      const monday = new Date(s); monday.setDate(s.getDate() - ((s.getDay() + 6) % 7));
      const list = Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });
      const e = new Date(list[6]); e.setDate(e.getDate() + 1);
      return { rangeStart: monday, rangeEnd: e, days: list };
    }
    const first = new Date(s.getFullYear(), s.getMonth(), 1);
    const startGrid = new Date(first); startGrid.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    const list = Array.from({ length: 42 }, (_, i) => { const d = new Date(startGrid); d.setDate(startGrid.getDate() + i); return d; });
    const e = new Date(list[41]); e.setDate(e.getDate() + 1);
    return { rangeStart: startGrid, rangeEnd: e, days: list };
  }, [mode, cursor]);

  const fmt = (d: Date) => d.toISOString().slice(0, 19);
  const { data: events, reload } = useApi<FeedEvent[]>(
    `/agenda/?start=${encodeURIComponent(fmt(rangeStart))}&end=${encodeURIComponent(fmt(rangeEnd))}`,
  );
  const users = useApi<Paginated<UserRow>>("/users/");

  const [form, setForm] = useState({ title: "", start: "", end: "", location: "", visibility: "private" });
  const [attendees, setAttendees] = useState<string[]>([]);
  const [reminder, setReminder] = useState("15");
  const [showForm, setShowForm] = useState(false);

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    await api("/agenda/events/", {
      method: "POST",
      body: {
        title: form.title,
        start: new Date(form.start).toISOString(),
        end: new Date(form.end).toISOString(),
        location: form.location,
        visibility: form.visibility,
        attendee_ids: attendees,
        reminders: reminder ? [{ minutes_before: Number(reminder), channel: "notification" }] : [],
      },
    });
    setShowForm(false);
    setForm({ title: "", start: "", end: "", location: "", visibility: "private" });
    setAttendees([]);
    reload();
  }

  async function exportIcal() {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";
    const res = await fetch(`${base}/agenda/export.ics`, { headers: { Authorization: `Bearer ${tokenStore.access}` } });
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a"); a.href = url; a.download = "wagadu-agenda.ics"; a.click();
    URL.revokeObjectURL(url);
  }

  function eventsFor(day: Date) {
    const key = day.toDateString();
    return (events ?? []).filter((ev) => {
      const s = new Date(ev.start), e = new Date(ev.end);
      return s.toDateString() === key || (s <= day && e >= day);
    });
  }

  function shift(dir: number) {
    const d = new Date(cursor);
    if (mode === "day") d.setDate(d.getDate() + dir);
    else if (mode === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCursor(startOfDay(d));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-2xl text-wagadu-brown">Agenda</h1>
        <div className="flex gap-2">
          <Link href="/agenda/team" className="btn-ghost">Vue d&apos;équipe</Link>
          <button className="btn-ghost" onClick={exportIcal}>Export iCal</button>
          <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>Nouvel évènement</button>
        </div>
      </div>

      <div className="card flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1">
          {(["day", "week", "month"] as ViewMode[]).map((m) => (
            <button key={m} className={mode === m ? "btn-primary" : "btn-ghost"} onClick={() => setMode(m)}>
              {{ day: "Jour", week: "Semaine", month: "Mois" }[m]}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <button className="btn-ghost" onClick={() => shift(-1)}>‹</button>
          <span className="font-display capitalize">
            {cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric", ...(mode !== "month" ? { day: "numeric" } : {}) })}
          </span>
          <button className="btn-ghost" onClick={() => shift(1)}>›</button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={createEvent} className="card grid sm:grid-cols-2 gap-3">
          <input className="input sm:col-span-2" placeholder="Titre" required value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <label className="label">Début<input type="datetime-local" required className="input" value={form.start}
            onChange={(e) => setForm({ ...form, start: e.target.value })} /></label>
          <label className="label">Fin<input type="datetime-local" required className="input" value={form.end}
            onChange={(e) => setForm({ ...form, end: e.target.value })} /></label>
          <input className="input" placeholder="Lieu" value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <label className="label">Rappel (min avant)<input type="number" className="input" value={reminder}
            onChange={(e) => setReminder(e.target.value)} /></label>
          <div className="sm:col-span-2">
            <label className="label">Inviter</label>
            <select multiple className="input h-24" value={attendees}
              onChange={(e) => setAttendees(Array.from(e.target.selectedOptions, (o) => o.value))}>
              {users.data?.results.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
            </select>
          </div>
          <button className="btn-primary sm:col-span-2">Créer</button>
        </form>
      )}

      <div className={`card grid gap-1 ${mode === "month" ? "grid-cols-7" : mode === "week" ? "grid-cols-7" : "grid-cols-1"} overflow-x-auto`}>
        {mode !== "day" && ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
          <div key={d} className="text-xs font-medium text-wagadu-brown text-center py-1">{d}</div>
        ))}
        {days.map((day, i) => (
          <div key={i} className={`min-h-[6rem] rounded-lg border border-wagadu-sand p-1 ${mode === "month" && day.getMonth() !== cursor.getMonth() ? "opacity-40" : ""}`}>
            <span className="text-xs font-mono opacity-60">{day.getDate()}</span>
            <div className="space-y-0.5">
              {eventsFor(day).map((ev) => (
                <EventChip key={ev.id} ev={ev} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventChip({ ev }: { ev: FeedEvent }) {
  const inner = (
    <span className="block text-[11px] rounded px-1 truncate text-wagadu-ebony"
      style={{ background: ev.color + "33" }} title={`${EVENT_TYPE_LABEL[ev.type]} — ${ev.title}`}>
      {ev.all_day ? "" : new Date(ev.start).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) + " "}
      {ev.title}
    </span>
  );
  return ev.url ? <Link href={ev.url}>{inner}</Link> : inner;
}
