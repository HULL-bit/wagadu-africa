"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Paginated } from "@/lib/types";
import { Announcement } from "@/lib/phase6";
import { Icon } from "@/components/Icon";

export default function AnnouncementsAdminPage() {
  const list = useApi<Paginated<Announcement>>("/announcements/?all=true");
  const [form, setForm] = useState({ title: "", body: "", pinned: true, expires_at: "" });
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ title: "", body: "", pinned: false });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api("/announcements/", {
      method: "POST",
      body: { ...form, expires_at: form.expires_at || null },
    });
    setForm({ title: "", body: "", pinned: true, expires_at: "" });
    list.reload();
  }

  function startEdit(a: Announcement) {
    setEditId(a.id);
    setEditForm({ title: a.title, body: a.body, pinned: a.pinned });
  }

  async function saveEdit() {
    if (editId == null) return;
    await api(`/announcements/${editId}/`, { method: "PATCH", body: editForm });
    setEditId(null);
    list.reload();
  }

  async function remove(id: number) {
    if (!confirm("Supprimer définitivement cette annonce ?")) return;
    await api(`/announcements/${id}/`, { method: "DELETE" });
    list.reload();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-wagadu-brown">Fil d&apos;actualités interne</h1>

      <form onSubmit={create} className="card space-y-2">
        <input className="input" placeholder="Titre" required value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea className="input" rows={3} placeholder="Contenu de l'annonce" required value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })} />
        <div className="flex gap-4 items-center">
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={form.pinned}
              onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
            Épinglée
          </label>
          <label className="label mb-0">Expire le
            <input type="date" className="input" value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          </label>
        </div>
        <button className="btn-primary">Publier</button>
      </form>

      <div className="card divide-y divide-wagadu-sand">
        {list.data?.results.map((a) => (
          <div key={a.id} className="py-3">
            {editId === a.id ? (
              <div className="space-y-2">
                <input className="input" value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                <textarea className="input" rows={3} value={editForm.body}
                  onChange={(e) => setEditForm({ ...editForm, body: e.target.value })} />
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={editForm.pinned}
                    onChange={(e) => setEditForm({ ...editForm, pinned: e.target.checked })} />
                  Épinglée
                </label>
                <div className="flex gap-2">
                  <button className="btn-primary" onClick={saveEdit}>Enregistrer</button>
                  <button className="btn-ghost" onClick={() => setEditId(null)}>Annuler</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-wagadu-brown flex items-center gap-1.5">
                    {a.pinned && <Icon name="pin" className="w-4 h-4 text-wagadu-gold shrink-0" />}
                    {a.title}
                  </p>
                  <p className="text-sm opacity-70 whitespace-pre-wrap">{a.body}</p>
                  <p className="text-xs opacity-50 font-mono mt-1">
                    {a.author_name} · {new Date(a.publish_at).toLocaleDateString("fr-FR")}
                    {a.expires_at && ` → ${new Date(a.expires_at).toLocaleDateString("fr-FR")}`}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button className="p-1.5 rounded-lg hover:bg-wagadu-sand/60 text-wagadu-brown"
                    title="Modifier" onClick={() => startEdit(a)}>
                    <Icon name="pencil" className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-wagadu-terracotta/10 text-wagadu-terracotta"
                    title="Supprimer" onClick={() => remove(a.id)}>
                    <Icon name="trash" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
