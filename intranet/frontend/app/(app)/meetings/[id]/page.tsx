"use client";

import { use, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { Meeting } from "@/lib/comms";
import { BackLink } from "@/components/BackLink";
import { Icon } from "@/components/Icon";

interface JoinInfo {
  url: string;
  room: string;
  jwt: string | null;
  moderator: boolean;
  lobby: boolean;
  configured: boolean;
}

export default function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { me } = useAuth();
  const { data: m, reload } = useApi<Meeting>(`/meetings/${id}/`);
  const [poll, setPoll] = useState({ question: "", options: "" });
  const [joinInfo, setJoinInfo] = useState<JoinInfo | null>(null);
  const crRef = useRef<HTMLInputElement>(null);
  const [crBusy, setCrBusy] = useState(false);
  const [crErr, setCrErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<"" | "link" | "invite">("");

  async function copy(text: string, which: "link" | "invite") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      window.prompt("Copiez le lien :", text);
    }
  }

  async function uploadMinutes() {
    const file = crRef.current?.files?.[0];
    if (!file) return;
    setCrBusy(true);
    setCrErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api(`/meetings/${id}/minutes-document/`, { method: "POST", body: fd });
      if (crRef.current) crRef.current.value = "";
      reload();
    } catch (e) {
      setCrErr(e instanceof Error ? e.message : "Échec de l'envoi");
    } finally {
      setCrBusy(false);
    }
  }

  if (!m) return <p className="text-sm opacity-60">Chargement…</p>;
  const isOrganizer = m.organizer === me?.id;
  const myParticipation = m.meeting_participants.find((p) => p.email === me?.email);

  async function act(path: string, body: unknown = {}) {
    await api(`/meetings/${id}/${path}/`, { method: "POST", body });
    reload();
  }

  async function join() {
    const info = await api<JoinInfo>(`/meetings/${id}/join/`);
    setJoinInfo(info);
    const target = info.jwt ? `${info.url}?jwt=${info.jwt}` : info.url;
    window.open(target, "_blank", "noopener");
    reload();
  }

  async function createPoll() {
    await api("/meeting-polls/", {
      method: "POST",
      body: {
        meeting: Number(id),
        question: poll.question,
        option_labels: poll.options.split(",").map((s) => s.trim()).filter(Boolean),
      },
    });
    setPoll({ question: "", options: "" });
    reload();
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <BackLink href="/meetings" />
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="font-display text-2xl text-wagadu-brown">{m.title}</h1>
        <span className="badge bg-wagadu-sand">{m.status_display}</span>
      </div>
      <p className="text-sm font-mono opacity-70">
        {new Date(m.start).toLocaleString("fr-FR")} → {new Date(m.end).toLocaleTimeString("fr-FR")}
      </p>
      {m.description && <p className="text-sm">{m.description}</p>}

      <div className="card flex flex-wrap gap-2 items-center">
        {m.status !== "cancelled" && m.status !== "ended" && (
          <button className="btn-primary" onClick={join}>Rejoindre la visioconférence</button>
        )}
        {joinInfo && !joinInfo.configured && (
          <span className="text-xs text-wagadu-terracotta">
            Jitsi non configuré : lien public {joinInfo.url}
          </span>
        )}
        {myParticipation && !isOrganizer && (
          <div className="flex gap-1">
            {["accepted", "tentative", "declined"].map((r) => (
              <button key={r} className={myParticipation.response === r ? "btn-primary" : "btn-ghost"}
                onClick={() => act("respond", { response: r })}>
                {{ accepted: "Présent", tentative: "Peut-être", declined: "Absent" }[r]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Invitation externe */}
      <div className="card space-y-2">
        <p className="label mb-0">Inviter une personne extérieure à l&apos;ONG</p>
        <p className="text-sm opacity-70">
          Ce lien donne accès à la visioconférence sans compte Wagadu&nbsp;Hub.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <code className="font-mono text-xs bg-wagadu-sand/50 px-2 py-1 rounded flex-1 min-w-[14rem] truncate">
            {m.join_url}
          </code>
          <button className="btn-ghost text-sm" onClick={() => copy(m.join_url, "link")}>
            <Icon name="inbox" className="w-4 h-4" /> {copied === "link" ? "Copié !" : "Copier le lien"}
          </button>
          <button className="btn-primary text-sm"
            onClick={() => copy(
              `Réunion : ${m.title}\n`
              + `Date : ${new Date(m.start).toLocaleString("fr-FR")}\n`
              + `Lien de connexion : ${m.join_url}\n`
              + (m.agenda ? `\nOrdre du jour :\n${m.agenda}\n` : "")
              + `\n— Wagadu Africa`,
              "invite",
            )}>
            {copied === "invite" ? "Copié !" : "Copier l'invitation"}
          </button>
        </div>
        {m.access === "invited" && (
          <p className="text-xs text-wagadu-terracotta">
            Accès « sur invitation » : pensez à passer la réunion en accès ouvert
            si l&apos;invité n&apos;est pas dans la liste des participants.
          </p>
        )}
      </div>

      {m.agenda && (
        <div className="card">
          <p className="label">Ordre du jour</p>
          <p className="text-sm whitespace-pre-wrap">{m.agenda}</p>
        </div>
      )}

      <div className="card">
        <p className="label">Participants ({m.meeting_participants.length})</p>
        <ul className="text-sm divide-y divide-wagadu-sand">
          {m.meeting_participants.map((p) => (
            <li key={p.id} className="py-1.5 flex justify-between">
              <span>{p.name || p.email}{p.is_organizer && " (organisateur)"}</span>
              <span className="text-xs opacity-60">{p.response}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Sondages */}
      <div className="card space-y-2">
        <p className="label">Sondages</p>
        {m.polls.map((p) => (
          <div key={p.id} className="border-l-2 border-wagadu-gold pl-2">
            <p className="font-medium text-sm">{p.question} {!p.is_open && "(clos)"}</p>
            {p.options.map((o) => (
              <button key={o.id} disabled={!p.is_open}
                className={`block w-full text-left text-sm rounded px-2 py-1 my-0.5 ${p.my_vote === o.id ? "bg-wagadu-gold/40" : "bg-wagadu-sand/40"}`}
                onClick={() => api(`/meeting-polls/${p.id}/vote/`, { method: "POST", body: { option: o.id } }).then(reload)}>
                {o.label} — {o.vote_count}
              </button>
            ))}
            {isOrganizer && p.is_open && (
              <button className="text-xs text-wagadu-terracotta mt-1"
                onClick={() => api(`/meeting-polls/${p.id}/close/`, { method: "POST", body: {} }).then(reload)}>
                Clore le sondage
              </button>
            )}
          </div>
        ))}
        {isOrganizer && (
          <div className="flex flex-wrap gap-2 items-end border-t border-wagadu-sand pt-2">
            <input className="input w-48" placeholder="Question" value={poll.question}
              onChange={(e) => setPoll({ ...poll, question: e.target.value })} />
            <input className="input w-48" placeholder="Options (virgules)" value={poll.options}
              onChange={(e) => setPoll({ ...poll, options: e.target.value })} />
            <button className="btn-ghost" onClick={createPoll}>Lancer un sondage</button>
          </div>
        )}
      </div>

      {/* Compte-rendu */}
      <div className="card space-y-2">
        <p className="label">Compte-rendu</p>
        {m.minutes && <p className="text-sm whitespace-pre-wrap opacity-80">{m.minutes}</p>}
        {m.minutes_document_detail ? (
          <Link href={`/documents/${m.minutes_document_detail.id}`}
            className="inline-flex items-center gap-2 text-wagadu-terracotta text-sm">
            <Icon name="file-text" className="w-4 h-4" />
            {m.minutes_document_detail.title}
          </Link>
        ) : (
          !m.minutes && <p className="text-sm opacity-60">Aucun compte-rendu déposé.</p>
        )}

        {isOrganizer && m.status !== "cancelled" && (
          <div className="border-t border-wagadu-sand pt-2 space-y-2">
            <p className="text-sm opacity-75">
              Déposez le compte-rendu (document Word ou PDF). La réunion sera clôturée.
            </p>
            <input ref={crRef} type="file" accept=".doc,.docx,.pdf,.odt" className="text-sm block" />
            {crErr && <p className="text-sm text-wagadu-terracotta">{crErr}</p>}
            <div className="flex gap-2">
              <button className="btn-primary" disabled={crBusy} onClick={uploadMinutes}>
                {crBusy ? "Envoi…" : "Déposer le CR & clôturer"}
              </button>
              {m.status !== "ended" && (
                <button className="btn-ghost" onClick={() => act("close")}>Clôturer sans CR</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
