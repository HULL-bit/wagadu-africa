"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { Paginated, UserRow } from "@/lib/types";
import { Icon } from "@/components/Icon";

interface Dept {
  id: number;
  name: string;
  code: string;
  description: string;
  head: string | null;
  parent: number | null;
}

const BLANK = { name: "", code: "", description: "", head: "", parent: "" };

export default function DepartmentsPage() {
  const { can } = useAuth();
  const list = useApi<Paginated<Dept>>("/departments/?limit=200");
  const members = useApi<Paginated<UserRow>>("/directory/?limit=200");
  const [form, setForm] = useState({ ...BLANK });
  const [editId, setEditId] = useState<number | null>(null);
  const [edit, setEdit] = useState({ ...BLANK });
  const [err, setErr] = useState<string | null>(null);

  const manage = can("organization.manage");
  const memberName = (id: string | null) =>
    members.data?.results.find((m) => m.id === id)?.full_name;

  function payload(f: typeof BLANK) {
    return {
      name: f.name,
      code: f.code,
      description: f.description,
      head: f.head || null,
      parent: f.parent ? Number(f.parent) : null,
    };
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api("/departments/", { method: "POST", body: payload(form) });
      setForm({ ...BLANK });
      list.reload();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Échec de création");
    }
  }

  function startEdit(d: Dept) {
    setErr(null);
    setEditId(d.id);
    setEdit({
      name: d.name, code: d.code, description: d.description ?? "",
      head: d.head ?? "", parent: d.parent ? String(d.parent) : "",
    });
  }

  async function saveEdit() {
    if (editId == null) return;
    setErr(null);
    try {
      await api(`/departments/${editId}/`, { method: "PATCH", body: payload(edit) });
      setEditId(null);
      list.reload();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Échec de la modification");
    }
  }

  async function remove(d: Dept) {
    if (!confirm(`Supprimer le service « ${d.name} » ?`)) return;
    setErr(null);
    try {
      await api(`/departments/${d.id}/`, { method: "DELETE" });
      list.reload();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Suppression impossible (service encore rattaché ?).");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-wagadu-brown">Services</h1>
      {err && <p className="text-sm text-wagadu-terracotta">{err}</p>}

      {manage && (
        <form onSubmit={create} className="card grid sm:grid-cols-2 gap-3">
          <input className="input" placeholder="Nom du service" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="Code (ex. PROG)" required value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          <select className="input" value={form.head}
            onChange={(e) => setForm({ ...form, head: e.target.value })}>
            <option value="">— Responsable —</option>
            {members.data?.results.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
          <select className="input" value={form.parent}
            onChange={(e) => setForm({ ...form, parent: e.target.value })}>
            <option value="">— Service parent —</option>
            {list.data?.results.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input className="input sm:col-span-2" placeholder="Description" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button className="btn-primary sm:col-span-2">Créer le service</button>
        </form>
      )}

      <div className="card divide-y divide-wagadu-sand">
        {list.data?.results.map((d) =>
          editId === d.id ? (
            <div key={d.id} className="py-3 grid sm:grid-cols-2 gap-2">
              <input className="input" value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
              <input className="input" value={edit.code}
                onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} />
              <select className="input" value={edit.head}
                onChange={(e) => setEdit({ ...edit, head: e.target.value })}>
                <option value="">— Responsable —</option>
                {members.data?.results.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
              <select className="input" value={edit.parent}
                onChange={(e) => setEdit({ ...edit, parent: e.target.value })}>
                <option value="">— Service parent —</option>
                {list.data?.results.filter((x) => x.id !== d.id).map((x) => (
                  <option key={x.id} value={x.id}>{x.name}</option>
                ))}
              </select>
              <input className="input sm:col-span-2" placeholder="Description" value={edit.description}
                onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
              <div className="sm:col-span-2 flex gap-2">
                <button className="btn-primary" onClick={saveEdit}>Enregistrer</button>
                <button className="btn-ghost" onClick={() => setEditId(null)}>Annuler</button>
              </div>
            </div>
          ) : (
            <div key={d.id} className="py-3 flex justify-between items-start gap-3">
              <div>
                <p className="font-semibold text-wagadu-brown">
                  {d.name} <span className="font-mono text-xs opacity-60">{d.code}</span>
                </p>
                {d.description && <p className="text-sm opacity-70">{d.description}</p>}
                {d.head && <p className="text-xs opacity-60">Responsable : {memberName(d.head) ?? "—"}</p>}
              </div>
              {manage && (
                <div className="flex gap-1 shrink-0">
                  <button className="p-1.5 rounded-lg hover:bg-wagadu-sand/60 text-wagadu-brown"
                    title="Modifier" onClick={() => startEdit(d)}>
                    <Icon name="pencil" className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-wagadu-terracotta/10 text-wagadu-terracotta"
                    title="Supprimer" onClick={() => remove(d)}>
                    <Icon name="trash" className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ),
        )}
        {list.data?.results.length === 0 && <p className="py-2 text-sm opacity-60">Aucun service.</p>}
      </div>
    </div>
  );
}
