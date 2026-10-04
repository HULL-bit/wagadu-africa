"use client";

import { useApi } from "@/lib/useApi";

interface Performance {
  completed: number;
  on_time: number;
  late: number;
  open_overdue: number;
  per_user: { "assignments__user__email": string; total: number; done: number }[];
}

export default function TaskPerformancePage() {
  const { data, loading, error } = useApi<Performance>("/tasks/performance/");

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-wagadu-brown">Performance des tâches</h1>
      {loading && <p className="text-sm opacity-60">Chargement…</p>}
      {error && <p className="text-sm text-wagadu-terracotta">{error}</p>}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Stat label="Terminées" value={data.completed} />
            <Stat label="À temps" value={data.on_time} />
            <Stat label="En retard" value={data.late} accent />
            <Stat label="Ouvertes en retard" value={data.open_overdue} accent />
          </div>

          <div className="card overflow-x-auto">
            <p className="label">Par collaborateur</p>
            <table className="w-full text-sm">
              <thead className="text-left text-wagadu-brown">
                <tr><th className="py-2">Employé</th><th>Total</th><th>Terminées</th><th>Taux</th></tr>
              </thead>
              <tbody className="divide-y divide-wagadu-sand">
                {data.per_user.map((u, i) => (
                  <tr key={i}>
                    <td className="py-2 font-mono text-xs">{u["assignments__user__email"]}</td>
                    <td>{u.total}</td>
                    <td>{u.done}</td>
                    <td>{u.total ? Math.round((u.done / u.total) * 100) : 0} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="card">
      <p className="label">{label}</p>
      <p className={`font-display text-3xl ${accent ? "text-wagadu-terracotta" : "text-wagadu-brown"}`}>{value}</p>
    </div>
  );
}
