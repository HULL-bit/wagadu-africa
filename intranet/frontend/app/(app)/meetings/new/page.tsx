"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Meeting } from "@/lib/comms";
import { Paginated, UserRow } from "@/lib/types";

export default function NewMeetingPage() {
  const router = useRouter();
  const users = useApi<Paginated<UserRow>>("/users/");
  const [form, setForm] = useState({
    title: "", description: "", start: "", end: "", access: "invited", lobby: false, agenda: "",
  });
  const [participants, setParticipants] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const m = await api<Meeting>("/meetings/", {
        method: "POST",
        body: {
          ...form,
          start: new Date(form.start).toISOString(),
          end: new Date(form.end).toISOString(),
          participant_ids: participants,
        },
      });
      router.replace(`/meetings/${m.id}`);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Échec");
    }
  }

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="font-display text-2xl text-wagadu-brown">Planifier une réunion</h1>
      <form onSubmit={submit} className="card space-y-3">
        <input className="input" placeholder="Titre" required value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea className="input" rows={2} placeholder="Description" value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="label">Début<input type="datetime-local" required className="input" value={form.start}
            onChange={(e) => setForm({ ...form, start: e.target.value })} /></label>
          <label className="label">Fin<input type="datetime-local" required className="input" value={form.end}
            onChange={(e) => setForm({ ...form, end: e.target.value })} /></label>
        </div>
        <div className="flex gap-4 items-center">
          <label className="label mb-0">Accès
            <select className="input" value={form.access} onChange={(e) => setForm({ ...form, access: e.target.value })}>
              <option value="invited">Sur invitation</option>
              <option value="open">Ouverte à tous</option>
            </select>
          </label>
          <label className="flex items-center gap-1 text-sm mt-4">
            <input type="checkbox" checked={form.lobby} onChange={(e) => setForm({ ...form, lobby: e.target.checked })} />
            Salle d&apos;attente
          </label>
        </div>
        <textarea className="input" rows={3} placeholder="Ordre du jour" value={form.agenda}
          onChange={(e) => setForm({ ...form, agenda: e.target.value })} />
        <div>
          <label className="label">Participants</label>
          <select multiple className="input h-28" value={participants}
            onChange={(e) => setParticipants(Array.from(e.target.selectedOptions, (o) => o.value))}>
            {users.data?.results.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
          </select>
        </div>
        {err && <p className="text-sm text-wagadu-terracotta">{err}</p>}
        <button className="btn-primary">Créer la réunion</button>
      </form>
    </div>
  );
}
