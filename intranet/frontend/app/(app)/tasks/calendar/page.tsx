"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/useApi";
import { STATUS_FALLBACK, STATUS_STYLE, Task } from "@/lib/tasks";

export default function TaskCalendarPage() {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const { data } = useApi<Task[]>("/tasks/mine/");

  const grid = useMemo(() => {
    const first = new Date(month.y, month.m, 1);
    const startDow = (first.getDay() + 6) % 7; // lundi = 0
    const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
    const cells: (number | null)[] = Array(startDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [month]);

  const byDay = useMemo(() => {
    const map: Record<number, Task[]> = {};
    (data ?? []).forEach((t) => {
      if (!t.due_at) return;
      const d = new Date(t.due_at);
      if (d.getFullYear() === month.y && d.getMonth() === month.m) {
        (map[d.getDate()] ??= []).push(t);
      }
    });
    return map;
  }, [data, month]);

  const label = new Date(month.y, month.m).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-wagadu-brown">Calendrier des échéances</h1>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => setMonth((s) => ({ y: s.m === 0 ? s.y - 1 : s.y, m: (s.m + 11) % 12 }))}>‹</button>
          <span className="font-display self-center capitalize">{label}</span>
          <button className="btn-ghost" onClick={() => setMonth((s) => ({ y: s.m === 11 ? s.y + 1 : s.y, m: (s.m + 1) % 12 }))}>›</button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <div className="grid grid-cols-7 gap-1 min-w-[42rem]">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
            <div key={d} className="text-xs font-medium text-wagadu-brown text-center py-1">{d}</div>
          ))}
          {grid.map((day, i) => (
            <div key={i} className="min-h-[5rem] rounded-lg border border-wagadu-sand p-1">
              {day && <span className="text-xs font-mono opacity-60">{day}</span>}
              <div className="space-y-0.5">
                {day && byDay[day]?.map((t) => {
                  const st = STATUS_STYLE[t.status] ?? STATUS_FALLBACK;
                  return (
                    <Link key={t.id} href={`/tasks/${t.id}`}
                      className={`block text-[11px] rounded px-1 truncate ${st.badge}`}>
                      {t.title}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
