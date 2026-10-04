"use client";

import Link from "next/link";
import { useState } from "react";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { Paginated } from "@/lib/types";
import { MailItem } from "@/lib/hr";
import { tokenStore } from "@/lib/api";

const STATUS_STYLE: Record<string, string> = {
  received: "bg-wagadu-sand",
  assigned: "bg-wagadu-amber/30 text-wagadu-brown",
  in_progress: "bg-wagadu-amber/30 text-wagadu-brown",
  processed: "bg-green-100 text-green-800",
  archived: "bg-wagadu-sand opacity-60",
};

export default function MailPage() {
  const { can } = useAuth();
  const [filters, setFilters] = useState({ direction: "", status: "", search: "" });
  const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
  const { data, loading } = useApi<Paginated<MailItem>>(`/mail/${qs ? `?${qs}` : ""}`);

  async function exportCsv() {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";
    const res = await fetch(`${base}/mail/export/?${qs}`, {
      headers: { Authorization: `Bearer ${tokenStore.access}` },
    });
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = "registre-courrier.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-2xl text-wagadu-brown">Registre du courrier</h1>
        <div className="flex gap-2">
          {can("mail.export") && <button className="btn-ghost" onClick={exportCsv}>Exporter</button>}
          {can("mail.register") && <Link href="/mail/new" className="btn-primary">Enregistrer</Link>}
        </div>
      </div>

      <div className="card flex flex-wrap gap-2">
        <select className="input w-40" value={filters.direction}
          onChange={(e) => setFilters({ ...filters, direction: e.target.value })}>
          <option value="">Tous sens</option>
          <option value="incoming">Arrivée</option>
          <option value="outgoing">Départ</option>
        </select>
        <select className="input w-40" value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">Tous statuts</option>
          {["received", "assigned", "in_progress", "processed", "archived"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input className="input flex-1 min-w-[12rem]" placeholder="Recherche (objet, référence, correspondant)"
          value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-wagadu-brown">
            <tr><th className="py-2">Référence</th><th>Sens</th><th>Objet</th><th>Correspondant</th><th>Statut</th></tr>
          </thead>
          <tbody className="divide-y divide-wagadu-sand">
            {data?.results.map((m) => (
              <tr key={m.id} className="hover:bg-wagadu-sand/30">
                <td className="py-2 font-mono text-xs">
                  <Link href={`/mail/${m.id}`} className="text-wagadu-terracotta">{m.reference}</Link>
                </td>
                <td>{m.direction_display}</td>
                <td>{m.subject}</td>
                <td className="text-xs">{m.correspondent}</td>
                <td><span className={`badge ${STATUS_STYLE[m.status] ?? "bg-wagadu-sand"}`}>{m.status_display}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="py-2 text-sm opacity-60">Chargement…</p>}
        {data && <p className="py-2 text-xs opacity-60">{data.count} courrier(s)</p>}
      </div>
    </div>
  );
}
