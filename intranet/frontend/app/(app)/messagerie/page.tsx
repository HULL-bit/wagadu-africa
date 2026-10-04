"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Paginated } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/Icon";

interface Channel {
  id: number;
  kind: "general" | "department" | "direct";
  display_name: string;
  member_count: number;
  last_message: { body: string; author_name: string; created_at: string } | null;
  last_message_at: string;
  unread: number;
}

interface Msg {
  id: number;
  author: string | null;
  author_name: string;
  body: string;
  created_at: string;
}

interface Member {
  id: string;
  full_name: string;
  email: string;
}

function time(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function day(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export default function MessageriePage() {
  const { me } = useAuth();
  const channels = useApi<Paginated<Channel>>("/messaging/channels/");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [newDm, setNewDm] = useState(false);
  const members = useApi<Paginated<Member>>(newDm ? "/directory/?limit=200" : null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const list = [...(channels.data?.results ?? [])].sort(
    (a, b) => +new Date(b.last_message_at) - +new Date(a.last_message_at),
  );
  const active = list.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    if (activeId == null && list.length) setActiveId(list[0].id);
  }, [list, activeId]);

  const loadMessages = useCallback(
    async (markRead = true) => {
      if (activeId == null) return;
      try {
        const rows = await api<Msg[]>(`/messaging/channels/${activeId}/messages/`);
        setMessages(rows);
        if (markRead) {
          await api(`/messaging/channels/${activeId}/read/`, { method: "POST", body: {} });
          channels.reload();
        }
      } catch {
        /* ignore */
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeId],
  );

  useEffect(() => {
    setMessages([]);
    loadMessages();
    const t = setInterval(() => loadMessages(true), 4000);
    return () => clearInterval(t);
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  // rafraîchit la liste des canaux périodiquement
  useEffect(() => {
    const t = setInterval(() => channels.reload(), 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || activeId == null) return;
    setSending(true);
    setDraft("");
    try {
      const msg = await api<Msg>(`/messaging/channels/${activeId}/messages/`, {
        method: "POST",
        body: { body },
      });
      setMessages((m) => [...m, msg]);
      channels.reload();
    } catch {
      setDraft(body);
    } finally {
      setSending(false);
    }
  }

  async function openDm(userId: string) {
    const ch = await api<Channel>("/messaging/channels/direct/", { method: "POST", body: { user: userId } });
    setNewDm(false);
    await channels.reload();
    setActiveId(ch.id);
  }

  const icon = (k: Channel["kind"]) => (k === "direct" ? "user" : k === "department" ? "users" : "chat");

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-wagadu-brown">Messagerie</h1>

      <div className="grid md:grid-cols-[19rem_1fr] gap-4 h-[74vh]">
        {/* Liste des canaux */}
        <div className="card !p-2 overflow-y-auto">
          <button className="btn-ghost w-full mb-2 text-sm" onClick={() => setNewDm((v) => !v)}>
            <Icon name="pencil" className="w-4 h-4" /> {newDm ? "Fermer" : "Nouveau message direct"}
          </button>

          {newDm && (
            <div className="mb-2 max-h-56 overflow-y-auto rounded-xl bg-wagadu-sand/30 p-1">
              {members.data?.results
                .filter((u) => u.id !== me?.id)
                .map((u) => (
                  <button key={u.id} onClick={() => openDm(u.id)}
                    className="block w-full text-left text-sm px-2 py-1.5 rounded-lg hover:bg-white">
                    {u.full_name || u.email}
                  </button>
                ))}
            </div>
          )}

          {list.map((c) => (
            <button key={c.id} onClick={() => setActiveId(c.id)}
              className={`flex items-start gap-2 w-full text-left rounded-xl px-2.5 py-2 transition-colors ${
                c.id === activeId ? "bg-wagadu-gold/25" : "hover:bg-wagadu-sand/40"
              }`}>
              <span className="mt-0.5 text-wagadu-brown"><Icon name={icon(c.kind)} className="w-4 h-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-wagadu-brown truncate text-[15px]">{c.display_name}</span>
                  {c.unread > 0 && (
                    <span className="badge bg-wagadu-terracotta text-white shrink-0">{c.unread}</span>
                  )}
                </span>
                {c.last_message && (
                  <span className="block text-xs opacity-70 truncate">
                    {c.last_message.author_name} : {c.last_message.body}
                  </span>
                )}
              </span>
            </button>
          ))}
          {channels.loading && list.length === 0 && <p className="text-sm opacity-60 p-2">Chargement…</p>}
        </div>

        {/* Fil de discussion */}
        <div className="card !p-0 flex flex-col overflow-hidden">
          {!active ? (
            <p className="text-sm opacity-60 p-6">Sélectionnez une conversation.</p>
          ) : (
            <>
              <div className="border-b border-wagadu-sand px-4 py-3">
                <p className="font-display text-lg text-wagadu-brown">{active.display_name}</p>
                <p className="text-xs opacity-60">
                  {active.kind === "direct" ? "Message direct" : `${active.member_count} membre(s)`}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 wagadu-pattern">
                {messages.map((m, i) => {
                  const mine = m.author === me?.id;
                  const showDay = i === 0 || day(m.created_at) !== day(messages[i - 1].created_at);
                  return (
                    <div key={m.id}>
                      {showDay && (
                        <p className="text-center text-[11px] uppercase tracking-wide opacity-50 my-2 capitalize">
                          {day(m.created_at)}
                        </p>
                      )}
                      <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                          mine ? "bg-wagadu-gold text-wagadu-ebony" : "bg-white border border-wagadu-sand"
                        }`}>
                          {!mine && active.kind !== "direct" && (
                            <p className="text-[11px] font-semibold text-wagadu-brown/80">{m.author_name}</p>
                          )}
                          <p className="text-[15px] whitespace-pre-wrap break-words">{m.body}</p>
                          <p className="text-[10px] opacity-60 text-right mt-0.5">{time(m.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 && (
                  <p className="text-sm opacity-60 text-center py-8">Aucun message. Lancez la conversation !</p>
                )}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={send} className="border-t border-wagadu-sand p-3 flex gap-2">
                <input
                  className="input"
                  placeholder="Votre message…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button className="btn-primary" disabled={sending || !draft.trim()}>Envoyer</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
