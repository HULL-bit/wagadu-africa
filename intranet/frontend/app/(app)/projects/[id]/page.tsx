"use client";

import { use, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { BackLink } from "@/components/BackLink";
import { Icon } from "@/components/Icon";
import { humanSize } from "@/lib/documents";
import {
  MILESTONE_STATUS_STYLE,
  PROJECT_STATUSES,
  PROJECT_STATUS_STYLE,
  ProjectDetail,
} from "@/lib/projects";

const MS_STATUS = [
  ["todo", "À faire"],
  ["in_progress", "En cours"],
  ["done", "Atteint"],
] as const;

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { can } = useAuth();
  const router = useRouter();
  const { data, reload, loading, setData } = useApi<ProjectDetail>(`/projects/${id}/`);
  const [tab, setTab] = useState<"milestones" | "indicators" | "updates" | "documents" | "tasks">("milestones");
  const [ms, setMs] = useState({ title: "", due_date: "" });
  const [ind, setInd] = useState({ name: "", unit: "", target_value: "", current_value: "" });
  const [upd, setUpd] = useState({ date: new Date().toISOString().slice(0, 10), body: "", spent_amount: "" });
  const [newTask, setNewTask] = useState({ title: "", due_at: "" });
  const docRef = useRef<HTMLInputElement>(null);
  const [docBusy, setDocBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", summary: "", description: "", donor: "", budget: "", location: "" });

  const manage = can("projects.manage");

  if (loading && !data) return <p className="text-sm opacity-60">Chargement…</p>;
  if (!data) return <p className="text-sm text-wagadu-terracotta">Projet introuvable.</p>;
  const p = data;

  async function act<T>(fn: () => Promise<T>) {
    setErr(null);
    try {
      await fn();
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Échec de l'opération");
    }
  }

  async function setStatus(status: string) {
    const fresh = await api<ProjectDetail>(`/projects/${id}/set-status/`, { method: "POST", body: { status } });
    setData(fresh);
  }

  function startEdit() {
    setForm({
      name: p.name, summary: p.summary ?? "", description: p.description ?? "",
      donor: p.donor ?? "", budget: p.budget ?? "", location: p.location ?? "",
    });
    setEditing(true);
  }

  return (
    <div className="space-y-4">
      <BackLink href="/projects" />

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-mono text-xs opacity-60">{p.code}</p>
          <h1 className="font-display text-2xl text-wagadu-brown">{p.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {manage ? (
            <select
              className={`badge ${PROJECT_STATUS_STYLE[p.status] ?? "bg-wagadu-sand"} border-0 cursor-pointer`}
              value={p.status}
              onChange={(e) => act(() => setStatus(e.target.value))}
            >
              {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          ) : (
            <span className={`badge ${PROJECT_STATUS_STYLE[p.status] ?? "bg-wagadu-sand"}`}>{p.status_display}</span>
          )}
          {manage && !editing && (
            <>
              <button className="p-2 rounded-lg hover:bg-wagadu-sand/60 text-wagadu-brown" title="Modifier" onClick={startEdit}>
                <Icon name="pencil" className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg text-wagadu-terracotta hover:bg-wagadu-terracotta/10" title="Supprimer"
                onClick={() => {
                  if (confirm("Supprimer définitivement ce projet ?"))
                    act(async () => { await api(`/projects/${id}/`, { method: "DELETE" }); router.push("/projects"); });
                }}>
                <Icon name="trash" className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {err && <p className="text-sm text-wagadu-terracotta">{err}</p>}

      {editing ? (
        <div className="card grid sm:grid-cols-2 gap-3">
          <input className="input sm:col-span-2" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Intitulé" />
          <input className="input sm:col-span-2" value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Résumé" />
          <textarea className="input sm:col-span-2" rows={3} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description détaillée" />
          <input className="input" value={form.donor}
            onChange={(e) => setForm({ ...form, donor: e.target.value })} placeholder="Bailleur" />
          <input className="input" type="number" value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="Budget" />
          <input className="input sm:col-span-2" value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Zone d'intervention" />
          <div className="sm:col-span-2 flex gap-2">
            <button className="btn-primary"
              onClick={() => act(async () => {
                await api(`/projects/${id}/`, { method: "PATCH", body: { ...form, budget: form.budget || null } });
                setEditing(false);
              })}>Enregistrer</button>
            <button className="btn-ghost" onClick={() => setEditing(false)}>Annuler</button>
          </div>
        </div>
      ) : (
        <div className="card grid sm:grid-cols-2 gap-2 text-sm">
          {p.summary && <p className="sm:col-span-2 opacity-80">{p.summary}</p>}
          <p><span className="opacity-60">Chef de projet :</span> {p.lead_name ?? "—"}</p>
          <p><span className="opacity-60">Service :</span> {p.department_name ?? "—"}</p>
          <p><span className="opacity-60">Bailleur :</span> {p.donor || "—"}</p>
          <p><span className="opacity-60">Budget :</span> {p.budget ? `${Number(p.budget).toLocaleString("fr-FR")} ${p.currency}` : "—"}</p>
          <p><span className="opacity-60">Zone :</span> {p.location || "—"}</p>
          <p><span className="opacity-60">Période :</span> {p.start_date ?? "?"} → {p.end_date ?? "?"}</p>
          {p.application_deadline && (
            <p className="sm:col-span-2 text-wagadu-terracotta">
              Candidature à déposer avant le {new Date(p.application_deadline).toLocaleDateString("fr-FR")}
            </p>
          )}
          {p.description && <p className="sm:col-span-2 whitespace-pre-wrap opacity-80 pt-1">{p.description}</p>}
        </div>
      )}

      {/* Onglets */}
      <nav className="flex gap-1 border-b border-wagadu-sand">
        {([
          ["milestones", `Jalons (${p.milestones.length})`],
          ["tasks", `Tâches (${p.tasks.length})`],
          ["documents", `Documents (${p.documents.length})`],
          ["indicators", `Indicateurs (${p.indicators.length})`],
          ["updates", `Suivi (${p.updates.length})`],
        ] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-3 py-2 text-sm rounded-t-lg border-b-2 -mb-px ${
              tab === k ? "border-wagadu-gold text-wagadu-brown font-medium bg-white" : "border-transparent text-wagadu-brown/60"
            }`}>
            {label}
          </button>
        ))}
      </nav>

      {tab === "milestones" && (
        <div className="space-y-2">
          {manage && (
            <form className="card flex flex-wrap gap-2 items-end"
              onSubmit={(e) => { e.preventDefault(); act(async () => {
                await api("/project-milestones/", { method: "POST", body: { project: p.id, title: ms.title, due_date: ms.due_date || null } });
                setMs({ title: "", due_date: "" });
              }); }}>
              <input className="input flex-1 min-w-[12rem]" placeholder="Nouveau jalon" required value={ms.title}
                onChange={(e) => setMs({ ...ms, title: e.target.value })} />
              <input type="date" className="input" value={ms.due_date}
                onChange={(e) => setMs({ ...ms, due_date: e.target.value })} />
              <button className="btn-primary">Ajouter</button>
            </form>
          )}
          <div className="card divide-y divide-wagadu-sand">
            {p.milestones.map((m) => (
              <div key={m.id} className="py-2 flex items-center justify-between gap-2">
                <span>
                  {m.title}
                  {m.due_date && <span className="text-xs opacity-60 ml-2">échéance {new Date(m.due_date).toLocaleDateString("fr-FR")}</span>}
                </span>
                {manage ? (
                  <select className={`badge ${MILESTONE_STATUS_STYLE[m.status]} border-0 cursor-pointer`} value={m.status}
                    onChange={(e) => act(() => api(`/project-milestones/${m.id}/`, { method: "PATCH", body: { status: e.target.value } }))}>
                    {MS_STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                ) : (
                  <span className={`badge ${MILESTONE_STATUS_STYLE[m.status]}`}>
                    {MS_STATUS.find(([v]) => v === m.status)?.[1]}
                  </span>
                )}
              </div>
            ))}
            {p.milestones.length === 0 && <p className="py-2 text-sm opacity-60">Aucun jalon.</p>}
          </div>
        </div>
      )}

      {tab === "indicators" && (
        <div className="space-y-2">
          {manage && (
            <form className="card grid sm:grid-cols-4 gap-2"
              onSubmit={(e) => { e.preventDefault(); act(async () => {
                await api("/project-indicators/", { method: "POST", body: { project: p.id, ...ind } });
                setInd({ name: "", unit: "", target_value: "", current_value: "" });
              }); }}>
              <input className="input sm:col-span-2" placeholder="Indicateur" required value={ind.name}
                onChange={(e) => setInd({ ...ind, name: e.target.value })} />
              <input className="input" placeholder="Unité" value={ind.unit}
                onChange={(e) => setInd({ ...ind, unit: e.target.value })} />
              <input className="input" type="number" placeholder="Cible" required value={ind.target_value}
                onChange={(e) => setInd({ ...ind, target_value: e.target.value })} />
              <input className="input" type="number" placeholder="Valeur actuelle" value={ind.current_value}
                onChange={(e) => setInd({ ...ind, current_value: e.target.value })} />
              <button className="btn-primary sm:col-span-3">Ajouter l'indicateur</button>
            </form>
          )}
          <div className="card space-y-3">
            {p.indicators.map((i) => (
              <div key={i.id}>
                <div className="flex justify-between text-sm">
                  <span>{i.name}</span>
                  <span className="font-mono">
                    {Number(i.current_value).toLocaleString("fr-FR")} / {Number(i.target_value).toLocaleString("fr-FR")} {i.unit}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-wagadu-sand overflow-hidden mt-1">
                  <div className="h-full bg-wagadu-gold" style={{ width: `${Math.min(i.attainment, 100)}%` }} />
                </div>
                {manage && (
                  <button className="text-xs text-wagadu-terracotta mt-1"
                    onClick={() => {
                      const v = prompt(`Nouvelle valeur pour « ${i.name} »`, i.current_value);
                      if (v != null) act(() => api(`/project-indicators/${i.id}/`, { method: "PATCH", body: { current_value: v } }));
                    }}>
                    Mettre à jour la valeur
                  </button>
                )}
              </div>
            ))}
            {p.indicators.length === 0 && <p className="text-sm opacity-60">Aucun indicateur.</p>}
          </div>
        </div>
      )}

      {tab === "updates" && (
        <div className="space-y-2">
          {manage && (
            <form className="card space-y-2"
              onSubmit={(e) => { e.preventDefault(); act(async () => {
                await api(`/projects/${id}/updates/`, { method: "POST", body: { ...upd, spent_amount: upd.spent_amount || null } });
                setUpd({ date: new Date().toISOString().slice(0, 10), body: "", spent_amount: "" });
              }); }}>
              <div className="flex gap-2">
                <input type="date" className="input w-40" value={upd.date}
                  onChange={(e) => setUpd({ ...upd, date: e.target.value })} />
                <input type="number" className="input w-40" placeholder="Dépense (opt.)" value={upd.spent_amount}
                  onChange={(e) => setUpd({ ...upd, spent_amount: e.target.value })} />
              </div>
              <textarea className="input" rows={3} placeholder="Point d'avancement…" required value={upd.body}
                onChange={(e) => setUpd({ ...upd, body: e.target.value })} />
              <button className="btn-primary">Publier le point</button>
            </form>
          )}
          <div className="card divide-y divide-wagadu-sand">
            {p.updates.map((u) => (
              <div key={u.id} className="py-3">
                <p className="text-xs font-mono opacity-60">
                  {new Date(u.date).toLocaleDateString("fr-FR")} · {u.author_name}
                  {u.spent_amount && ` · dépense ${Number(u.spent_amount).toLocaleString("fr-FR")}`}
                </p>
                <p className="text-sm whitespace-pre-wrap mt-0.5">{u.body}</p>
              </div>
            ))}
            {p.updates.length === 0 && <p className="py-2 text-sm opacity-60">Aucun point de suivi.</p>}
          </div>
        </div>
      )}

      {tab === "tasks" && (
        <div className="space-y-2">
          {manage && (
            <form className="card flex flex-wrap gap-2 items-end"
              onSubmit={(e) => { e.preventDefault(); act(async () => {
                await api("/tasks/", { method: "POST", body: {
                  title: newTask.title, project: p.id, priority: "normal",
                  due_at: newTask.due_at || null,
                } });
                setNewTask({ title: "", due_at: "" });
              }); }}>
              <input className="input flex-1 min-w-[12rem]" placeholder="Nouvelle tâche du projet" required
                value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
              <input type="datetime-local" className="input" value={newTask.due_at}
                onChange={(e) => setNewTask({ ...newTask, due_at: e.target.value })} />
              <button className="btn-primary">Ajouter</button>
            </form>
          )}
          <div className="card divide-y divide-wagadu-sand">
            {p.tasks.map((t) => (
              <div key={t.id} className="py-2 flex items-center justify-between gap-2">
                <Link href={`/tasks/${t.id}`} className="text-wagadu-brown hover:underline">{t.title}</Link>
                <div className="flex items-center gap-2 shrink-0">
                  {t.due_at && (
                    <span className="text-xs font-mono opacity-60">
                      {new Date(t.due_at).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                  <span className="badge bg-wagadu-sand">{t.status_display}</span>
                  {manage && (
                    <button className="p-1 rounded text-wagadu-terracotta hover:bg-wagadu-terracotta/10"
                      title="Supprimer la tâche"
                      onClick={() => { if (confirm("Supprimer cette tâche ?")) act(() => api(`/tasks/${t.id}/`, { method: "DELETE" })); }}>
                      <Icon name="trash" className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {p.tasks.length === 0 && <p className="py-2 text-sm opacity-60">Aucune tâche rattachée à ce projet.</p>}
          </div>
        </div>
      )}

      {tab === "documents" && (
        <div className="space-y-2">
          {manage && (
            <div className="card flex flex-wrap gap-2 items-center">
              <input ref={docRef} type="file" className="text-sm flex-1" />
              <button className="btn-primary" disabled={docBusy}
                onClick={async () => {
                  const file = docRef.current?.files?.[0];
                  if (!file) return;
                  setDocBusy(true); setErr(null);
                  try {
                    const fd = new FormData();
                    fd.append("file", file);
                    fd.append("title", file.name);
                    await api(`/projects/${id}/documents/`, { method: "POST", body: fd });
                    if (docRef.current) docRef.current.value = "";
                    reload();
                  } catch (e) {
                    setErr(e instanceof Error ? e.message : "Échec de l'envoi");
                  } finally { setDocBusy(false); }
                }}>
                {docBusy ? "Envoi…" : "Ajouter un document"}
              </button>
            </div>
          )}
          <div className="card divide-y divide-wagadu-sand">
            {p.documents.map((d) => (
              <div key={d.id} className="py-2 flex items-center justify-between gap-2">
                <Link href={`/documents/${d.document_id}`} className="flex items-center gap-2 text-wagadu-brown hover:underline">
                  <Icon name="file-text" className="w-4 h-4 shrink-0" />
                  <span>{d.title}</span>
                  {d.size != null && <span className="text-xs opacity-50">· {humanSize(d.size)}</span>}
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs opacity-60">{d.added_by_name}</span>
                  {manage && (
                    <button className="p-1 rounded text-wagadu-terracotta hover:bg-wagadu-terracotta/10"
                      title="Retirer" onClick={() => { if (confirm("Retirer ce document ?")) act(() => api(`/project-documents/${d.id}/`, { method: "DELETE" })); }}>
                      <Icon name="trash" className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {p.documents.length === 0 && <p className="py-2 text-sm opacity-60">Aucun document.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
