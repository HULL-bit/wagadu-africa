"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Paginated } from "@/lib/types";
import { Distribution } from "@/lib/documents";

export default function SentDocumentsPage() {
  const { data, reload, loading } = useApi<Paginated<Distribution>>("/document-distributions/");
  const [open, setOpen] = useState<number | null>(null);

  async function remind(id: number) {
    const r = await api<{ reminded: number }>(`/document-distributions/${id}/remind/`, { method: "POST", body: {} });
    alert(`${r.reminded} relance(s) envoyée(s).`);
    reload();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-wagadu-brown">Historique des envois</h1>
      {loading && <p className="text-sm opacity-60">Chargement…</p>}

      <div className="space-y-3">
        {data?.results.map((d) => (
          <div key={d.id} className="card">
            <div className="flex justify-between flex-wrap gap-2">
              <div>
                <p className="font-medium">{d.document_title}</p>
                <p className="text-xs opacity-60 font-mono">
                  {d.mode_display} · {new Date(d.sent_at).toLocaleString("fr-FR")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge bg-wagadu-sand">{d.read_count}/{d.total_count} lu(s)</span>
                {d.read_count < d.total_count && (
                  <button className="btn-ghost" onClick={() => remind(d.id)}>Relancer les non-lus</button>
                )}
                <button className="text-xs text-wagadu-terracotta" onClick={() => setOpen(open === d.id ? null : d.id)}>
                  {open === d.id ? "Masquer" : "Détails"}
                </button>
              </div>
            </div>
            {open === d.id && (
              <table className="w-full text-sm mt-2">
                <tbody className="divide-y divide-wagadu-sand">
                  {d.recipients.map((r) => (
                    <tr key={r.id}>
                      <td className="py-1 font-mono text-xs">{r.user_email}</td>
                      <td className="text-right">
                        {r.is_read
                          ? <span className="text-xs opacity-60">lu le {new Date(r.read_at!).toLocaleDateString("fr-FR")}</span>
                          : <span className="badge bg-wagadu-amber/30 text-wagadu-brown">non lu</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
