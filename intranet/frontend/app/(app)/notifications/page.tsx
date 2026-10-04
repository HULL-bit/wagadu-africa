"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Paginated } from "@/lib/types";
import { Icon } from "@/components/Icon";

interface Notif {
  id: number;
  title: string;
  body: string;
  url: string;
  is_read: boolean;
  created_at: string;
}

interface Announce {
  id: number;
  title: string;
  body: string;
  author_name: string;
  pinned: boolean;
  publish_at: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"notifs" | "annonces">("notifs");
  const notifs = useApi<Paginated<Notif>>("/notifications/");
  const annonces = useApi<Paginated<Announce>>("/announcements/");

  const unread = notifs.data?.results.filter((n) => !n.is_read).length ?? 0;

  async function markAll() {
    await api("/notifications/read-all/", { method: "POST", body: {} });
    notifs.reload();
  }

  async function open(n: Notif) {
    if (!n.is_read) {
      try {
        await api(`/notifications/${n.id}/read/`, { method: "POST", body: {} });
      } catch {
        /* ignore */
      }
    }
    if (n.url) router.push(n.url);
    else notifs.reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-display text-2xl text-wagadu-brown">Notifications &amp; annonces</h1>
        {tab === "notifs" && unread > 0 && (
          <button className="btn-ghost" onClick={markAll}>Tout marquer comme lu</button>
        )}
      </div>

      <nav className="flex gap-1 border-b border-wagadu-sand">
        {([["notifs", `Notifications${unread ? ` (${unread})` : ""}`], ["annonces", "Annonces"]] as const).map(
          ([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-2 text-sm rounded-t-lg border-b-2 -mb-px transition-colors ${
                tab === key
                  ? "border-wagadu-gold text-wagadu-brown font-medium bg-white"
                  : "border-transparent text-wagadu-brown/60 hover:text-wagadu-brown"
              }`}
            >
              {label}
            </button>
          ),
        )}
      </nav>

      {tab === "notifs" && (
        <div className="card divide-y divide-wagadu-sand">
          {notifs.loading && <p className="text-sm opacity-60 py-2">Chargement…</p>}
          {notifs.data?.results.length === 0 && (
            <p className="text-sm opacity-60 py-2">Aucune notification.</p>
          )}
          {notifs.data?.results.map((n) => (
            <button
              key={n.id}
              onClick={() => open(n)}
              className="flex w-full items-start gap-3 text-left py-3 hover:bg-wagadu-sand/20 -mx-2 px-2 rounded-lg transition-colors"
            >
              <span
                className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                  n.is_read ? "bg-wagadu-sand" : "bg-wagadu-gold"
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className={`block ${n.is_read ? "opacity-60" : "font-medium text-wagadu-brown"}`}>
                  {n.title}
                </span>
                {n.body && <span className="block text-sm opacity-70">{n.body}</span>}
                <span className="block text-xs opacity-50 font-mono mt-0.5">
                  {new Date(n.created_at).toLocaleString("fr-FR")}
                </span>
              </span>
              {n.url && <Icon name="chevron-left" className="w-4 h-4 rotate-180 opacity-40 mt-1 shrink-0" />}
            </button>
          ))}
        </div>
      )}

      {tab === "annonces" && (
        <div className="space-y-3">
          {annonces.loading && <p className="text-sm opacity-60">Chargement…</p>}
          {annonces.data?.results.length === 0 && (
            <p className="text-sm opacity-60">Aucune annonce.</p>
          )}
          {annonces.data?.results.map((a) => (
            <article key={a.id} className="card">
              <div className="flex items-center gap-2">
                {a.pinned && <Icon name="pin" className="w-4 h-4 text-wagadu-gold shrink-0" />}
                <h2 className="font-display text-lg text-wagadu-brown">{a.title}</h2>
              </div>
              <p className="text-sm opacity-80 whitespace-pre-wrap mt-1.5">{a.body}</p>
              <p className="text-xs opacity-50 font-mono mt-2">
                {a.author_name} · {new Date(a.publish_at).toLocaleDateString("fr-FR")}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
