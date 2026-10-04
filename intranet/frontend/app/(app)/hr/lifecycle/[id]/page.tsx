"use client";

import { use } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { CATEGORY_LABEL, LifecycleProcess } from "@/lib/hrlota";
import { BackLink } from "@/components/BackLink";

export default function LifecycleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: p, reload } = useApi<LifecycleProcess>(`/hr/lifecycle-processes/${id}/`);

  async function toggle(itemId: number, done: boolean) {
    await api(`/hr/lifecycle-items/${itemId}/toggle/`, { method: "POST", body: { done } });
    reload();
  }

  if (!p) return <p className="text-sm opacity-60">Chargement…</p>;

  const bySection = p.items.reduce<Record<string, typeof p.items>>((acc, it) => {
    (acc[CATEGORY_LABEL[it.category] ?? it.category] ??= []).push(it);
    return acc;
  }, {});

  return (
    <div className="space-y-4 max-w-2xl">
      <BackLink href="/hr/lifecycle" />
      <h1 className="font-display text-2xl text-wagadu-brown">
        {p.kind_display} — {p.employee_name}
      </h1>
      <div className="card flex items-center gap-3">
        <div className="flex-1 h-3 rounded-full bg-wagadu-sand overflow-hidden">
          <div className="h-full bg-wagadu-gold" style={{ width: `${p.progress.percent}%` }} />
        </div>
        <span className="font-mono text-sm">{p.progress.done}/{p.progress.total}</span>
      </div>

      {Object.entries(bySection).map(([section, items]) => (
        <div key={section} className="card">
          <p className="label">{section}</p>
          <ul className="space-y-1.5">
            {items.map((it) => (
              <li key={it.id} className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={it.is_done} className="mt-1"
                  onChange={(e) => toggle(it.id, e.target.checked)} />
                <span className={it.is_done ? "line-through opacity-60" : ""}>
                  {it.label}
                  <span className="text-xs opacity-50">
                    {" "}· {it.responsible_role}{it.due_date && ` · échéance ${it.due_date}`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
