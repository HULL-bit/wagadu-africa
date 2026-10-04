"use client";

import { use, useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { DemandRequest, REQUEST_STATUS_STYLE } from "@/lib/phase6";
import { BackLink } from "@/components/BackLink";

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { me } = useAuth();
  const { data: r, reload } = useApi<DemandRequest>(`/requests/${id}/`);
  const [comment, setComment] = useState("");
  const [decisionComment, setDecisionComment] = useState("");

  if (!r) return <p className="text-sm opacity-60">Chargement…</p>;
  const isRequester = r.requester === me?.id;
  const canDecide = r.status === "in_review" && r.approval?.current_step_label;

  async function act(path: string, body: unknown = {}) {
    await api(`/requests/${id}/${path}/`, { method: "POST", body });
    reload();
  }
  async function addComment() {
    if (!comment.trim()) return;
    await api("/request-comments/", { method: "POST", body: { request: Number(id), body: comment } });
    setComment("");
    reload();
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <BackLink href="/requests" />
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="font-display text-2xl text-wagadu-brown">{r.reference}</h1>
        <span className={`badge ${REQUEST_STATUS_STYLE[r.status]}`}>{r.status_display}</span>
        <span className="badge bg-wagadu-sand">{r.type_label}</span>
      </div>
      <p className="text-sm">{r.title} — demandé par {r.requester_name}</p>

      <div className="card">
        <p className="label">Détail</p>
        <dl className="text-sm grid sm:grid-cols-2 gap-1">
          {Object.entries(r.data).map(([k, v]) => (
            <div key={k}><dt className="opacity-60 inline">{k} :</dt> <dd className="inline">{String(v)}</dd></div>
          ))}
        </dl>
      </div>

      {r.approval && (
        <div className="card">
          <p className="label">Circuit de validation — {r.approval.status_display}</p>
          <ul className="text-sm space-y-1">
            {r.approval.decisions.map((d) => (
              <li key={d.id} className="border-l-2 border-wagadu-sand pl-2">
                {d.approver_email} — <strong>{d.decision_display}</strong>
                {d.comment && ` « ${d.comment} »`}
              </li>
            ))}
            {r.approval.current_step_label && (
              <li className="opacity-60">En attente : {r.approval.current_step_label}</li>
            )}
          </ul>
        </div>
      )}

      {canDecide && (
        <div className="card space-y-2">
          <p className="label">Décision (si vous êtes l&apos;approbateur de l&apos;étape)</p>
          <input className="input" placeholder="Commentaire" value={decisionComment}
            onChange={(e) => setDecisionComment(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn-primary" onClick={() => act("decide", { decision: "approved", comment: decisionComment })}>Approuver</button>
            <button className="btn-ghost" onClick={() => act("decide", { decision: "returned", comment: decisionComment })}>Renvoyer</button>
            <button className="btn-ghost text-wagadu-terracotta border-wagadu-terracotta/40"
              onClick={() => act("decide", { decision: "rejected", comment: decisionComment })}>Rejeter</button>
          </div>
        </div>
      )}

      {isRequester && ["draft", "in_review"].includes(r.status) && (
        <button className="btn-ghost text-wagadu-terracotta" onClick={() => act("cancel")}>Annuler la demande</button>
      )}

      <div className="card">
        <p className="label">Commentaires</p>
        <ul className="text-sm space-y-2">
          {r.comments.map((c) => (
            <li key={c.id}>
              <span className="font-medium">{c.author_name}</span>
              <span className="text-xs opacity-50 font-mono"> · {new Date(c.created_at).toLocaleString("fr-FR")}</span>
              <p className="opacity-80">{c.body}</p>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 mt-2">
          <input className="input" placeholder="Commenter" value={comment} onChange={(e) => setComment(e.target.value)} />
          <button className="btn-ghost" onClick={addComment}>Envoyer</button>
        </div>
      </div>
    </div>
  );
}
