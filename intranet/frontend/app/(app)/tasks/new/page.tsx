"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Paginated, UserRow } from "@/lib/types";
import { Task, TaskLabel } from "@/lib/tasks";

interface Team { id: number; name: string }
interface Dept { id: number; name: string }

export default function NewTaskPage() {
  const router = useRouter();
  const users = useApi<Paginated<UserRow>>("/users/");
  const teams = useApi<Paginated<Team>>("/teams/");
  const depts = useApi<Paginated<Dept>>("/departments/");
  const labels = useApi<Paginated<TaskLabel>>("/task-labels/");

  const [form, setForm] = useState({
    title: "", description: "", priority: "normal", due_at: "",
    estimated_hours: "", assigned_team: "", assigned_department: "",
  });
  const [assignees, setAssignees] = useState<string[]>([]);
  const [labelIds, setLabelIds] = useState<number[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const body: Record<string, unknown> = {
        title: form.title,
        description: form.description,
        priority: form.priority,
        due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
        estimated_hours: form.estimated_hours || null,
        assignee_ids: assignees,
        label_ids: labelIds,
      };
      if (form.assigned_team) body.assigned_team = Number(form.assigned_team);
      if (form.assigned_department) body.assigned_department = Number(form.assigned_department);
      const task = await api<Task>("/tasks/", { method: "POST", body });
      router.replace(`/tasks/${task.id}`);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Échec de création");
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="font-display text-2xl text-wagadu-brown">Nouvelle tâche</h1>
      <form onSubmit={submit} className="card space-y-3">
        <input className="input" placeholder="Titre" required value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea className="input" rows={3} placeholder="Description détaillée" value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })} />

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="label">Priorité
            <select className="input" value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {["low", "normal", "high", "urgent"].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="label">Échéance (date et heure)
            <input type="datetime-local" className="input" value={form.due_at}
              onChange={(e) => setForm({ ...form, due_at: e.target.value })} />
          </label>
          <label className="label">Charge estimée (h)
            <input type="number" step="0.5" className="input" value={form.estimated_hours}
              onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })} />
          </label>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="label">Équipe entière
            <select className="input" value={form.assigned_team}
              onChange={(e) => setForm({ ...form, assigned_team: e.target.value })}>
              <option value="">—</option>
              {teams.data?.results.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className="label">Département entier
            <select className="input" value={form.assigned_department}
              onChange={(e) => setForm({ ...form, assigned_department: e.target.value })}>
              <option value="">—</option>
              {depts.data?.results.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
        </div>

        <div>
          <label className="label">Assignés individuels</label>
          <select multiple className="input h-32" value={assignees}
            onChange={(e) => setAssignees(Array.from(e.target.selectedOptions, (o) => o.value))}>
            {users.data?.results.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
          </select>
        </div>

        {labels.data && labels.data.results.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {labels.data.results.map((l) => (
              <label key={l.id} className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={labelIds.includes(l.id)}
                  onChange={(e) => setLabelIds(e.target.checked ? [...labelIds, l.id] : labelIds.filter((x) => x !== l.id))} />
                {l.name}
              </label>
            ))}
          </div>
        )}

        {err && <p className="text-sm text-wagadu-terracotta">{err}</p>}
        <button className="btn-primary">Créer la tâche</button>
      </form>
    </div>
  );
}
