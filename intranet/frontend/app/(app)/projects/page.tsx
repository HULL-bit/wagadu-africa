"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { Paginated, UserRow } from "@/lib/types";
import { PROJECT_STATUSES, PROJECT_STATUS_STYLE, ProjectRow } from "@/lib/projects";

const BLANK = {
  code: "", name: "", summary: "", status: "prospect", lead: "", donor: "",
  budget: "", location: "", application_deadline: "", start_date: "", end_date: "",
};

export default function ProjectsPage() {
  const { can } = useAuth();
  const [status, setStatus] = useState("");
  const [mine, setMine] = useState(false);
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (mine) qs.set("mine", "1");
  const projects = useApi<Paginated<ProjectRow>>(`/projects/?${qs.toString()}`);
  const members = useApi<Paginated<UserRow>>(can("projects.manage") ? "/directory/?limit=200" : null);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ...BLANK });
  const [err, setErr] = useState<string | null>(null);

  const manage = can("projects.manage");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const r = await api<ProjectRow>("/projects/", {
        method: "POST",
        body: {
          ...form,
          budget: form.budget || null,
          lead: form.lead || null,
          application_deadline: form.application_deadline || null,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
        },
      });
      setCreating(false);
      setForm({ ...BLANK });
      projects.reload();
      void r;
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Échec de création");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-2xl text-wagadu-brown">Projets</h1>
        {manage && (
          <button className="btn-primary" onClick={() => setCreating((v) => !v)}>
            {creating ? "Annuler" : "Nouveau projet"}
          </button>
        )}
      </div>

      {err && <p className="text-sm text-wagadu-terracotta">{err}</p>}

      {creating && (
        <form onSubmit={create} className="card grid sm:grid-cols-2 gap-3">
          <input className="input" placeholder="Code (ex. BT-2026-04)" required value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <input className="input" placeholder="Intitulé du projet" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input sm:col-span-2" placeholder="Résumé" value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })} />
          <select className="input" value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select className="input" value={form.lead}
            onChange={(e) => setForm({ ...form, lead: e.target.value })}>
            <option value="">— Chef de projet —</option>
            {members.data?.results.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
          <input className="input" placeholder="Bailleur / financeur" value={form.donor}
            onChange={(e) => setForm({ ...form, donor: e.target.value })} />
          <input className="input" placeholder="Budget" type="number" value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          <input className="input" placeholder="Zone d'intervention" value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <label className="label mb-0">Échéance de dépôt
            <input type="date" className="input" value={form.application_deadline}
              onChange={(e) => setForm({ ...form, application_deadline: e.target.value })} />
          </label>
          <label className="label mb-0">Début
            <input type="date" className="input" value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </label>
          <label className="label mb-0">Fin
            <input type="date" className="input" value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </label>
          <button className="btn-primary sm:col-span-2">Créer le projet</button>
        </form>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
          Mes projets
        </label>
      </div>

      {projects.loading && <p className="text-sm opacity-60">Chargement…</p>}
      {projects.data?.results.length === 0 && <p className="text-sm opacity-60">Aucun projet.</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.data?.results.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="card card-hover flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <span className="font-mono text-xs opacity-60">{p.code}</span>
              <span className={`badge ${PROJECT_STATUS_STYLE[p.status] ?? "bg-wagadu-sand"}`}>
                {p.status_display}
              </span>
            </div>
            <p className="font-semibold text-wagadu-brown mt-1">{p.name}</p>
            {p.summary && <p className="text-sm opacity-75 mt-1 line-clamp-2">{p.summary}</p>}

            <dl className="text-xs opacity-70 mt-3 space-y-0.5">
              {p.donor && <div>Bailleur : {p.donor}</div>}
              {p.lead_name && <div>Chef de projet : {p.lead_name}</div>}
              {p.location && <div>Zone : {p.location}</div>}
              {p.application_deadline && <div>Dépôt avant le {new Date(p.application_deadline).toLocaleDateString("fr-FR")}</div>}
            </dl>

            {["active", "completed", "on_hold"].includes(p.status) && (
              <div className="mt-3">
                <div className="h-2 rounded-full bg-wagadu-sand overflow-hidden">
                  <div className="h-full bg-wagadu-gold" style={{ width: `${p.progress}%` }} />
                </div>
                <p className="text-[11px] opacity-60 mt-0.5">{p.progress}% des jalons atteints</p>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
