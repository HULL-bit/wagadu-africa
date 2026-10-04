"use client";

import { use, useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { Paginated, Role, UserRow } from "@/lib/types";
import { DocumentItem, humanSize, openDocumentFile } from "@/lib/documents";
import { DocumentViewer } from "@/components/DocumentViewer";
import { BackLink } from "@/components/BackLink";

interface ShareLink {
  id: number; token: string; url: string; expires_at: string | null;
  max_downloads: number | null; download_count: number; is_revoked: boolean; is_active: boolean;
}

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { can } = useAuth();
  const doc = useApi<DocumentItem>(`/documents/${id}/`);
  const users = useApi<Paginated<UserRow>>(can("documents.send") ? "/users/" : null);
  const roles = useApi<Paginated<Role>>(can("documents.manage_library") ? "/roles/" : null);
  const links = useApi<ShareLink[]>(can("documents.share_external") ? `/documents/${id}/share-links/` : null);

  const [dist, setDist] = useState({ mode: "user", message: "" });
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newVersion, setNewVersion] = useState<File | null>(null);
  const [shareForm, setShareForm] = useState({ password: "", expires_at: "", max_downloads: "" });
  const [msg, setMsg] = useState<string | null>(null);

  if (!doc.data) return <p className="text-sm opacity-60">{doc.error ?? "Chargement…"}</p>;
  const d = doc.data;

  async function distribute() {
    setMsg(null);
    try {
      await api(`/documents/${id}/distribute/`, {
        method: "POST",
        body: {
          mode: dist.mode,
          user_ids: dist.mode === "broadcast" ? [] : recipients,
          message: dist.message,
        },
      });
      setMsg("Document diffusé.");
      setRecipients([]);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Échec");
    }
  }

  async function addVersion() {
    if (!newVersion) return;
    const fd = new FormData();
    fd.append("file", newVersion);
    await api(`/documents/${id}/versions/`, { method: "POST", body: fd });
    setNewVersion(null);
    doc.reload();
  }

  async function saveVisibility(visibility: string, rules: { subject_type: string; subject_id: number }[]) {
    await api(`/documents/${id}/visibility/`, { method: "PUT", body: { visibility, rules } });
    doc.reload();
  }

  async function createLink() {
    await api(`/documents/${id}/share-links/`, {
      method: "POST",
      body: {
        password: shareForm.password || undefined,
        expires_at: shareForm.expires_at || null,
        max_downloads: shareForm.max_downloads ? Number(shareForm.max_downloads) : null,
      },
    });
    setShareForm({ password: "", expires_at: "", max_downloads: "" });
    links.reload();
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <BackLink href="/documents" />
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="font-display text-2xl text-wagadu-brown">{d.title}</h1>
        <span className="badge bg-wagadu-sand">{d.visibility}</span>
        {d.is_in_library && <span className="badge bg-wagadu-gold/30">Bibliothèque</span>}
      </div>
      {d.description && <p className="text-sm opacity-80">{d.description}</p>}

      <div className="card flex flex-wrap gap-2">
        <button className="btn-ghost" onClick={() => openDocumentFile(d.id, "preview")}>Ouvrir dans un onglet</button>
        <button className="btn-ghost" onClick={() => openDocumentFile(d.id, "download")}>Télécharger</button>
        <button className="btn-primary"
          onClick={() => api(`/documents/${d.id}/sign/`, { method: "POST", body: { statement: "Lu et approuvé" } }).then(doc.reload)}>
          Signer (lu et approuvé)
        </button>
      </div>

      {/* Lecteur intégré */}
      {d.current_version_detail && (
        <DocumentViewer documentId={d.id}
          contentType={d.current_version_detail.content_type}
          filename={d.current_version_detail.original_filename} />
      )}

      {d.signatures && d.signatures.length > 0 && (
        <div className="card">
          <p className="label">Signatures ({d.signatures.length})</p>
          <ul className="text-sm">
            {d.signatures.map((s) => (
              <li key={s.id} className="font-mono text-xs">
                {s.signer_name || s.signer_email} — {new Date(s.signed_at).toLocaleString("fr-FR")}
                {s.statement && ` · « ${s.statement} »`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Versions */}
      <div className="card">
        <p className="label">Versions</p>
        <ul className="text-sm divide-y divide-wagadu-sand">
          {d.versions.map((v) => (
            <li key={v.id} className="py-1.5 flex justify-between">
              <span>v{v.version_number} — {v.original_filename} ({humanSize(v.size)})
                {v.note && <span className="opacity-60"> · {v.note}</span>}</span>
              <span className="font-mono text-xs opacity-50">{new Date(v.uploaded_at).toLocaleDateString("fr-FR")}</span>
            </li>
          ))}
        </ul>
        {(d.owner_email || can("documents.manage_library")) && (
          <div className="flex gap-2 mt-2">
            <input type="file" onChange={(e) => setNewVersion(e.target.files?.[0] ?? null)} className="text-sm" />
            <button className="btn-ghost" onClick={addVersion} disabled={!newVersion}>Nouvelle version</button>
          </div>
        )}
      </div>

      {/* Diffusion ciblée */}
      {can("documents.send") && (
        <div className="card space-y-2">
          <p className="label">Diffuser ce document</p>
          <select className="input" value={dist.mode} onChange={(e) => setDist({ ...dist, mode: e.target.value })}>
            <option value="user">Destinataire unique</option>
            <option value="selection">Sélection</option>
            {can("documents.broadcast") && <option value="broadcast">Tout le personnel</option>}
          </select>
          {dist.mode !== "broadcast" && (
            <select multiple className="input h-28" value={recipients}
              onChange={(e) => setRecipients(Array.from(e.target.selectedOptions, (o) => o.value))}>
              {users.data?.results.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
            </select>
          )}
          <input className="input" placeholder="Message d'accompagnement" value={dist.message}
            onChange={(e) => setDist({ ...dist, message: e.target.value })} />
          <button className="btn-primary" onClick={distribute}>Envoyer</button>
          {msg && <p className="text-sm text-wagadu-terracotta">{msg}</p>}
        </div>
      )}

      {/* Visibilité (gestionnaire) */}
      {can("documents.manage_library") && d.is_in_library && (
        <div className="card space-y-2">
          <p className="label">Visibilité</p>
          <div className="flex gap-2">
            <button className={d.visibility === "public" ? "btn-primary" : "btn-ghost"}
              onClick={() => saveVisibility("public", [])}>Tous</button>
            <button className={d.visibility === "restricted" ? "btn-primary" : "btn-ghost"}
              onClick={() => saveVisibility("restricted", d.visibility_rules.map((r) => ({ subject_type: r.subject_type, subject_id: Number(r.subject_id) })))}>
              Restreint
            </button>
          </div>
          {d.visibility === "restricted" && roles.data && (
            <div className="flex flex-wrap gap-2">
              {roles.data.results.map((r) => {
                const active = d.visibility_rules.some((v) => v.subject_type === "role" && v.subject_id === String(r.id));
                return (
                  <button key={r.id} className={active ? "btn-primary" : "btn-ghost"}
                    onClick={() => {
                      const rules = d.visibility_rules
                        .filter((v) => !(v.subject_type === "role" && v.subject_id === String(r.id)))
                        .map((v) => ({ subject_type: v.subject_type, subject_id: Number(v.subject_id) }));
                      if (!active) rules.push({ subject_type: "role", subject_id: r.id });
                      saveVisibility("restricted", rules);
                    }}>
                    {r.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Liens de partage externes */}
      {can("documents.share_external") && (
        <div className="card space-y-2">
          <p className="label">Liens de partage externes</p>
          <div className="flex flex-wrap gap-2 items-end">
            <input className="input w-36" placeholder="Mot de passe" value={shareForm.password}
              onChange={(e) => setShareForm({ ...shareForm, password: e.target.value })} />
            <input type="date" className="input w-40" value={shareForm.expires_at}
              onChange={(e) => setShareForm({ ...shareForm, expires_at: e.target.value })} />
            <input type="number" className="input w-28" placeholder="Max tél." value={shareForm.max_downloads}
              onChange={(e) => setShareForm({ ...shareForm, max_downloads: e.target.value })} />
            <button className="btn-primary" onClick={createLink}>Créer un lien</button>
          </div>
          <ul className="text-sm divide-y divide-wagadu-sand">
            {links.data?.map((l) => (
              <li key={l.id} className="py-1.5 flex justify-between items-center gap-2">
                <span className={`font-mono text-xs truncate ${l.is_active ? "" : "opacity-40 line-through"}`}>
                  {typeof window !== "undefined" ? window.location.origin : ""}{l.url}
                </span>
                <span className="text-xs opacity-60">{l.download_count}{l.max_downloads ? `/${l.max_downloads}` : ""}</span>
                {l.is_active && (
                  <button className="text-wagadu-terracotta text-xs"
                    onClick={async () => { await api(`/documents/${id}/share-links/${l.id}/revoke/`, { method: "POST", body: {} }); links.reload(); }}>
                    Révoquer
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
