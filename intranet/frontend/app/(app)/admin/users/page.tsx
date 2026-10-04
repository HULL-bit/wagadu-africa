"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { Paginated, Role, UserRow } from "@/lib/types";
import { Icon } from "@/components/Icon";

interface Dept {
  id: number;
  name: string;
}

const STATUS_OPTIONS = [
  ["active", "Actif"],
  ["invited", "Invité"],
  ["suspended", "Suspendu"],
  ["offboarded", "Départ"],
] as const;

const BLANK = { email: "", first_name: "", last_name: "", phone: "", role: "", department: "", password: "" };

export default function UsersPage() {
  const { can } = useAuth();
  const users = useApi<Paginated<UserRow>>("/users/?limit=200");
  const roles = useApi<Paginated<Role>>("/roles/");
  const depts = useApi<Paginated<Dept>>("/departments/?limit=200");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ...BLANK });
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState({
    email: "", first_name: "", last_name: "", phone: "", job_title: "", bio: "",
    role: "", department: "", status: "active", is_active: true,
  });
  const avatarRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);

  const manage = can("accounts.manage");
  const roleName = (id: number | null) => roles.data?.results.find((r) => r.id === id)?.name;
  const deptName = (id: number | null) => depts.data?.results.find((d) => d.id === id)?.name;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api("/users/", {
        method: "POST",
        body: {
          ...form,
          role: form.role ? Number(form.role) : null,
          department: form.department ? Number(form.department) : null,
        },
      });
      setCreating(false);
      setForm({ ...BLANK });
      users.reload();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Échec de création");
    }
  }

  function startEdit(u: UserRow) {
    setErr(null);
    setEditId(u.id);
    if (avatarRef.current) avatarRef.current.value = "";
    setEdit({
      email: u.email ?? "",
      first_name: u.first_name ?? "",
      last_name: u.last_name ?? "",
      phone: u.phone ?? "",
      job_title: u.job_title ?? "",
      bio: u.bio ?? "",
      role: u.role ? String(u.role) : "",
      department: u.department ? String(u.department) : "",
      status: u.status,
      is_active: u.is_active,
    });
  }

  async function saveEdit() {
    if (!editId) return;
    setErr(null);
    const payload: Record<string, string | number | boolean | null> = {
      ...edit,
      role: edit.role ? Number(edit.role) : null,
      department: edit.department ? Number(edit.department) : null,
    };
    const file = avatarRef.current?.files?.[0];
    try {
      if (file) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => fd.append(k, v == null ? "" : String(v)));
        fd.append("avatar", file);
        await api(`/users/${editId}/`, { method: "PATCH", body: fd });
      } else {
        await api(`/users/${editId}/`, { method: "PATCH", body: payload });
      }
      setEditId(null);
      users.reload();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Échec de la modification");
    }
  }

  async function resetPassword(u: UserRow) {
    const pw = prompt(`Nouveau mot de passe pour ${u.email} (≥ 10 car., 1 maj., 1 min.) :`);
    if (!pw) return;
    try {
      await api(`/users/${u.id}/reset-password/`, { method: "POST", body: { new_password: pw } });
      alert("Mot de passe réinitialisé.");
    } catch (e2) {
      alert(e2 instanceof Error ? e2.message : "Échec.");
    }
  }

  async function suspend(u: UserRow) {
    if (!confirm(`Suspendre le compte ${u.email} ?`)) return;
    await api(`/users/${u.id}/`, { method: "DELETE" });
    users.reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-wagadu-brown">Comptes</h1>
        {manage && (
          <button className="btn-primary" onClick={() => setCreating((v) => !v)}>
            {creating ? "Annuler" : "Nouveau compte"}
          </button>
        )}
      </div>

      {err && <p className="text-sm text-wagadu-terracotta">{err}</p>}

      {creating && (
        <form onSubmit={create} className="card grid sm:grid-cols-2 gap-3">
          <input className="input" placeholder="E-mail" type="email" required
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input" placeholder="Prénom"
            value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          <input className="input" placeholder="Nom"
            value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          <input className="input" placeholder="Téléphone"
            value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="">— Rôle —</option>
            {roles.data?.results.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
            <option value="">— Service —</option>
            {depts.data?.results.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input className="input sm:col-span-2" placeholder="Mot de passe initial (laisser vide = généré)" type="text"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button className="btn-primary sm:col-span-2">Créer le compte</button>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-wagadu-brown">
            <tr>
              <th className="py-2">E-mail</th><th>Nom</th><th>Rôle</th><th>Service</th><th>Statut</th><th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-wagadu-sand">
            {users.data?.results.map((u) =>
              editId === u.id ? (
                <tr key={u.id} className="bg-wagadu-sand/20">
                  <td className="py-2 align-top" colSpan={6}>
                    <div className="grid sm:grid-cols-3 gap-2">
                      <input className="input sm:col-span-3" type="email" placeholder="Adresse e-mail" value={edit.email}
                        onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
                      <input className="input" placeholder="Prénom" value={edit.first_name}
                        onChange={(e) => setEdit({ ...edit, first_name: e.target.value })} />
                      <input className="input" placeholder="Nom" value={edit.last_name}
                        onChange={(e) => setEdit({ ...edit, last_name: e.target.value })} />
                      <input className="input" placeholder="Téléphone" value={edit.phone}
                        onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
                      <input className="input" placeholder="Fonction / poste" value={edit.job_title}
                        onChange={(e) => setEdit({ ...edit, job_title: e.target.value })} />
                      <select className="input" value={edit.role}
                        onChange={(e) => setEdit({ ...edit, role: e.target.value })}>
                        <option value="">— Rôle —</option>
                        {roles.data?.results.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                      <select className="input" value={edit.department}
                        onChange={(e) => setEdit({ ...edit, department: e.target.value })}>
                        <option value="">— Service —</option>
                        {depts.data?.results.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                      <select className="input" value={edit.status}
                        onChange={(e) => setEdit({ ...edit, status: e.target.value, is_active: e.target.value === "active" })}>
                        {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <input className="input sm:col-span-2" placeholder="Présentation (bio)" value={edit.bio}
                        onChange={(e) => setEdit({ ...edit, bio: e.target.value })} />
                    </div>
                    <label className="label mt-2">Photo de profil
                      <input ref={avatarRef} type="file" accept="image/*" className="block text-sm mt-1" />
                    </label>
                    <div className="flex gap-2 mt-2">
                      <button className="btn-primary" onClick={saveEdit}>Enregistrer</button>
                      <button className="btn-ghost" onClick={() => setEditId(null)}>Annuler</button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={u.id} className="hover:bg-wagadu-sand/20">
                  <td className="py-2 font-mono text-xs">{u.email}</td>
                  <td>{u.full_name || "—"}</td>
                  <td>{u.is_super_admin ? "Super Admin" : roleName(u.role) ?? u.role_detail?.name ?? "—"}</td>
                  <td>{deptName(u.department) ?? "—"}</td>
                  <td>
                    <span className={`badge ${u.is_active ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="text-right whitespace-nowrap">
                    {manage && !u.is_super_admin && (
                      <span className="inline-flex gap-1">
                        <button className="p-1.5 rounded-lg hover:bg-wagadu-sand/60 text-wagadu-brown"
                          title="Modifier" onClick={() => startEdit(u)}>
                          <Icon name="pencil" className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-wagadu-sand/60 text-wagadu-brown"
                          title="Réinitialiser le mot de passe" onClick={() => resetPassword(u)}>
                          <Icon name="key" className="w-4 h-4" />
                        </button>
                        {u.is_active && (
                          <button className="p-1.5 rounded-lg hover:bg-wagadu-terracotta/10 text-wagadu-terracotta"
                            title="Suspendre" onClick={() => suspend(u)}>
                            <Icon name="trash" className="w-4 h-4" />
                          </button>
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
        {users.loading && <p className="py-2 text-sm opacity-60">Chargement…</p>}
        {users.error && <p className="py-2 text-sm text-wagadu-terracotta">{users.error}</p>}
      </div>
    </div>
  );
}
