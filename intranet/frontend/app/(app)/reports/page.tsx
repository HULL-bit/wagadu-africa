"use client";

import { useApi } from "@/lib/useApi";
import { tokenStore } from "@/lib/api";
import { ReportDef } from "@/lib/phase6";

export default function ReportsPage() {
  const { data, loading } = useApi<ReportDef[]>("/reports/");

  async function download(key: string, fmt: string) {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";
    const res = await fetch(`${base}/reports/${key}.${fmt}`, {
      headers: { Authorization: `Bearer ${tokenStore.access}` },
    });
    if (!res.ok) { alert("Export impossible."); return; }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = `${key}.${fmt}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-wagadu-brown">Rapports &amp; exports</h1>
      <p className="text-sm opacity-70">Exports Excel de chaque module ; PDF pour les registres officiels.</p>
      {loading && <p className="text-sm opacity-60">Chargement…</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {data?.map((r) => (
          <div key={r.key} className="card flex items-center justify-between">
            <span className="font-medium">{r.label}</span>
            <div className="flex gap-2">
              {r.formats.map((f) => (
                <button key={f} className="btn-ghost text-xs" onClick={() => download(r.key, f)}>
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
