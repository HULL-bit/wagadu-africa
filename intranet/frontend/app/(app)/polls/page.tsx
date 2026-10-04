"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Paginated } from "@/lib/types";
import { OrgPoll } from "@/lib/phase6";

export default function PollsPage() {
  const { data, reload, loading } = useApi<Paginated<OrgPoll>>("/polls/");
  const [form, setForm] = useState({ question: "", options: "", multiple_choice: false });
  const [show, setShow] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api("/polls/", {
      method: "POST",
      body: {
        question: form.question,
        multiple_choice: form.multiple_choice,
        option_labels: form.options.split(",").map((s) => s.trim()).filter(Boolean),
      },
    });
    setForm({ question: "", options: "", multiple_choice: false });
    setShow(false);
    reload();
  }

  async function vote(poll: OrgPoll, optionId: number) {
    const body = poll.multiple_choice
      ? { options: poll.my_votes.includes(optionId) ? poll.my_votes.filter((x) => x !== optionId) : [...poll.my_votes, optionId] }
      : { option: optionId };
    await api(`/polls/${poll.id}/vote/`, { method: "POST", body });
    reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-wagadu-brown">Sondages internes</h1>
        <button className="btn-primary" onClick={() => setShow((v) => !v)}>{show ? "Annuler" : "Nouveau sondage"}</button>
      </div>

      {show && (
        <form onSubmit={create} className="card space-y-2">
          <input className="input" placeholder="Question" required value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })} />
          <input className="input" placeholder="Options séparées par des virgules" required value={form.options}
            onChange={(e) => setForm({ ...form, options: e.target.value })} />
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={form.multiple_choice}
              onChange={(e) => setForm({ ...form, multiple_choice: e.target.checked })} />
            Choix multiples autorisés
          </label>
          <button className="btn-primary">Créer</button>
        </form>
      )}

      {loading && <p className="text-sm opacity-60">Chargement…</p>}
      <div className="space-y-3">
        {data?.results.map((p) => {
          const total = p.total_votes || 1;
          return (
            <div key={p.id} className="card">
              <p className="font-medium">{p.question} {!p.is_open && <span className="badge bg-wagadu-sand">clos</span>}</p>
              <p className="text-xs opacity-60">par {p.created_by_name} · {p.total_votes} votant(s)</p>
              <div className="space-y-1 mt-2">
                {p.options.map((o) => (
                  <button key={o.id} disabled={!p.is_open}
                    className={`block w-full text-left rounded-lg px-2 py-1 text-sm relative overflow-hidden ${p.my_votes.includes(o.id) ? "ring-1 ring-wagadu-gold" : ""}`}
                    onClick={() => vote(p, o.id)}>
                    <span className="absolute inset-y-0 left-0 bg-wagadu-gold/25"
                      style={{ width: `${(o.vote_count / total) * 100}%` }} />
                    <span className="relative">{o.label} — {o.vote_count}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
