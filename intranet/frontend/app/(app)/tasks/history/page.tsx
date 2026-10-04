"use client";

import Link from "next/link";
import { useState } from "react";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { STATUS_FALLBACK, STATUS_STYLE, Task } from "@/lib/tasks";

interface Period {
  key: string;
  label: string;
  total: number;
  done: number;
  on_time: number;
  late: number;
  tasks: Task[];
}
interface History {
  granularity: string;
  scope: string;
  periods: Period[];
}

const GRANS = [
  ["week", "Par semaine"],
  ["month", "Par mois"],
  ["semester", "Par semestre"],
] as const;

export default function TasksHistoryPage() {
  const { can } = useAuth();
  const canTeam = can("tasks.assign") || can("tasks.oversee");
  const [gran, setGran] = useState<"week" | "month" | "semester">("month");
  const [scope, setScope] = useState<"mine" | "team">("mine");
  const [open, setOpen] = useState<string | null>(null);

  const qs = new URLSearchParams({ granularity: gran, scope });
  const { data, loading } = useApi<History>(`/tasks/history/?${qs.toString()}`);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-wagadu-brown">Historique des tâches</h1>

      <div className="flex flex-wrap gap-2 items-center">
        <select className="input max-w-xs" value={gran} onChange={(e) => setGran(e.target.value as typeof gran)}>
          {GRANS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {canTeam && (
          <div className="flex gap-1">
            {(["mine", "team"] as const).map((s) => (
              <button key={s} onClick={() => setScope(s)}
                className={`text-sm rounded-xl px-3 py-2 ${scope === s ? "btn-primary" : "btn-ghost"}`}>
                {s === "mine" ? "Mes tâches" : "Toute l'équipe"}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <p className="text-sm opacity-60">Chargement…</p>}
      {data?.periods.length === 0 && <p className="text-sm opacity-60">Aucune tâche archivée.</p>}

      <div className="space-y-3">
        {data?.periods.map((p) => {
          const isOpen = open === p.key;
          const rate = p.total ? Math.round((p.done * 100) / p.total) : 0;
          return (
            <div key={p.key} className="card">
              <button className="w-full flex items-center justify-between gap-3 text-left"
                onClick={() => setOpen(isOpen ? null : p.key)}>
                <div>
                  <p className="font-display text-lg text-wagadu-brown capitalize">{p.label}</p>
                  <p className="text-sm opacity-70">
                    {p.done}/{p.total} terminées · {p.on_time} à temps
                    {p.late > 0 && ` · ${p.late} en retard`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-24 h-2 rounded-full bg-wagadu-sand overflow-hidden">
                    <div className="h-full bg-wagadu-gold" style={{ width: `${rate}%` }} />
                  </div>
                  <span className="text-sm opacity-60">{isOpen ? "▾" : "▸"}</span>
                </div>
              </button>

              {isOpen && (
                <ul className="mt-3 divide-y divide-wagadu-sand">
                  {p.tasks.map((t) => {
                    const st = STATUS_STYLE[t.status] ?? STATUS_FALLBACK;
                    return (
                      <li key={t.id} className="py-2 flex items-center justify-between gap-2">
                        <Link href={`/tasks/${t.id}`} className="text-wagadu-brown hover:underline">{t.title}</Link>
                        <div className="flex items-center gap-2 shrink-0">
                          {t.due_at && (
                            <span className="text-xs font-mono opacity-60">
                              {new Date(t.due_at).toLocaleDateString("fr-FR")}
                            </span>
                          )}
                          <span className={`badge ${st.badge}`}>{t.status_display}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
