"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { MailItem } from "@/lib/hr";

export default function NewMailPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    direction: "incoming",
    subject: "",
    correspondent: "",
    mail_date: new Date().toISOString().slice(0, 10),
    body: "",
    confidentiality: "normal",
    due_date: "",
  });
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const payload = { ...form, due_date: form.due_date || null };
      const mail = await api<MailItem>("/mail/", { method: "POST", body: payload });
      router.replace(`/mail/${mail.id}`);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Échec de l'enregistrement");
    }
  }

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="font-display text-2xl text-wagadu-brown">Enregistrer un courrier</h1>
      <form onSubmit={submit} className="card space-y-3">
        <div className="flex gap-2">
          {(["incoming", "outgoing"] as const).map((d) => (
            <label key={d} className="flex items-center gap-1 text-sm">
              <input type="radio" name="direction" checked={form.direction === d}
                onChange={() => setForm({ ...form, direction: d })} />
              {d === "incoming" ? "Arrivée" : "Départ"}
            </label>
          ))}
        </div>
        <div>
          <label className="label">Objet</label>
          <input className="input" required value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </div>
        <div>
          <label className="label">{form.direction === "incoming" ? "Expéditeur" : "Destinataire"}</label>
          <input className="input" required value={form.correspondent}
            onChange={(e) => setForm({ ...form, correspondent: e.target.value })} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="label">Date du courrier
            <input type="date" className="input" required value={form.mail_date}
              onChange={(e) => setForm({ ...form, mail_date: e.target.value })} />
          </label>
          <label className="label">Échéance de traitement
            <input type="date" className="input" value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </label>
        </div>
        <div>
          <label className="label">Confidentialité</label>
          <select className="input" value={form.confidentiality}
            onChange={(e) => setForm({ ...form, confidentiality: e.target.value })}>
            <option value="normal">Normal</option>
            <option value="restricted">Restreint</option>
            <option value="confidential">Confidentiel</option>
          </select>
        </div>
        <textarea className="input" rows={3} placeholder="Contenu / résumé"
          value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        {err && <p className="text-sm text-wagadu-terracotta">{err}</p>}
        <button className="btn-primary">Enregistrer</button>
      </form>
    </div>
  );
}
