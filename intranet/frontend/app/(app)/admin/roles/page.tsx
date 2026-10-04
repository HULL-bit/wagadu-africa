"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { Paginated, Permission, Role } from "@/lib/types";
import { Icon } from "@/components/Icon";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function RolesPage() {
  const { can } = useAuth();
  const roles = useApi<Paginated<Role>>("/roles/");
  const perms = useApi<Permission[]>("/permissions/");
  const [selected, setSelected] = useState<number | null>(null);
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newRole, setNewRole] = useState({ name: "", description: "" });
  const canManage = can("accounts.manage");

  async function createRole(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api("/roles/", {
        method: "POST",
        body: { ...newRole, slug: slugify(newRole.name) },
      });
      setNewRole({ name: "", description: "" });
      setCreating(false);
      roles.reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Échec de création");
    }
  }

  async function deleteRole(r: Role) {
    if (!confirm(`Supprimer le rôle « ${r.name} » ?`)) return;
    setMsg(null);
    try {
      await api(`/roles/${r.id}/`, { method: "DELETE" });
      if (selected === r.id) setSelected(null);
      roles.reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Suppression impossible.");
    }
  }

  const current = roles.data?.results.find((r) => r.id === selected) ?? null;
  const byModule = useMemo(() => {
    const m: Record<string, Permission[]> = {};
    (perms.data ?? []).forEach((p) => (m[p.module] ??= []).push(p));
    return m;
  }, [perms.data]);

  function open(r: Role) {
    setSelected(r.id);
    setDraft(new Set(r.permission_codes));
    setMsg(null);
  }

  async function save() {
    if (!current) return;
    await api(`/roles/${current.id}/permissions/`, {
      method: "PUT",
      body: { permission_codes: [...draft] },
    });
    setMsg("Permissions enregistrées.");
    roles.reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-wagadu-brown">Rôles &amp; permissions</h1>
        {canManage && (
          <button className="btn-primary" onClick={() => setCreating((v) => !v)}>
            {creating ? "Annuler" : "Nouveau rôle"}
          </button>
        )}
      </div>

      {msg && <p className="text-sm text-wagadu-terracotta">{msg}</p>}

      {creating && (
        <form onSubmit={createRole} className="card grid sm:grid-cols-2 gap-3">
          <input className="input" placeholder="Nom du rôle" required value={newRole.name}
            onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} />
          <input className="input" placeholder="Description" value={newRole.description}
            onChange={(e) => setNewRole({ ...newRole, description: e.target.value })} />
          <p className="text-xs opacity-60 sm:col-span-2">
            Identifiant : <span className="font-mono">{slugify(newRole.name) || "—"}</span>
          </p>
          <button className="btn-primary sm:col-span-2">Créer le rôle</button>
        </form>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card space-y-1">
          {roles.data?.results.map((r) => (
            <div key={r.id} className={`flex items-center gap-1 rounded-xl pr-1 ${
              selected === r.id ? "bg-wagadu-gold text-wagadu-ebony" : "hover:bg-wagadu-sand/50"
            }`}>
              <button onClick={() => open(r)} className="flex-1 text-left px-3 py-2 text-sm">
                {r.name}
                <span className="opacity-60"> · {r.user_count} membre(s)</span>
                {r.is_system && <span className="badge bg-wagadu-sand ml-2">système</span>}
              </button>
              {canManage && !r.is_system && r.user_count === 0 && (
                <button title="Supprimer" onClick={() => deleteRole(r)}
                  className="p-1.5 rounded-lg hover:bg-wagadu-terracotta/15 text-wagadu-terracotta">
                  <Icon name="trash" className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="card md:col-span-2">
          {!current ? (
            <p className="text-sm opacity-60">Sélectionnez un rôle pour voir son socle de permissions.</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg text-wagadu-brown">{current.name}</h2>
                {can("accounts.manage_permissions") && (
                  <button className="btn-primary" onClick={save}>Enregistrer</button>
                )}
              </div>
              <p className="text-sm opacity-70 mb-3">{current.description}</p>
              {msg && <p className="text-sm text-wagadu-terracotta mb-2">{msg}</p>}

              <div className="space-y-4">
                {Object.entries(byModule).map(([mod, list]) => (
                  <div key={mod}>
                    <p className="label uppercase text-xs tracking-wide">{mod}</p>
                    <div className="grid sm:grid-cols-2 gap-1">
                      {list.map((p) => (
                        <label key={p.code} className="flex items-center gap-2 text-sm">
                          <input type="checkbox"
                            disabled={!can("accounts.manage_permissions")}
                            checked={draft.has(p.code)}
                            onChange={(e) => {
                              const next = new Set(draft);
                              if (e.target.checked) next.add(p.code);
                              else next.delete(p.code);
                              setDraft(next);
                            }} />
                          <span title={p.code}>{p.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
