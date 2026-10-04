"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { Paginated } from "@/lib/types";
import { DocumentItem, humanSize } from "@/lib/documents";

interface Folder { id: number; name: string; parent: number | null; document_count: number }

export default function DocumentsPage() {
  const { can } = useAuth();
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState<string>("");
  const [libraryOnly, setLibraryOnly] = useState(true);
  const folders = useApi<Paginated<Folder>>("/documents/folders/");
  const qs = new URLSearchParams({
    ...(search ? { search } : {}),
    ...(folder ? { folder } : {}),
    ...(libraryOnly ? { library: "true" } : {}),
  }).toString();
  const docs = useApi<Paginated<DocumentItem>>(`/documents/?${qs}`);

  const [upload, setUpload] = useState({ title: "", keywords: "", is_in_library: true });
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function doUpload(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", upload.title || file.name);
    fd.append("keywords", upload.keywords);
    fd.append("is_in_library", String(upload.is_in_library && can("documents.manage_library")));
    if (folder) fd.append("folder", folder);
    try {
      await api("/documents/", { method: "POST", body: fd });
      setUpload({ title: "", keywords: "", is_in_library: true });
      setFile(null);
      docs.reload();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Échec de l'import");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-wagadu-brown">Espace documentaire</h1>

      <div className="card flex flex-wrap gap-2 items-center">
        <input className="input flex-1 min-w-[12rem]" placeholder="Rechercher (titre, contenu, mots-clés)"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input w-48" value={folder} onChange={(e) => setFolder(e.target.value)}>
          <option value="">Tous les dossiers</option>
          {folders.data?.results.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.document_count})</option>)}
        </select>
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={libraryOnly} onChange={(e) => setLibraryOnly(e.target.checked)} />
          Bibliothèque
        </label>
      </div>

      <form onSubmit={doUpload} className="card flex flex-wrap gap-2 items-end">
        <input type="file" required onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm" />
        <input className="input w-48" placeholder="Titre" value={upload.title}
          onChange={(e) => setUpload({ ...upload, title: e.target.value })} />
        <input className="input w-40" placeholder="Mots-clés" value={upload.keywords}
          onChange={(e) => setUpload({ ...upload, keywords: e.target.value })} />
        {can("documents.manage_library") && (
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={upload.is_in_library}
              onChange={(e) => setUpload({ ...upload, is_in_library: e.target.checked })} />
            Ajouter à la bibliothèque
          </label>
        )}
        <button className="btn-primary">Importer</button>
        {err && <span className="text-sm text-wagadu-terracotta">{err}</span>}
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-wagadu-brown">
            <tr><th className="py-2">Titre</th><th>Dossier</th><th>Version</th><th>Visibilité</th><th>Maj</th></tr>
          </thead>
          <tbody className="divide-y divide-wagadu-sand">
            {docs.data?.results.map((d) => (
              <tr key={d.id} className="hover:bg-wagadu-sand/30">
                <td className="py-2">
                  <Link href={`/documents/${d.id}`} className="text-wagadu-terracotta">{d.title}</Link>
                  {d.current_version_detail && (
                    <span className="text-xs opacity-50"> · {humanSize(d.current_version_detail.size)}</span>
                  )}
                </td>
                <td>{d.folder_name ?? "—"}</td>
                <td className="font-mono text-xs">v{d.current_version_detail?.version_number ?? "?"}</td>
                <td><span className="badge bg-wagadu-sand">{d.visibility}</span></td>
                <td className="font-mono text-xs">{new Date(d.updated_at).toLocaleDateString("fr-FR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {docs.loading && <p className="py-2 text-sm opacity-60">Chargement…</p>}
        {docs.data?.results.length === 0 && <p className="py-2 text-sm opacity-60">Aucun document.</p>}
      </div>
    </div>
  );
}
