"use client";

import Link from "next/link";
import { useApi } from "@/lib/useApi";
import { Meeting } from "@/lib/comms";
import { Paginated } from "@/lib/types";

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-wagadu-sand",
  ongoing: "bg-green-100 text-green-800",
  ended: "bg-wagadu-sand opacity-60",
  cancelled: "bg-wagadu-terracotta/25 text-wagadu-terracotta",
};

export default function MeetingsPage() {
  const { data, loading } = useApi<Paginated<Meeting>>("/meetings/?ordering=-start");

  const now = Date.now();
  const upcoming = (data?.results ?? []).filter((m) => new Date(m.start).getTime() >= now && m.status !== "cancelled" && m.status !== "ended");
  const past = (data?.results ?? []).filter((m) => !upcoming.includes(m));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-wagadu-brown">Réunions</h1>
        <Link href="/meetings/new" className="btn-primary">Planifier une réunion</Link>
      </div>
      {loading && <p className="text-sm opacity-60">Chargement…</p>}

      <Section title="À venir" meetings={upcoming} />
      <Section title="Passées" meetings={past} muted />
    </div>
  );

  function Section({ title, meetings, muted }: { title: string; meetings: Meeting[]; muted?: boolean }) {
    return (
      <section className="card">
        <p className="label">{title}</p>
        {meetings.length === 0 ? (
          <p className="text-sm opacity-60">Aucune réunion.</p>
        ) : (
          <ul className="divide-y divide-wagadu-sand">
            {meetings.map((m) => (
              <li key={m.id} className={`py-2 flex justify-between items-center gap-2 ${muted ? "opacity-70" : ""}`}>
                <div>
                  <Link href={`/meetings/${m.id}`} className="font-medium text-wagadu-brown">{m.title}</Link>
                  <p className="text-xs font-mono opacity-60">
                    {new Date(m.start).toLocaleString("fr-FR")} · {m.organizer_name}
                  </p>
                </div>
                <span className={`badge ${STATUS_STYLE[m.status]}`}>{m.status_display}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }
}
