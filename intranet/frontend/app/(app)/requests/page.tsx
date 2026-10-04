"use client";

import Link from "next/link";
import { useApi } from "@/lib/useApi";
import { DemandRequest, REQUEST_STATUS_STYLE } from "@/lib/phase6";

export default function RequestsPage() {
  const { data, loading } = useApi<DemandRequest[]>("/requests/mine/");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-wagadu-brown">Mes demandes</h1>
        <Link href="/requests/new" className="btn-primary">Nouvelle demande</Link>
      </div>
      {loading && <p className="text-sm opacity-60">Chargement…</p>}
      {data?.length === 0 && <p className="text-sm opacity-60">Aucune demande.</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-wagadu-brown">
            <tr><th className="py-2">Référence</th><th>Type</th><th>Objet</th><th>Statut</th><th>Étape</th></tr>
          </thead>
          <tbody className="divide-y divide-wagadu-sand">
            {data?.map((r) => (
              <tr key={r.id} className="hover:bg-wagadu-sand/30">
                <td className="py-2 font-mono text-xs">
                  <Link href={`/requests/${r.id}`} className="text-wagadu-terracotta">{r.reference}</Link>
                </td>
                <td>{r.type_label}</td>
                <td>{r.title}</td>
                <td><span className={`badge ${REQUEST_STATUS_STYLE[r.status]}`}>{r.status_display}</span></td>
                <td className="text-xs">{r.approval?.current_step_label ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
