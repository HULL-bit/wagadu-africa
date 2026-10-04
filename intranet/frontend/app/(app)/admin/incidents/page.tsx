"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { Incident, Paginated } from "@/lib/types";
import { Icon } from "@/components/Icon";

const SEVERITY_STYLE: Record<string, string> = {
  low: "bg-wagadu-sand",
  medium: "bg-wagadu-amber/30 text-wagadu-brown",
  high: "bg-wagadu-terracotta/25 text-wagadu-terracotta",
  critical: "bg-wagadu-terracotta text-white",
};

const STATUS_STYLE: Record<string, string> = {
  open: "bg-wagadu-terracotta/20 text-wagadu-terracotta",
  investigating: "bg-wagadu-amber/30 text-wagadu-brown",
  resolved: "bg-wagadu-ivory border border-wagadu-sand",
  closed: "bg-wagadu-ivory border border-wagadu-sand opacity-60",
};

const EMPTY_FORM = { title: "", description: "", component: "", severity: "medium" };

export default function IncidentsAdminPage() {
  const { can } = useAuth();
  const [filters, setFilters] = useState({ status: "", severity: "" });
  const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
  const list = useApi<Paginated<Incident>>(`/system/incidents/${qs ? `?${qs}` : ""}`);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ status: "", resolution_notes: "" });

  const canManage = can("system.incidents.manage");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api("/system/incidents/", { method: "POST", body: form });
    setForm(EMPTY_FORM);
    list.reload();
  }

  function startEdit(i: Incident) {
    setEditId(i.id);
    setEditForm({ status: i.status, resolution_notes: i.resolution_notes });
  }

  async function saveEdit() {
    if (editId == null) return;
    await api(`/system/incidents/${editId}/`, { method: "PATCH", body: editForm });
    setEditId(null);
    list.reload();
  }

  async function remove(id: number) {
    if (!confirm("Supprimer définitivement cet incident ?")) return;
    await api(`/system/incidents/${id}/`, { method: "DELETE" });
    list.reload();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-wagadu-brown">Incidents techniques</h1>
      <p className="text-sm opacity-70">
        Pannes, bugs bloquants ou dégradations de service — suivi jusqu&apos;à résolution
        (distinct du journal d&apos;audit, qui trace les actions déjà survenues).
      </p>

      {canManage && (
        <form onSubmit={create} className="card space-y-2">
          <input className="input" placeholder="Titre" required value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="input" rows={2} placeholder="Description" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex flex-wrap gap-2">
            <input className="input w-48" placeholder="Composant (ex. Directus, API)" value={form.component}
              onChange={(e) => setForm({ ...form, component: e.target.value })} />
            <select className="input w-40" value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value })}>
              <option value="low">Mineur</option>
              <option value="medium">Modéré</option>
              <option value="high">Majeur</option>
              <option value="critical">Critique</option>
            </select>
          </div>
          <button className="btn-primary">Déclarer l&apos;incident</button>
        </form>
      )}

      <div className="card flex flex-wrap gap-2">
        <select className="input w-44" value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">Tous les statuts</option>
          <option value="open">Ouvert</option>
          <option value="investigating">En investigation</option>
          <option value="resolved">Résolu</option>
          <option value="closed">Clôturé</option>
        </select>
        <select className="input w-40" value={filters.severity}
          onChange={(e) => setFilters({ ...filters, severity: e.target.value })}>
          <option value="">Toute sévérité</option>
          <option value="low">Mineur</option>
          <option value="medium">Modéré</option>
          <option value="high">Majeur</option>
          <option value="critical">Critique</option>
        </select>
      </div>

      <div className="card divide-y divide-wagadu-sand">
        {list.data?.results.map((i) => (
          <div key={i.id} className="py-3">
            {editId === i.id ? (
              <div className="space-y-2">
                <select className="input" value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                  <option value="open">Ouvert</option>
                  <option value="investigating">En investigation</option>
                  <option value="resolved">Résolu</option>
                  <option value="closed">Clôturé</option>
                </select>
                <textarea className="input" rows={2} placeholder="Notes de résolution"
                  value={editForm.resolution_notes}
                  onChange={(e) => setEditForm({ ...editForm, resolution_notes: e.target.value })} />
                <div className="flex gap-2">
                  <button className="btn-primary" onClick={saveEdit}>Enregistrer</button>
                  <button className="btn-ghost" onClick={() => setEditId(null)}>Annuler</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-wagadu-brown flex items-center gap-1.5 flex-wrap">
                    <Icon name="alert-triangle" className="w-4 h-4 text-wagadu-terracotta shrink-0" />
                    {i.title}
                    <span className={`badge ${SEVERITY_STYLE[i.severity] ?? "bg-wagadu-sand"}`}>
                      {i.severity_display}
                    </span>
                    <span className={`badge ${STATUS_STYLE[i.status] ?? "bg-wagadu-sand"}`}>
                      {i.status_display}
                    </span>
                  </p>
                  {i.component && <p className="text-xs opacity-60 font-mono mt-0.5">{i.component}</p>}
                  {i.description && <p className="text-sm opacity-70 whitespace-pre-wrap mt-1">{i.description}</p>}
                  {i.resolution_notes && (
                    <p className="text-sm opacity-70 whitespace-pre-wrap mt-1">
                      <span className="font-semibold">Résolution : </span>{i.resolution_notes}
                    </p>
                  )}
                  <p className="text-xs opacity-50 font-mono mt-1">
                    {i.reported_by_name} · {new Date(i.created_at).toLocaleString("fr-FR")}
                    {i.resolved_at && ` → résolu le ${new Date(i.resolved_at).toLocaleString("fr-FR")}`}
                  </p>
                </div>
                {canManage && (
                  <div className="flex gap-1 shrink-0">
                    <button className="p-1.5 rounded-lg hover:bg-wagadu-sand/60 text-wagadu-brown"
                      title="Modifier" onClick={() => startEdit(i)}>
                      <Icon name="pencil" className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded-lg hover:bg-wagadu-terracotta/10 text-wagadu-terracotta"
                      title="Supprimer" onClick={() => remove(i.id)}>
                      <Icon name="trash" className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {list.data && list.data.results.length === 0 && (
          <p className="py-3 text-sm opacity-60">Aucun incident.</p>
        )}
      </div>
    </div>
  );
}
