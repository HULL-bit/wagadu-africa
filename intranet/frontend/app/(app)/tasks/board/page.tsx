"use client";

import Link from "next/link";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { PRIORITY_STYLE, STATUS_FALLBACK, STATUS_STYLE, TASK_COLUMNS, Task } from "@/lib/tasks";

export default function BoardPage() {
  const { data, reload, loading } = useApi<Record<string, Task[]>>("/tasks/board/");

  async function move(task: Task, status: string) {
    await api(`/tasks/${task.id}/status/`, { method: "POST", body: { status } });
    reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-wagadu-brown">Suivi des tâches</h1>
        <div className="flex gap-2">
          <Link href="/tasks/performance" className="btn-ghost">Performance</Link>
          <Link href="/tasks/recurring" className="btn-ghost">Récurrentes</Link>
          <Link href="/tasks/new" className="btn-primary">Nouvelle tâche</Link>
        </div>
      </div>

      {loading && <p className="text-sm opacity-60">Chargement…</p>}

      <div className="grid gap-3 md:grid-cols-4">
        {TASK_COLUMNS.map((col) => {
          const cs = STATUS_STYLE[col.key] ?? STATUS_FALLBACK;
          return (
          <div key={col.key} className="bg-wagadu-sand/40 rounded-2xl p-2 min-h-[8rem]">
            <p className="label px-1 flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${cs.dot}`} />
              {col.label} · {data?.[col.key]?.length ?? 0}
            </p>
            <div className="space-y-2">
              {data?.[col.key]?.map((t) => (
                <div key={t.id} className={`bg-white rounded-xl p-2 shadow-sm text-sm border-l-4 ${cs.bar}`}>
                  <Link href={`/tasks/${t.id}`} className="font-semibold text-wagadu-brown">{t.title}</Link>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <span className={`badge ${PRIORITY_STYLE[t.priority]}`}>{t.priority_display}</span>
                    {t.is_overdue && <span className="badge bg-wagadu-terracotta/25 text-wagadu-terracotta">retard</span>}
                  </div>
                  <p className="text-xs opacity-60 mt-1">
                    {t.assignments.map((a) => a.user_name || a.user_email).join(", ")}
                  </p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {TASK_COLUMNS.filter((c) => c.key !== col.key).map((c) => (
                      <button key={c.key} className="text-xs text-wagadu-terracotta"
                        onClick={() => move(t, c.key)}>→ {c.label}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
