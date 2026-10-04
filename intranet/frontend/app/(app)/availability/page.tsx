"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { Paginated } from "@/lib/types";
import { Icon } from "@/components/Icon";

interface Availability {
  id: number;
  user: string;
  user_name: string;
  start_date: string;
  end_date: string;
  kind: string;
  kind_display: string;
  note: string;
}

const KINDS = [
  ["absent", "Absent"],
  ["remote", "Télétravail"],
  ["morning", "Indisponible le matin"],
  ["afternoon", "Indisponible l'après-midi"],
  ["mission", "En mission / terrain"],
] as const;

const today = () => new Date().toISOString().slice(0, 10);

export default function AvailabilityPage() {
  const { me } = useAuth();
  const [scope, setScope] = useState<"mine" | "team">("team");
  const params = new URLSearchParams({ upcoming: "1" });
  if (scope === "mine") params.set("scope", "mine");
  const list = useApi<Paginated<Availability>>(`/availability/?${params.toString()}`);

  const [form, setForm] = useState({ start_date: today(), end_date: today(), kind: "absent", note: "" });
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api("/availability/", { method: "POST", body: form });
      setForm({ start_date: today(), end_date: today(), kind: "absent", note: "" });
      list.reload();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Échec de l'enregistrement");
    }
  }

  async function remove(id: number) {
    await api(`/availability/${id}/`, { method: "DELETE" });
    list.reload();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-wagadu-brown">Disponibilités</h1>
      <p className="text-sm opacity-75">
        Signalez ici les jours où vous ne serez pas disponible (absence, télétravail, mission…).
        Pas de validation : c&apos;est une information pour l&apos;équipe.
      </p>

      <form onSubmit={submit} className="card grid sm:grid-cols-2 gap-3">
        <label className="label mb-0">Du
          <input type="date" className="input" required value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        </label>
        <label className="label mb-0">Au
          <input type="date" className="input" required value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
        </label>
        <select className="input" value={form.kind}
          onChange={(e) => setForm({ ...form, kind: e.target.value })}>
          {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input className="input" placeholder="Précision (facultatif)" value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })} />
        {err && <p className="text-sm text-wagadu-terracotta sm:col-span-2">{err}</p>}
        <button className="btn-primary sm:col-span-2">Signaler</button>
      </form>

      <div className="flex gap-1 border-b border-wagadu-sand">
        {(["team", "mine"] as const).map((s) => (
          <button key={s} onClick={() => setScope(s)}
            className={`px-3 py-2 text-sm rounded-t-lg border-b-2 -mb-px ${
              scope === s ? "border-wagadu-gold text-wagadu-brown font-medium bg-white" : "border-transparent text-wagadu-brown/60"
            }`}>
            {s === "team" ? "Toute l'équipe" : "Mes signalements"}
          </button>
        ))}
      </div>

      <div className="card divide-y divide-wagadu-sand">
        {list.loading && <p className="py-2 text-sm opacity-60">Chargement…</p>}
        {list.data?.results.length === 0 && <p className="py-2 text-sm opacity-60">Aucune indisponibilité à venir.</p>}
        {list.data?.results.map((a) => (
          <div key={a.id} className="py-2.5 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-wagadu-brown">
                {scope === "team" && <span>{a.user_name} · </span>}
                {a.kind_display}
              </p>
              <p className="text-xs opacity-70">
                {new Date(a.start_date).toLocaleDateString("fr-FR")}
                {a.end_date !== a.start_date && ` → ${new Date(a.end_date).toLocaleDateString("fr-FR")}`}
                {a.note && ` · ${a.note}`}
              </p>
            </div>
            {a.user === me?.id && (
              <button className="p-1.5 rounded-lg text-wagadu-terracotta hover:bg-wagadu-terracotta/10"
                title="Retirer" onClick={() => remove(a.id)}>
                <Icon name="trash" className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
