"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { DemandRequest } from "@/lib/phase6";

export default function RequestsValidatePage() {
  const { data, reload, loading } = useApi<DemandRequest[]>("/requests/to-validate/");
  const [comment, setComment] = useState<Record<number, string>>({});

  async function decide(id: number, decision: string) {
    await api(`/requests/${id}/decide/`, { method: "POST", body: { decision, comment: comment[id] || "" } });
    reload();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-wagadu-brown">Demandes à valider</h1>
      {loading && <p className="text-sm opacity-60">Chargement…</p>}
      {data?.length === 0 && <p className="text-sm opacity-60">Aucune demande en attente de votre validation.</p>}

      <div className="space-y-3">
        {data?.map((r) => (
          <div key={r.id} className="card space-y-2">
            <div className="flex justify-between flex-wrap gap-2">
              <div>
                <p className="font-medium">{r.reference} — {r.title}</p>
                <p className="text-sm opacity-70">{r.type_label} · {r.requester_name}</p>
              </div>
              <span className="badge bg-wagadu-amber/30 text-wagadu-brown h-fit">{r.approval?.current_step_label}</span>
            </div>
            <dl className="text-xs opacity-70">
              {Object.entries(r.data).map(([k, v]) => <span key={k}>{k}: {String(v)} · </span>)}
            </dl>
            <input className="input" placeholder="Commentaire" value={comment[r.id] || ""}
              onChange={(e) => setComment({ ...comment, [r.id]: e.target.value })} />
            <div className="flex gap-2">
              <button className="btn-primary" onClick={() => decide(r.id, "approved")}>Approuver</button>
              <button className="btn-ghost" onClick={() => decide(r.id, "returned")}>Renvoyer</button>
              <button className="btn-ghost text-wagadu-terracotta border-wagadu-terracotta/40"
                onClick={() => decide(r.id, "rejected")}>Rejeter</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
