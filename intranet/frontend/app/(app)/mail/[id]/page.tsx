"use client";

import { use, useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { Paginated, UserRow } from "@/lib/types";
import { MailItem } from "@/lib/hr";
import { BackLink } from "@/components/BackLink";

const STATUSES = ["received", "assigned", "in_progress", "processed", "archived"];

export default function MailDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { can } = useAuth();
  const { data: mail, reload } = useApi<MailItem>(`/mail/${id}/`);
  const users = useApi<Paginated<UserRow>>(can("mail.assign") ? "/users/" : null);
  const [assignee, setAssignee] = useState("");

  async function act(path: string, body: unknown = {}) {
    await api(`/mail/${id}/${path}/`, { method: "POST", body });
    reload();
  }

  if (!mail) return <p className="text-sm opacity-60">Chargement…</p>;

  return (
    <div className="space-y-4 max-w-2xl">
      <BackLink href="/mail" />
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="font-display text-2xl text-wagadu-brown">{mail.reference}</h1>
        <span className="badge bg-wagadu-sand">{mail.status_display}</span>
        <span className="badge bg-wagadu-sand">{mail.direction_display}</span>
        {mail.confidentiality !== "normal" && (
          <span className="badge bg-wagadu-terracotta/20 text-wagadu-terracotta">{mail.confidentiality}</span>
        )}
      </div>

      <div className="card space-y-1">
        <p className="font-medium">{mail.subject}</p>
        <p className="text-sm">Correspondant : {mail.correspondent}</p>
        <p className="text-sm font-mono opacity-70">Courrier daté du {mail.mail_date}</p>
        {mail.body && <p className="text-sm mt-2 whitespace-pre-wrap">{mail.body}</p>}
      </div>

      <div className="card flex flex-wrap gap-2 items-end">
        <button className="btn-ghost" onClick={() => act("acknowledge")}>Accuser réception</button>
        {can("mail.process") && (
          <select className="input w-44" value={mail.status}
            onChange={(e) => act("status", { status: e.target.value })}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        {can("mail.assign") && (
          <div className="flex gap-2 items-end">
            <select className="input w-52" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option value="">— Affecter à —</option>
              {users.data?.results.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
            </select>
            <button className="btn-primary" disabled={!assignee}
              onClick={() => act("assign", { user: assignee })}>Affecter</button>
          </div>
        )}
      </div>

      {mail.acknowledgements.length > 0 && (
        <div className="card">
          <p className="label">Accusés de réception</p>
          <ul className="text-sm">
            {mail.acknowledgements.map((a) => (
              <li key={a.id} className="font-mono text-xs">
                {a.user_email} — {new Date(a.acknowledged_at).toLocaleString("fr-FR")}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <p className="label">Traçabilité</p>
        <ul className="divide-y divide-wagadu-sand text-sm">
          {mail.events.map((ev) => (
            <li key={ev.id} className="py-1.5">
              <span className="font-medium">{ev.type_display}</span>
              {ev.detail && <span className="opacity-70"> — {ev.detail}</span>}
              <span className="block text-xs opacity-50 font-mono">
                {ev.actor_email} · {new Date(ev.created_at).toLocaleString("fr-FR")}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
