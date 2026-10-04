"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { Paginated } from "@/lib/types";
import { EVAL_STATUS_STYLE, EvalCampaign, Evaluation } from "@/lib/hrlota";

export default function EvaluationsPage() {
  const { can } = useAuth();
  const mine = useApi<Evaluation[]>("/hr/evaluations/mine/");
  const toEval = useApi<Evaluation[]>("/hr/evaluations/to-evaluate/");
  const campaigns = useApi<Paginated<EvalCampaign>>(can("hr.view") ? "/hr/evaluation-campaigns/" : null);
  const forms = useApi<Paginated<{ id: number; name: string }>>(can("hr.manage") ? "/hr/evaluation-forms/" : null);
  const [form, setForm] = useState({ name: "", form: "", period_start: "", period_end: "" });

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    await api("/hr/evaluation-campaigns/", { method: "POST", body: { ...form, form: Number(form.form) } });
    setForm({ name: "", form: "", period_start: "", period_end: "" });
    campaigns.reload();
  }
  async function openCampaign(id: number) {
    await api(`/hr/evaluation-campaigns/${id}/open/`, { method: "POST", body: {} });
    campaigns.reload();
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl text-wagadu-brown">Évaluations de performance</h1>

      <EvalList title="Mon évaluation" evals={mine.data} />
      {!!toEval.data?.length && <EvalList title="Évaluations de mon équipe à compléter" evals={toEval.data} />}

      {can("hr.view") && (
        <section className="card">
          <p className="label">Campagnes</p>
          {can("hr.manage") && (
            <form onSubmit={createCampaign} className="flex flex-wrap gap-2 items-end mb-3">
              <input className="input w-48" placeholder="Nom de la campagne" required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <select className="input w-48" required value={form.form}
                onChange={(e) => setForm({ ...form, form: e.target.value })}>
                <option value="">— Formulaire —</option>
                {forms.data?.results.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <input type="date" className="input" required value={form.period_start}
                onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
              <input type="date" className="input" required value={form.period_end}
                onChange={(e) => setForm({ ...form, period_end: e.target.value })} />
              <button className="btn-primary">Créer</button>
            </form>
          )}
          <ul className="divide-y divide-wagadu-sand text-sm">
            {campaigns.data?.results.map((c) => (
              <li key={c.id} className="py-2 flex justify-between items-center">
                <span>{c.name} <span className="opacity-60">· {c.form_name} · {c.evaluation_count} évaluation(s)</span></span>
                <div className="flex items-center gap-2">
                  <span className={`badge ${EVAL_STATUS_STYLE[c.status] ?? "bg-wagadu-sand"}`}>{c.status_display}</span>
                  {can("hr.manage") && c.status === "draft" && (
                    <button className="btn-ghost text-xs" onClick={() => openCampaign(c.id)}>Ouvrir</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );

  function EvalList({ title, evals }: { title: string; evals: Evaluation[] | null }) {
    if (!evals?.length) return null;
    return (
      <section className="card">
        <p className="label">{title}</p>
        <ul className="divide-y divide-wagadu-sand">
          {evals.map((ev) => (
            <li key={ev.id} className="py-2 flex justify-between items-center">
              <Link href={`/hr/evaluations/${ev.id}`} className="text-wagadu-terracotta">
                {ev.campaign_name} — {ev.employee_name}
              </Link>
              <span className={`badge ${EVAL_STATUS_STYLE[ev.status]}`}>{ev.status_display}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }
}
