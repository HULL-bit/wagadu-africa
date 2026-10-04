"use client";

import { use, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { Evaluation } from "@/lib/hrlota";
import { BackLink } from "@/components/BackLink";

export default function EvaluationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { me, can } = useAuth();
  const { data: ev, reload } = useApi<Evaluation>(`/hr/evaluations/${id}/`);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");

  const existing = useMemo(() => {
    const m: Record<string, string> = {};
    ev?.answers.forEach((a) => { m[a.question] = ""; });
    return m;
  }, [ev]);

  if (!ev) return <p className="text-sm opacity-60">Chargement…</p>;

  const canSelf = ev.status === "pending" || ev.status === "self_assessed";
  const canManager = ev.status === "self_assessed" && (ev.evaluator === me?.id || can("hr.manage"));
  const canAck = ev.status === "manager_assessed";
  const canFinalize = ev.status === "acknowledged" && can("hr.manage");

  const val = (qid: number) => answers[qid] ?? existing[qid] ?? "";

  function input(q: Evaluation["questions"][number], mode: "self" | "manager") {
    const disabled = mode === "self" ? !canSelf : !canManager;
    if (q.type === "text")
      return <textarea className="input" rows={2} disabled={disabled} value={val(q.id)}
        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />;
    if (q.type === "yes_no")
      return (
        <select className="input" disabled={disabled} value={val(q.id)}
          onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}>
          <option value="">—</option><option value="oui">Oui</option><option value="non">Non</option>
        </select>
      );
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" disabled={disabled}
            className={`w-8 h-8 rounded ${val(q.id) === String(n) ? "bg-wagadu-gold" : "bg-wagadu-sand"}`}
            onClick={() => setAnswers({ ...answers, [q.id]: String(n) })}>{n}</button>
        ))}
      </div>
    );
  }

  async function act(path: string) {
    await api(`/hr/evaluations/${id}/${path}/`, { method: "POST", body: { answers, comment } });
    setAnswers({}); setComment("");
    reload();
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <BackLink href="/hr/evaluations" />
      <h1 className="font-display text-2xl text-wagadu-brown">{ev.campaign_name}</h1>
      <p className="text-sm">{ev.employee_name} · {ev.status_display}
        {ev.self_score && ` · auto ${ev.self_score}/5`}
        {ev.manager_score && ` · responsable ${ev.manager_score}/5`}</p>

      {ev.questions.map((q) => {
        const ans = ev.answers.find((a) => a.question === q.id);
        return (
          <div key={q.id} className="card">
            <p className="text-xs uppercase tracking-wide text-wagadu-brown opacity-60">{q.section}</p>
            <p className="font-medium text-sm">{q.label}</p>
            <div className="grid sm:grid-cols-2 gap-3 mt-2">
              <div>
                <p className="label">Auto-évaluation</p>
                {canSelf ? input(q, "self") : <p className="text-sm">{ans?.self_value || "—"}</p>}
              </div>
              <div>
                <p className="label">Responsable</p>
                {canManager ? input(q, "manager") : <p className="text-sm">{ans?.manager_value || "—"}</p>}
              </div>
            </div>
          </div>
        );
      })}

      {(canSelf || canManager || canAck) && (
        <div className="card space-y-2">
          <textarea className="input" rows={2} placeholder="Commentaire" value={comment}
            onChange={(e) => setComment(e.target.value)} />
          <div className="flex gap-2">
            {canSelf && <button className="btn-primary" onClick={() => act("self-assess")}>Soumettre mon auto-évaluation</button>}
            {canManager && <button className="btn-primary" onClick={() => act("manager-assess")}>Enregistrer mon évaluation</button>}
            {canAck && <button className="btn-primary" onClick={() => act("acknowledge")}>J&apos;ai pris connaissance</button>}
          </div>
        </div>
      )}
      {canFinalize && <button className="btn-primary" onClick={() => act("finalize")}>Finaliser (RH)</button>}
      {ev.overall_comment && <div className="card text-sm"><p className="label">Commentaire du responsable</p>{ev.overall_comment}</div>}
    </div>
  );
}
