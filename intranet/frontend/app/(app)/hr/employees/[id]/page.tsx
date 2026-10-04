"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { Paginated } from "@/lib/types";
import { Employee } from "@/lib/hr";
import { BackLink } from "@/components/BackLink";
import { Icon } from "@/components/Icon";

const EMP_TYPES = ["cdi", "cdd", "internship", "service", "volunteer"];
const HR_STATUSES = ["onboarding", "active", "on_leave", "probation", "left"];

interface Contract {
  id: number; type: string; start_date: string; end_date: string | null;
  days_to_expiry: number | null; is_open_ended: boolean;
}
interface CareerEvent {
  id: number; type: string; date: string; title: string; description: string;
}
interface HealthRecord {
  id: number; record_type: string; label: string; date: string; expiry_date: string | null;
}

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { can } = useAuth();
  const router = useRouter();
  const emp = useApi<Employee>(`/hr/employees/${id}/`);
  const contracts = useApi<Paginated<Contract>>(`/hr/contracts/?employee=${id}`);
  const events = useApi<Paginated<CareerEvent>>(`/hr/career-events/?employee=${id}`);
  const health = useApi<Paginated<HealthRecord>>(`/hr/health-records/?employee=${id}`);
  const [tab, setTab] = useState<"contracts" | "career" | "health">("contracts");
  const [evt, setEvt] = useState({ type: "promotion", date: "", title: "", description: "" });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    job_title: "", employment_type: "cdi", hr_status: "active",
    hire_date: "", probation_end: "", national_id: "",
  });
  const [err, setErr] = useState<string | null>(null);

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    await api("/hr/career-events/", { method: "POST", body: { ...evt, employee: Number(id) } });
    setEvt({ type: "promotion", date: "", title: "", description: "" });
    events.reload();
  }

  function startEdit() {
    if (!emp.data) return;
    setErr(null);
    setForm({
      job_title: emp.data.job_title ?? "",
      employment_type: emp.data.employment_type ?? "cdi",
      hr_status: emp.data.hr_status ?? "active",
      hire_date: emp.data.hire_date ?? "",
      probation_end: emp.data.probation_end ?? "",
      national_id: emp.data.national_id ?? "",
    });
    setEditing(true);
  }

  async function saveEdit() {
    setErr(null);
    try {
      await api(`/hr/employees/${id}/`, {
        method: "PATCH",
        body: { ...form, probation_end: form.probation_end || null },
      });
      setEditing(false);
      emp.reload();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Échec de la modification");
    }
  }

  async function removeEmployee() {
    if (!confirm("Supprimer définitivement cette fiche employé ?")) return;
    await api(`/hr/employees/${id}/`, { method: "DELETE" });
    router.push("/hr/employees");
  }

  if (!emp.data) return <p className="text-sm opacity-60">{emp.error ?? "Chargement…"}</p>;
  const e = emp.data;

  return (
    <div className="space-y-4">
      <BackLink href="/hr/employees" />
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h1 className="font-display text-2xl text-wagadu-brown">
          {e.full_name || e.email} <span className="font-mono text-base opacity-60">{e.matricule}</span>
        </h1>
        {can("hr.manage") && !editing && (
          <div className="flex gap-1">
            <button className="btn-ghost text-sm" onClick={startEdit}>
              <Icon name="pencil" className="w-4 h-4" /> Modifier
            </button>
            <button className="p-2 rounded-lg text-wagadu-terracotta hover:bg-wagadu-terracotta/10"
              title="Supprimer la fiche" onClick={removeEmployee}>
              <Icon name="trash" className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {err && <p className="text-sm text-wagadu-terracotta">{err}</p>}

      {editing ? (
        <div className="card grid sm:grid-cols-2 gap-3">
          <label className="label">Poste
            <input className="input" value={form.job_title}
              onChange={(x) => setForm({ ...form, job_title: x.target.value })} />
          </label>
          <label className="label">Type de contrat
            <select className="input" value={form.employment_type}
              onChange={(x) => setForm({ ...form, employment_type: x.target.value })}>
              {EMP_TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
          </label>
          <label className="label">Statut RH
            <select className="input" value={form.hr_status}
              onChange={(x) => setForm({ ...form, hr_status: x.target.value })}>
              {HR_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="label">Date d&apos;entrée
            <input type="date" className="input" value={form.hire_date}
              onChange={(x) => setForm({ ...form, hire_date: x.target.value })} />
          </label>
          <label className="label">Fin de période d&apos;essai
            <input type="date" className="input" value={form.probation_end}
              onChange={(x) => setForm({ ...form, probation_end: x.target.value })} />
          </label>
          <label className="label">Pièce d&apos;identité
            <input className="input" value={form.national_id}
              onChange={(x) => setForm({ ...form, national_id: x.target.value })} />
          </label>
          <div className="sm:col-span-2 flex gap-2">
            <button className="btn-primary" onClick={saveEdit}>Enregistrer</button>
            <button className="btn-ghost" onClick={() => setEditing(false)}>Annuler</button>
          </div>
        </div>
      ) : (
        <div className="card grid sm:grid-cols-2 gap-2 text-sm">
          <p><span className="opacity-60">Poste :</span> {e.job_title || "—"}</p>
          <p><span className="opacity-60">Type :</span> {e.employment_type}</p>
          <p><span className="opacity-60">Entrée :</span> {e.hire_date || "—"}</p>
          <p><span className="opacity-60">Ancienneté :</span> {e.seniority_years ?? "—"} an(s)</p>
          <p><span className="opacity-60">Statut RH :</span> {e.hr_status}</p>
          <p><span className="opacity-60">E-mail :</span> {e.email}</p>
        </div>
      )}

      <div className="flex gap-2">
        {(["contracts", "career", "health"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-xl px-3 py-1.5 text-sm ${tab === t ? "bg-wagadu-gold text-wagadu-ebony" : "btn-ghost"}`}>
            {{ contracts: "Contrats", career: "Carrière", health: "Médical / Habilitations" }[t]}
          </button>
        ))}
      </div>

      {tab === "contracts" && (
        <div className="card divide-y divide-wagadu-sand text-sm">
          {contracts.data?.results.map((c) => (
            <div key={c.id} className="py-2 flex justify-between">
              <span>{c.type.toUpperCase()} — depuis {c.start_date}</span>
              <span className="font-mono text-xs">
                {c.is_open_ended ? "durée indéterminée" : `${c.end_date} (${c.days_to_expiry} j)`}
              </span>
            </div>
          ))}
          {contracts.data?.results.length === 0 && <p className="py-2 opacity-60">Aucun contrat.</p>}
        </div>
      )}

      {tab === "career" && (
        <div className="space-y-3">
          {can("hr.manage") && (
            <form onSubmit={addEvent} className="card grid sm:grid-cols-2 gap-2">
              <select className="input" value={evt.type} onChange={(x) => setEvt({ ...evt, type: x.target.value })}>
                {["promotion", "training", "warning", "role_change", "transfer", "other"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input type="date" className="input" required value={evt.date}
                onChange={(x) => setEvt({ ...evt, date: x.target.value })} />
              <input className="input sm:col-span-2" placeholder="Intitulé" required value={evt.title}
                onChange={(x) => setEvt({ ...evt, title: x.target.value })} />
              <button className="btn-primary sm:col-span-2">Ajouter l'évènement</button>
            </form>
          )}
          <div className="card divide-y divide-wagadu-sand text-sm">
            {events.data?.results.map((ev) => (
              <div key={ev.id} className="py-2">
                <p className="font-medium">{ev.title} <span className="opacity-60">({ev.type})</span></p>
                <p className="text-xs font-mono opacity-60">{ev.date}</p>
                {ev.description && <p className="opacity-70">{ev.description}</p>}
              </div>
            ))}
            {events.data?.results.length === 0 && <p className="py-2 opacity-60">Aucun évènement.</p>}
          </div>
        </div>
      )}

      {tab === "health" && (
        <div className="card divide-y divide-wagadu-sand text-sm">
          {health.data?.results.map((h) => (
            <div key={h.id} className="py-2 flex justify-between">
              <span>{h.label} <span className="opacity-60">({h.record_type})</span></span>
              <span className="font-mono text-xs">
                {h.date}{h.expiry_date ? ` → ${h.expiry_date}` : ""}
              </span>
            </div>
          ))}
          {health.data?.results.length === 0 && <p className="py-2 opacity-60">Aucun suivi enregistré.</p>}
        </div>
      )}
    </div>
  );
}
