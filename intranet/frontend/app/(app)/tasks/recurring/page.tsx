"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Paginated, UserRow } from "@/lib/types";

interface Template {
  id: number;
  title: string;
  frequency: string;
  interval: number;
  weekday: number | null;
  day_of_month: number | null;
  lead_time_days: number;
  next_due_date: string;
  is_active: boolean;
  default_assignees: string[];
}

const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export default function RecurringTasksPage() {
  const list = useApi<Paginated<Template>>("/recurring-tasks/");
  const users = useApi<Paginated<UserRow>>("/users/");
  const [form, setForm] = useState({
    title: "", description: "", priority: "normal", frequency: "weekly",
    interval: 1, weekday: 0, day_of_month: 1, lead_time_days: 5,
    next_due_date: "", due_time: "17:00",
  });
  const [assignees, setAssignees] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const body: Record<string, unknown> = { ...form, default_assignees: assignees };
      if (form.frequency === "weekly") delete body.day_of_month;
      else delete body.weekday;
      await api("/recurring-tasks/", { method: "POST", body });
      setForm({ ...form, title: "", description: "", next_due_date: "" });
      setAssignees([]);
      list.reload();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Échec");
    }
  }

  async function generateNow(id: number) {
    await api(`/recurring-tasks/${id}/generate_now/`, { method: "POST", body: {} });
    list.reload();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-wagadu-brown">Tâches récurrentes</h1>

      <form onSubmit={create} className="card grid sm:grid-cols-2 gap-3">
        <input className="input sm:col-span-2" placeholder="Titre" required value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <select className="input" value={form.frequency}
          onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
          <option value="weekly">Hebdomadaire</option>
          <option value="monthly">Mensuelle</option>
        </select>
        <label className="label">Toutes les N périodes
          <input type="number" min={1} className="input" value={form.interval}
            onChange={(e) => setForm({ ...form, interval: Number(e.target.value) })} />
        </label>
        {form.frequency === "weekly" ? (
          <label className="label">Jour de la semaine
            <select className="input" value={form.weekday}
              onChange={(e) => setForm({ ...form, weekday: Number(e.target.value) })}>
              {WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </label>
        ) : (
          <label className="label">Jour du mois
            <input type="number" min={1} max={31} className="input" value={form.day_of_month}
              onChange={(e) => setForm({ ...form, day_of_month: Number(e.target.value) })} />
          </label>
        )}
        <label className="label">Créer N jours avant l'échéance
          <input type="number" min={0} className="input" value={form.lead_time_days}
            onChange={(e) => setForm({ ...form, lead_time_days: Number(e.target.value) })} />
        </label>
        <label className="label">Prochaine échéance
          <input type="date" required className="input" value={form.next_due_date}
            onChange={(e) => setForm({ ...form, next_due_date: e.target.value })} />
        </label>
        <label className="label">Heure d'échéance
          <input type="time" className="input" value={form.due_time}
            onChange={(e) => setForm({ ...form, due_time: e.target.value })} />
        </label>
        <div className="sm:col-span-2">
          <label className="label">Assignés par défaut</label>
          <select multiple className="input h-24" value={assignees}
            onChange={(e) => setAssignees(Array.from(e.target.selectedOptions, (o) => o.value))}>
            {users.data?.results.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2 flex gap-2 items-center">
          <button className="btn-primary">Créer le modèle</button>
          {err && <span className="text-sm text-wagadu-terracotta">{err}</span>}
        </div>
      </form>

      <div className="card divide-y divide-wagadu-sand">
        {list.data?.results.map((t) => (
          <div key={t.id} className="py-2 flex justify-between items-center flex-wrap gap-2">
            <div>
              <p className="font-medium">{t.title}</p>
              <p className="text-xs opacity-60 font-mono">
                {t.frequency === "weekly"
                  ? `Chaque ${WEEKDAYS[t.weekday ?? 0].toLowerCase()}${t.interval > 1 ? ` (x${t.interval} sem.)` : ""}`
                  : `Le ${t.day_of_month} du mois`}
                {" · "}prochaine : {t.next_due_date}
              </p>
            </div>
            <button className="btn-ghost" onClick={() => generateNow(t.id)}>Générer maintenant</button>
          </div>
        ))}
      </div>
    </div>
  );
}
