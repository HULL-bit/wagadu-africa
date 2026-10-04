"use client";

import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Paginated } from "@/lib/types";
import { DocumentItem } from "@/lib/documents";

export default function TrashPage() {
  const { data, reload, loading } = useApi<Paginated<DocumentItem>>("/documents/?trashed=true");

  async function restore(id: number) {
    await api(`/documents/${id}/restore/`, { method: "POST", body: {} });
    reload();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-wagadu-brown">Corbeille</h1>
      <p className="text-sm opacity-70">Les documents supprimés sont conservés 30 jours avant purge définitive.</p>
      {loading && <p className="text-sm opacity-60">Chargement…</p>}
      {data?.results.length === 0 && <p className="text-sm opacity-60">La corbeille est vide.</p>}

      <div className="card divide-y divide-wagadu-sand">
        {data?.results.map((d) => (
          <div key={d.id} className="py-2 flex justify-between items-center">
            <span>{d.title}</span>
            <button className="btn-ghost" onClick={() => restore(d.id)}>Restaurer</button>
          </div>
        ))}
      </div>
    </div>
  );
}
