"use client";

import Link from "next/link";
import { useApi } from "@/lib/useApi";

interface HrDashboard {
  headcount: number;
  by_department: { "user__department__name": string | null; count: number }[];
  on_leave_now: number;
  pending_leave: number;
  contracts_expiring: { id: number; employee: number; type: string; end_date: string; days_to_expiry: number }[];
  health_expiring: { id: number; employee: number; label: string; expiry_date: string }[];
}

export default function HrDashboardPage() {
  const { data, loading } = useApi<HrDashboard>("/hr/dashboard/");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-wagadu-brown">Tableau de bord RH</h1>
        <Link href="/hr/employees" className="btn-ghost">Effectif</Link>
      </div>
      {loading && <p className="text-sm opacity-60">Chargement…</p>}
      {data && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Effectif" value={data.headcount} />
            <Stat label="En congé aujourd'hui" value={data.on_leave_now} />
            <Stat label="Congés à valider" value={data.pending_leave} />
            <Stat label="Contrats < 60 j" value={data.contracts_expiring.length} />
          </section>

          <section className="card">
            <p className="label">Répartition par département</p>
            <ul className="text-sm divide-y divide-wagadu-sand">
              {data.by_department.map((d, i) => (
                <li key={i} className="py-1.5 flex justify-between">
                  <span>{d["user__department__name"] ?? "Non affecté"}</span>
                  <span className="font-mono">{d.count}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <p className="label">Contrats arrivant à échéance</p>
              {data.contracts_expiring.length === 0 ? (
                <p className="text-sm opacity-60">Aucun.</p>
              ) : (
                <ul className="text-sm divide-y divide-wagadu-sand">
                  {data.contracts_expiring.map((c) => (
                    <li key={c.id} className="py-1.5 flex justify-between">
                      <Link href={`/hr/employees/${c.employee}`} className="text-wagadu-terracotta">
                        {c.type.toUpperCase()}
                      </Link>
                      <span className="font-mono text-xs">{c.end_date} ({c.days_to_expiry} j)</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="card">
              <p className="label">Visites médicales / habilitations</p>
              {data.health_expiring.length === 0 ? (
                <p className="text-sm opacity-60">Aucune échéance proche.</p>
              ) : (
                <ul className="text-sm divide-y divide-wagadu-sand">
                  {data.health_expiring.map((h) => (
                    <li key={h.id} className="py-1.5 flex justify-between">
                      <span>{h.label}</span>
                      <span className="font-mono text-xs">{h.expiry_date}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <p className="label">{label}</p>
      <p className="font-display text-3xl text-wagadu-brown">{value}</p>
    </div>
  );
}
