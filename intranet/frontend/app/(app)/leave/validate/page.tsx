"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { LeaveRequest } from "@/lib/hr";

export default function LeaveValidatePage() {
  const { data, reload, loading } = useApi<LeaveRequest[]>("/hr/leave-requests/to-validate/");
  const [comment, setComment] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);

  async function decide(id: number, decision: "approved" | "rejected" | "returned") {
    setBusy(id);
    try {
      await api(`/hr/leave-requests/${id}/decide/`, {
        method: "POST",
        body: { decision, comment: comment[id] || "" },
      });
      reload();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-wagadu-brown">Congés à valider</h1>
      {loading && <p className="text-sm opacity-60">Chargement…</p>}
      {data?.length === 0 && <p className="text-sm opacity-60">Aucune demande en attente de votre validation.</p>}

      <div className="space-y-3">
        {data?.map((r) => (
          <div key={r.id} className="card space-y-2">
            <div className="flex justify-between flex-wrap gap-2">
              <div>
                <p className="font-medium">{r.employee_name}</p>
                <p className="text-sm font-mono">{r.start_date} → {r.end_date} · {r.working_days} j</p>
                <p className="text-sm opacity-70">{r.reason || "—"}</p>
              </div>
              <span className="badge bg-wagadu-amber/30 text-wagadu-brown h-fit">
                {r.approval?.current_step_label}
              </span>
            </div>
            {r.approval && r.approval.decisions.length > 0 && (
              <ul className="text-xs opacity-70 border-l-2 border-wagadu-sand pl-2">
                {r.approval.decisions.map((d) => (
                  <li key={d.id}>{d.approver_email} — {d.decision_display} {d.comment && `« ${d.comment} »`}</li>
                ))}
              </ul>
            )}
            <input className="input" placeholder="Commentaire (optionnel)"
              value={comment[r.id] || ""} onChange={(e) => setComment({ ...comment, [r.id]: e.target.value })} />
            <div className="flex gap-2">
              <button className="btn-primary" disabled={busy === r.id} onClick={() => decide(r.id, "approved")}>
                Approuver
              </button>
              <button className="btn-ghost" disabled={busy === r.id} onClick={() => decide(r.id, "returned")}>
                Renvoyer
              </button>
              <button className="btn-ghost text-wagadu-terracotta border-wagadu-terracotta/40"
                disabled={busy === r.id} onClick={() => decide(r.id, "rejected")}>
                Rejeter
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
