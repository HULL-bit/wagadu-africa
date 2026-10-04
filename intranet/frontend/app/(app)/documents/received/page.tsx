"use client";

import { useApi } from "@/lib/useApi";
import { openDocumentFile, ReceivedDoc } from "@/lib/documents";

export default function ReceivedDocumentsPage() {
  const { data, reload, loading } = useApi<ReceivedDoc[]>("/documents/received/");

  async function open(r: ReceivedDoc) {
    await openDocumentFile(r.document_id, "preview");
    reload();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-wagadu-brown">Documents reçus</h1>
      {loading && <p className="text-sm opacity-60">Chargement…</p>}
      {data?.length === 0 && <p className="text-sm opacity-60">Aucun document reçu.</p>}

      <div className="card divide-y divide-wagadu-sand">
        {data?.map((r) => (
          <div key={r.id} className="py-3 flex justify-between items-start gap-3">
            <div>
              <p className={r.is_read ? "opacity-70" : "font-medium"}>{r.title}</p>
              {r.message && <p className="text-sm opacity-70">« {r.message} »</p>}
              <p className="text-xs opacity-50 font-mono">
                de {r.sent_by_email} · {new Date(r.sent_at).toLocaleString("fr-FR")}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {!r.is_read && <span className="badge bg-wagadu-amber/30 text-wagadu-brown">non lu</span>}
              <button className="btn-ghost" onClick={() => open(r)}>Ouvrir</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
