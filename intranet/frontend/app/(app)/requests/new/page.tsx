"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { DemandRequest, FormField, RequestType } from "@/lib/phase6";
import { Paginated } from "@/lib/types";

export default function NewRequestPage() {
  const router = useRouter();
  const types = useApi<Paginated<RequestType>>("/request-types/");
  const [typeId, setTypeId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  const type = types.data?.results.find((t) => t.id === typeId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!type) return;
    try {
      const req = await api<DemandRequest>("/requests/", {
        method: "POST",
        body: { type: type.id, title, data: values },
      });
      await api(`/requests/${req.id}/submit/`, { method: "POST", body: {} });
      router.replace(`/requests/${req.id}`);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Échec de la demande");
    }
  }

  function field(f: FormField) {
    const common = {
      className: "input",
      required: f.required,
      value: values[f.key] ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setValues({ ...values, [f.key]: e.target.value }),
    };
    if (f.type === "textarea") return <textarea {...common} rows={3} />;
    if (f.type === "select")
      return (
        <select {...common}>
          <option value="">—</option>
          {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    return <input {...common} type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} />;
  }

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="font-display text-2xl text-wagadu-brown">Nouvelle demande</h1>

      <div className="card">
        <label className="label">Type de demande</label>
        <div className="grid sm:grid-cols-3 gap-2">
          {types.data?.results.map((t) => (
            <button key={t.id} onClick={() => { setTypeId(t.id); setValues({}); }}
              className={`rounded-xl border p-3 text-sm text-left ${typeId === t.id ? "border-wagadu-gold bg-wagadu-gold/10" : "border-wagadu-sand"}`}>
              <span className="text-xl">{t.icon}</span>
              <p className="font-medium">{t.label}</p>
            </button>
          ))}
        </div>
      </div>

      {type && (
        <form onSubmit={submit} className="card space-y-3">
          <div>
            <label className="label">Objet de la demande</label>
            <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          {type.form_schema.map((f) => (
            <div key={f.key}>
              <label className="label">{f.label}{f.required && " *"}</label>
              {field(f)}
            </div>
          ))}
          {err && <p className="text-sm text-wagadu-terracotta">{err}</p>}
          <button className="btn-primary">Soumettre la demande</button>
        </form>
      )}
    </div>
  );
}
