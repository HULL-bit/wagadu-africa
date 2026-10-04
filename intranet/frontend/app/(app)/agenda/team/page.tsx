"use client";

import { useMemo } from "react";
import { useApi } from "@/lib/useApi";

interface TeamRow {
  user: { id: string; name: string };
  events: { start: string; end: string; type: string; title: string }[];
}

const TYPE_COLOR: Record<string, string> = {
  task: "#F6BB24", meeting: "#D2812E", leave: "#4A2A12", personal: "#6E3C13",
};

export default function TeamAgendaPage() {
  const { start, end, days } = useMemo(() => {
    const s = new Date(); s.setHours(0, 0, 0, 0);
    s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
    const list = Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(s.getDate() + i); return d; });
    const e = new Date(list[6]); e.setDate(e.getDate() + 1);
    const fmt = (d: Date) => d.toISOString().slice(0, 19);
    return { start: fmt(s), end: fmt(e), days: list };
  }, []);

  const { data, loading, error } = useApi<TeamRow[]>(
    `/agenda/team/?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
  );

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-wagadu-brown">Disponibilités de l&apos;équipe</h1>
      <p className="text-sm opacity-70">Semaine en cours — vue des collaborateurs directs.</p>
      {loading && <p className="text-sm opacity-60">Chargement…</p>}
      {error && <p className="text-sm text-wagadu-terracotta">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[44rem]">
          <thead>
            <tr className="text-left text-wagadu-brown">
              <th className="py-2 pr-2">Collaborateur</th>
              {days.map((d, i) => (
                <th key={i} className="text-center text-xs">{d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-wagadu-sand">
            {data?.map((row) => (
              <tr key={row.user.id}>
                <td className="py-2 pr-2 font-medium">{row.user.name}</td>
                {days.map((d, i) => {
                  const key = d.toDateString();
                  const evs = row.events.filter((e) => {
                    const s = new Date(e.start), en = new Date(e.end);
                    return s.toDateString() === key || (s <= d && en >= d);
                  });
                  return (
                    <td key={i} className="text-center align-top p-1">
                      <div className="space-y-0.5">
                        {evs.map((e, j) => (
                          <span key={j} className="block text-[10px] rounded px-1 truncate"
                            style={{ background: (TYPE_COLOR[e.type] ?? "#6E3C13") + "33" }} title={e.title}>
                            {e.title}
                          </span>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
