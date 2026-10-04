"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { Paginated } from "@/lib/types";
import { Employee } from "@/lib/hr";
import { LifecycleProcess } from "@/lib/hrlota";

export default function LifecyclePage() {
  const { can } = useAuth();
  const [kind, setKind] = useState<"onboarding" | "offboarding">("onboarding");
  const procs = useApi<Paginated<LifecycleProcess>>(`/hr/lifecycle-processes/?kind=${kind}`);
  const employees = useApi<Paginated<Employee>>(can("hr.manage") ? "/hr/employees/" : null);
  const [start, setStart] = useState({ employee: "", reference_date: "" });

  async function startProcess(e: React.FormEvent) {
    e.preventDefault();
    await api("/hr/lifecycle-processes/start/", {
      method: "POST",
      body: { employee: Number(start.employee), kind, reference_date: start.reference_date || null },
    });
    setStart({ employee: "", reference_date: "" });
    procs.reload();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-wagadu-brown">Intégrations &amp; départs</h1>

      <div className="flex gap-2">
        {(["onboarding", "offboarding"] as const).map((k) => (
          <button key={k} className={kind === k ? "btn-primary" : "btn-ghost"} onClick={() => setKind(k)}>
            {k === "onboarding" ? "Intégrations" : "Départs"}
          </button>
        ))}
      </div>

      {can("hr.manage") && (
        <form onSubmit={startProcess} className="card flex flex-wrap gap-2 items-end">
          <select className="input w-56" required value={start.employee}
            onChange={(e) => setStart({ ...start, employee: e.target.value })}>
            <option value="">— Employé —</option>
            {employees.data?.results.map((em) => <option key={em.id} value={em.id}>{em.matricule} — {em.full_name || em.email}</option>)}
          </select>
          <label className="label mb-0">{kind === "onboarding" ? "Date d'entrée" : "Dernier jour"}
            <input type="date" className="input" value={start.reference_date}
              onChange={(e) => setStart({ ...start, reference_date: e.target.value })} />
          </label>
          <button className="btn-primary">Démarrer</button>
        </form>
      )}

      <div className="space-y-3">
        {procs.data?.results.map((p) => (
          <Link key={p.id} href={`/hr/lifecycle/${p.id}`} className="card block hover:bg-wagadu-sand/20">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <p className="font-medium">{p.employee_name} <span className="font-mono text-xs opacity-60">{p.matricule}</span></p>
                <p className="text-xs opacity-60">Réf. {p.reference_date} · {p.kind_display}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 rounded-full bg-wagadu-sand overflow-hidden">
                  <div className="h-full bg-wagadu-gold" style={{ width: `${p.progress.percent}%` }} />
                </div>
                <span className="text-sm font-mono">{p.progress.done}/{p.progress.total}</span>
                <span className={`badge ${p.status === "completed" ? "bg-green-100 text-green-800" : "bg-wagadu-sand"}`}>
                  {p.status === "completed" ? "terminé" : "en cours"}
                </span>
              </div>
            </div>
          </Link>
        ))}
        {procs.data?.results.length === 0 && <p className="text-sm opacity-60">Aucun processus.</p>}
      </div>
    </div>
  );
}
