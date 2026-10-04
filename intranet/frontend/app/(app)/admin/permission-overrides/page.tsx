"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Paginated, Permission, UserRow } from "@/lib/types";

interface Override {
  id: number;
  user: string;
  permission_code: string;
  effect: "grant" | "deny";
  scope_type: string;
  scope_id: string;
  reason: string;
  granted_by_email: string;
  created_at: string;
  is_active: boolean;
}

export default function OverridesPage() {
  const list = useApi<Paginated<Override>>("/permission-overrides/");
  const users = useApi<Paginated<UserRow>>("/users/");
  const perms = useApi<Permission[]>("/permissions/");
  const [form, setForm] = useState({
    user: "", permission: "", effect: "grant", scope_type: "global", scope_id: "", reason: "",
  });
  const [err, setErr] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api("/permission-overrides/", {
        method: "POST",
        body: { ...form, permission: Number(form.permission) },
      });
      setForm({ ...form, permission: "", reason: "" });
      list.reload();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Échec");
    }
  }

  async function revoke(id: number) {
    await api(`/permission-overrides/${id}/revoke/`, { method: "POST", body: {} });
    list.reload();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-wagadu-brown">Exceptions individuelles</h1>
      <p className="text-sm opacity-70 max-w-2xl">
        Accorde ou retire une permission précise à un membre, indépendamment de son rôle,
        éventuellement limitée à un périmètre. Toute modification est tracée dans le journal d&apos;audit.
      </p>

      <form onSubmit={create} className="card grid sm:grid-cols-2 gap-3">
        <select className="input" required value={form.user}
          onChange={(e) => setForm({ ...form, user: e.target.value })}>
          <option value="">— Membre —</option>
          {users.data?.results.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
        </select>
        <select className="input" required value={form.permission}
          onChange={(e) => setForm({ ...form, permission: e.target.value })}>
          <option value="">— Permission —</option>
          {perms.data?.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.label}</option>)}
        </select>
        <select className="input" value={form.effect}
          onChange={(e) => setForm({ ...form, effect: e.target.value })}>
          <option value="grant">Accorder</option>
          <option value="deny">Retirer</option>
        </select>
        <select className="input" value={form.scope_type}
          onChange={(e) => setForm({ ...form, scope_type: e.target.value })}>
          <option value="global">Global</option>
          <option value="module">Module</option>
          <option value="department">Département</option>
          <option value="project">Projet</option>
        </select>
        {form.scope_type !== "global" && (
          <input className="input" placeholder="Identifiant du périmètre" value={form.scope_id}
            onChange={(e) => setForm({ ...form, scope_id: e.target.value })} />
        )}
        <input className="input" placeholder="Motif" value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <div className="sm:col-span-2 flex gap-2 items-center">
          <button className="btn-primary">Ajouter l&apos;exception</button>
          {err && <span className="text-sm text-wagadu-terracotta">{err}</span>}
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-wagadu-brown">
            <tr><th className="py-2">Membre</th><th>Permission</th><th>Effet</th><th>Périmètre</th><th>Par</th><th></th></tr>
          </thead>
          <tbody className="divide-y divide-wagadu-sand">
            {list.data?.results.map((o) => (
              <tr key={o.id} className={o.is_active ? "" : "opacity-40"}>
                <td className="py-2 font-mono text-xs">{o.user}</td>
                <td className="font-mono text-xs">{o.permission_code}</td>
                <td>
                  <span className={`badge ${o.effect === "grant" ? "bg-wagadu-sand" : "bg-wagadu-terracotta/20 text-wagadu-terracotta"}`}>
                    {o.effect === "grant" ? "accordé" : "retiré"}
                  </span>
                </td>
                <td>{o.scope_type}{o.scope_id ? `:${o.scope_id}` : ""}</td>
                <td className="text-xs">{o.granted_by_email}</td>
                <td className="text-right">
                  {o.is_active && (
                    <button className="text-wagadu-terracotta text-xs" onClick={() => revoke(o.id)}>Révoquer</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
