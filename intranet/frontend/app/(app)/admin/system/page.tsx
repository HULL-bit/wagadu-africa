"use client";

import { useState } from "react";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { SystemHealth } from "@/lib/types";
import { tokenStore } from "@/lib/api";
import { Icon } from "@/components/Icon";

function formatBytes(bytes?: number | null): string {
  if (bytes == null) return "—";
  const units = ["o", "Ko", "Mo", "Go", "To"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? "bg-green-500" : "bg-wagadu-terracotta"}`}
      aria-hidden
    />
  );
}

export default function SystemHealthPage() {
  const { me } = useAuth();
  const { data, loading, reload } = useApi<SystemHealth>("/system/health/");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function exportDatabase() {
    setExporting(true);
    setExportError(null);
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";
      const res = await fetch(`${base}/system/database/export/`, {
        headers: { Authorization: `Bearer ${tokenStore.access}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || `Erreur ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wagadu-${new Date().toISOString().slice(0, 10)}.sql.gz`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Échec de l'export");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-2xl text-wagadu-brown">État du système</h1>
        <button className="btn-ghost" onClick={reload} disabled={loading}>
          <Icon name="refresh" className="w-4 h-4" /> Actualiser
        </button>
      </div>
      <p className="text-sm opacity-70">
        Instantané en direct des services — base de données, cache, files
        d&apos;attente — vérifié à chaque ouverture de la page.
      </p>

      {data && (
        <p className="text-xs opacity-50 font-mono">
          Vérifié le {new Date(data.checked_at).toLocaleString("fr-FR")}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card space-y-1">
          <p className="font-semibold text-wagadu-brown flex items-center gap-2">
            <StatusDot ok={data?.database.ok ?? false} /> Base de données (PostgreSQL)
          </p>
          {data?.database.ok ? (
            <>
              <p className="text-sm opacity-70">Taille : {formatBytes(data.database.size_bytes)}</p>
              <p className="text-sm opacity-70">Connexions actives : {data.database.connections ?? "—"}</p>
            </>
          ) : (
            <p className="text-sm text-wagadu-terracotta">{data?.database.error || "Indisponible"}</p>
          )}
        </div>

        <div className="card space-y-1">
          <p className="font-semibold text-wagadu-brown flex items-center gap-2">
            <StatusDot ok={data?.redis.ok ?? false} /> Cache / file d&apos;attente (Redis)
          </p>
          {data?.redis.ok ? (
            <p className="text-sm opacity-70">Mémoire utilisée : {formatBytes(data.redis.used_memory_bytes)}</p>
          ) : (
            <p className="text-sm text-wagadu-terracotta">{data?.redis.error || "Indisponible"}</p>
          )}
        </div>

        <div className="card space-y-1">
          <p className="font-semibold text-wagadu-brown flex items-center gap-2">
            <StatusDot ok={data?.celery.ok ?? false} /> Tâches planifiées (Celery)
          </p>
          {data?.celery.ok ? (
            <p className="text-sm opacity-70">Worker(s) actif(s) : {data.celery.workers ?? 0}</p>
          ) : (
            <p className="text-sm text-wagadu-terracotta">{data?.celery.error || "Aucun worker ne répond"}</p>
          )}
        </div>

        <div className="card space-y-1">
          <p className="font-semibold text-wagadu-brown flex items-center gap-2">
            <StatusDot ok={data?.disk.ok ?? false} /> Disque (serveur)
          </p>
          {data?.disk.ok ? (
            <p className="text-sm opacity-70">
              {formatBytes(data.disk.free_bytes)} libres / {formatBytes(data.disk.total_bytes)}
            </p>
          ) : (
            <p className="text-sm text-wagadu-terracotta">{data?.disk.error || "Indisponible"}</p>
          )}
        </div>

        <div className="card space-y-1">
          <p className="font-semibold text-wagadu-brown">Incidents ouverts</p>
          <p className="text-2xl font-display">{data?.incidents.open_total ?? "—"}</p>
          {!!data?.incidents.open_critical && (
            <p className="text-sm text-wagadu-terracotta">
              dont {data.incidents.open_critical} critique(s)
            </p>
          )}
        </div>

        <div className="card space-y-1">
          <p className="font-semibold text-wagadu-brown">Journal d&apos;audit (24h)</p>
          <p className="text-2xl font-display">{data?.audit.last_24h_total ?? "—"}</p>
          {!!data?.audit.last_24h_critical && (
            <p className="text-sm text-wagadu-terracotta">
              dont {data.audit.last_24h_critical} entrée(s) critique(s)
            </p>
          )}
        </div>
      </div>

      {me?.is_super_admin && (
        <div className="card space-y-2">
          <p className="font-semibold text-wagadu-brown flex items-center gap-2">
            <Icon name="database" className="w-4 h-4" /> Export complet de la base
          </p>
          <p className="text-sm opacity-70">
            Dump SQL compressé (.sql.gz) de l&apos;intégralité de la base — réservé
            au Super Administrateur, l&apos;action est journalée dans le journal
            d&apos;audit.
          </p>
          <button className="btn-primary" onClick={exportDatabase} disabled={exporting}>
            <Icon name="download" className="w-4 h-4" />
            {exporting ? "Export en cours…" : "Exporter la base (SQL)"}
          </button>
          {exportError && <p className="text-sm text-wagadu-terracotta">{exportError}</p>}
        </div>
      )}
    </div>
  );
}
