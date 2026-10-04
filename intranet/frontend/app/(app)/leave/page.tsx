"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Paginated } from "@/lib/types";
import { LeaveBalance, LeaveRequest, LeaveType } from "@/lib/hr";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-wagadu-sand",
  in_review: "bg-wagadu-amber/30 text-wagadu-brown",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-wagadu-terracotta/25 text-wagadu-terracotta",
  cancelled: "bg-wagadu-sand opacity-60",
};

export default function LeavePage() {
  const types = useApi<Paginated<LeaveType>>("/hr/leave-types/");
  const balances = useApi<Paginated<LeaveBalance>>("/hr/leave-balances/");
  const requests = useApi<Paginated<LeaveRequest>>("/hr/leave-requests/?ordering=-start_date");
  const [form, setForm] = useState({ leave_type: "", start_date: "", end_date: "", reason: "" });
  const [err, setErr] = useState<string | null>(null);

  async function createAndSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const created = await api<LeaveRequest>("/hr/leave-requests/", {
        method: "POST",
        body: { ...form, leave_type: Number(form.leave_type) },
      });
      await api(`/hr/leave-requests/${created.id}/submit/`, { method: "POST", body: {} });
      setForm({ leave_type: "", start_date: "", end_date: "", reason: "" });
      balances.reload();
      requests.reload();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Échec de la demande");
    }
  }

  async function cancel(id: number) {
    await api(`/hr/leave-requests/${id}/cancel/`, { method: "POST", body: {} });
    balances.reload();
    requests.reload();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-wagadu-brown">Mes congés</h1>

      <section className="grid gap-3 sm:grid-cols-3">
        {balances.data?.results.map((b) => (
          <div key={b.id} className="card">
            <p className="label">{b.leave_type_label} · {b.year}</p>
            <p className="font-display text-3xl text-wagadu-brown">{b.remaining_days}</p>
            <p className="text-sm opacity-70">{b.taken_days} pris / {b.entitled_days} acquis</p>
          </div>
        ))}
        {balances.data?.results.length === 0 && (
          <p className="text-sm opacity-60">Aucun solde de congé enregistré pour le moment.</p>
        )}
      </section>

      <form onSubmit={createAndSubmit} className="card grid sm:grid-cols-2 gap-3">
        <p className="label sm:col-span-2">Nouvelle demande</p>
        <select className="input" required value={form.leave_type}
          onChange={(e) => setForm({ ...form, leave_type: e.target.value })}>
          <option value="">— Type de congé —</option>
          {types.data?.results.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <input className="input" placeholder="Motif" value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <label className="label">Du
          <input type="date" className="input" required value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        </label>
        <label className="label">Au
          <input type="date" className="input" required value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
        </label>
        <div className="sm:col-span-2 flex gap-2 items-center">
          <button className="btn-primary">Soumettre</button>
          {err && <span className="text-sm text-wagadu-terracotta">{err}</span>}
        </div>
      </form>

      <section className="card overflow-x-auto">
        <p className="label">Historique</p>
        <table className="w-full text-sm">
          <thead className="text-left text-wagadu-brown">
            <tr><th className="py-2">Période</th><th>Jours</th><th>Statut</th><th>Étape</th><th></th></tr>
          </thead>
          <tbody className="divide-y divide-wagadu-sand">
            {requests.data?.results.map((r) => (
              <tr key={r.id}>
                <td className="py-2 font-mono text-xs">{r.start_date} → {r.end_date}</td>
                <td>{r.working_days}</td>
                <td><span className={`badge ${STATUS_STYLE[r.status] ?? "bg-wagadu-sand"}`}>{r.status_display}</span></td>
                <td className="text-xs">{r.approval?.current_step_label ?? "—"}</td>
                <td className="text-right">
                  {["draft", "in_review", "approved"].includes(r.status) && (
                    <button className="text-wagadu-terracotta text-xs" onClick={() => cancel(r.id)}>Annuler</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
