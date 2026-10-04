"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { PRIORITY_STYLE, STATUS_FALLBACK, STATUS_STYLE, Task } from "@/lib/tasks";

export default function MyTasksPage() {
  const { me, can } = useAuth();
  const [scope, setScope] = useState<"current" | "">("current");
  const { data, loading, reload } = useApi<Task[]>(
    `/tasks/mine/${scope ? `?scope=${scope}` : ""}`,
  );

  async function setProgress(id: number, progress: string) {
    await api(`/tasks/${id}/progress/`, { method: "POST", body: { progress } });
    reload();
  }

  function myAssignment(t: Task) {
    return t.assignments.find((a) => a.user === me?.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-2xl text-wagadu-brown">Mes tâches</h1>
        <div className="flex gap-2">
          <button className={scope === "current" ? "btn-primary" : "btn-ghost"} onClick={() => setScope("current")}>
            Semaine en cours
          </button>
          <button className={scope === "" ? "btn-primary" : "btn-ghost"} onClick={() => setScope("")}>
            Toutes
          </button>
          {can("tasks.assign") && <Link href="/tasks/new" className="btn-primary">Nouvelle tâche</Link>}
        </div>
      </div>

      <p className="text-sm opacity-70">
        {scope === "current"
          ? "Tâches ouvertes et celles bouclées cette semaine. Les semaines passées sont dans l'historique."
          : "Toutes vos tâches, y compris terminées."}
      </p>

      {loading && <p className="text-sm opacity-60">Chargement…</p>}
      {data?.length === 0 && <p className="text-sm opacity-60">Aucune tâche.</p>}

      <div className="space-y-3">
        {data?.map((t) => {
          const mine = myAssignment(t);
          const st = STATUS_STYLE[t.status] ?? STATUS_FALLBACK;
          return (
            <div key={t.id} className={`card border-l-4 ${st.bar} ${t.is_overdue ? "ring-1 ring-red-300" : ""}`}>
              <div className="flex justify-between flex-wrap gap-2">
                <Link href={`/tasks/${t.id}`} className="font-semibold text-wagadu-brown">{t.title}</Link>
                <div className="flex gap-1">
                  <span className={`badge ${PRIORITY_STYLE[t.priority]}`}>{t.priority_display}</span>
                  <span className={`badge ${st.badge}`}>{t.status_display}</span>
                </div>
              </div>
              {t.due_at && (
                <p className={`text-sm font-mono ${t.is_overdue ? "text-wagadu-terracotta" : "opacity-70"}`}>
                  Échéance {new Date(t.due_at).toLocaleString("fr-FR")}
                </p>
              )}
              {t.labels_detail.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {t.labels_detail.map((l) => (
                    <span key={l.id} className="badge" style={{ background: l.color + "33" }}>{l.name}</span>
                  ))}
                </div>
              )}
              {mine && ["todo", "in_progress", "returned"].includes(mine.progress_status) && (
                <div className="flex gap-2 mt-2">
                  {mine.progress_status === "todo" && (
                    <button className="btn-ghost" onClick={() => setProgress(t.id, "in_progress")}>Démarrer</button>
                  )}
                  <Link href={`/tasks/${t.id}`} className="btn-primary">Soumettre</Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
