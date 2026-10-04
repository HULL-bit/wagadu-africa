"use client";

import { useState } from "react";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { AuditEntry, Paginated } from "@/lib/types";
import { tokenStore } from "@/lib/api";

const SEVERITY_STYLE: Record<string, string> = {
  info: "bg-wagadu-sand",
  warning: "bg-wagadu-amber/30 text-wagadu-brown",
  critical: "bg-wagadu-terracotta/25 text-wagadu-terracotta",
};

export default function AuditPage() {
  const { can } = useAuth();
  const [filters, setFilters] = useState({ module: "", action: "", severity: "" });
  const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
  const { data, loading } = useApi<Paginated<AuditEntry>>(`/audit/${qs ? `?${qs}` : ""}`);

  async function exportCsv() {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";
    const res = await fetch(`${base}/audit/export/?${qs}`, {
      headers: { Authorization: `Bearer ${tokenStore.access}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "journal-audit.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-wagadu-brown">Journal d&apos;audit</h1>
        {can("audit.export") && (
          <button className="btn-ghost" onClick={exportCsv}>Exporter (CSV)</button>
        )}
      </div>
      <p className="text-sm opacity-70">
        Registre horodaté et non modifiable de toutes les actions sensibles.
      </p>

      <div className="card flex flex-wrap gap-2">
        {(["module", "action", "severity"] as const).map((f) => (
          <input key={f} className="input w-40" placeholder={f}
            value={filters[f]} onChange={(e) => setFilters({ ...filters, [f]: e.target.value })} />
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-wagadu-brown">
            <tr><th className="py-2">Date</th><th>Auteur</th><th>Module</th><th>Action</th><th>Cible</th><th>Sév.</th></tr>
          </thead>
          <tbody className="divide-y divide-wagadu-sand">
            {data?.results.map((e) => (
              <tr key={e.id}>
                <td className="py-2 font-mono text-xs whitespace-nowrap">
                  {new Date(e.timestamp).toLocaleString("fr-FR")}
                </td>
                <td className="text-xs">{e.actor_label}</td>
                <td>{e.module}</td>
                <td>{e.action_display}</td>
                <td className="text-xs">
                  {e.target_repr || e.message}
                  {e.confidential && (
                    <span className="badge bg-wagadu-bark text-wagadu-ivory ml-2">confidentiel</span>
                  )}
                </td>
                <td>
                  <span className={`badge ${SEVERITY_STYLE[e.severity] ?? "bg-wagadu-sand"}`}>{e.severity}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="py-2 text-sm opacity-60">Chargement…</p>}
        {data && <p className="py-2 text-xs opacity-60">{data.count} entrée(s)</p>}
      </div>
    </div>
  );
}
