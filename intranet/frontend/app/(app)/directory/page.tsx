"use client";

import { useState } from "react";
import { useApi } from "@/lib/useApi";
import { Paginated } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { Icon, IconName } from "@/components/Icon";

interface Member {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  avatar: string | null;
  role_name: string | null;
  department_name: string | null;
  job_title: string;
  bio: string;
  secondary_email: string;
  linkedin_url: string;
  twitter_url: string;
  facebook_url: string;
  website_url: string;
  whatsapp: string;
}

interface Dept {
  id: number;
  name: string;
}

const SOCIALS: [keyof Member, IconName, string][] = [
  ["linkedin_url", "linkedin", "LinkedIn"],
  ["twitter_url", "twitter", "X / Twitter"],
  ["facebook_url", "facebook", "Facebook"],
  ["website_url", "globe", "Site web"],
];

export default function DirectoryPage() {
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");

  const params = new URLSearchParams({ limit: "200" });
  if (q) params.set("search", q);
  if (dept) params.set("department", dept);

  const { data, loading, error } = useApi<Paginated<Member>>(`/directory/?${params.toString()}`);
  const depts = useApi<Paginated<Dept>>("/departments/?limit=200");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl text-wagadu-brown">Annuaire</h1>
        <p className="text-sm opacity-70">{data?.count ?? 0} membre(s)</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          placeholder="Rechercher un nom, un poste…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input max-w-xs" value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="">Tous les services</option>
          {depts.data?.results.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {loading && <p className="text-wagadu-brown animate-fade">Chargement…</p>}
      {error && <p className="text-sm text-wagadu-terracotta">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
        {data?.results.map((m) => (
          <article key={m.id} className="card card-hover flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Avatar user={m} size={52} />
              <div className="min-w-0">
                <p className="font-medium text-wagadu-brown truncate">{m.full_name || m.email}</p>
                <p className="text-sm opacity-75 truncate">{m.job_title || m.role_name || "—"}</p>
                {m.department_name && (
                  <p className="text-xs opacity-55 truncate">{m.department_name}</p>
                )}
              </div>
            </div>

            {m.bio && <p className="text-sm opacity-80 line-clamp-3">{m.bio}</p>}

            <div className="mt-auto space-y-1.5 text-sm">
              <a href={`mailto:${m.email}`} className="flex items-center gap-2 text-wagadu-terracotta truncate">
                <Icon name="mail" className="w-4 h-4 shrink-0" /> <span className="truncate">{m.email}</span>
              </a>
              {m.phone && (
                <p className="flex items-center gap-2 opacity-75">
                  <Icon name="phone" className="w-4 h-4 shrink-0" /> {m.phone}
                </p>
              )}
              {m.whatsapp && (
                <a
                  href={`https://wa.me/${m.whatsapp.replace(/[^\d]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-wagadu-terracotta"
                >
                  <Icon name="message-circle" className="w-4 h-4 shrink-0" /> WhatsApp
                </a>
              )}
            </div>

            {SOCIALS.some(([k]) => m[k]) && (
              <div className="flex gap-2">
                {SOCIALS.filter(([k]) => m[k]).map(([k, icon, title]) => (
                  <a
                    key={k}
                    href={m[k] as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={title}
                    aria-label={title}
                    className="w-8 h-8 grid place-items-center rounded-lg border border-wagadu-brown/20
                      text-wagadu-brown hover:bg-wagadu-sand/50 transition-colors"
                  >
                    <Icon name={icon} className="w-4 h-4" />
                  </a>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      {data && data.results.length === 0 && !loading && (
        <p className="text-sm opacity-60">Aucun membre ne correspond à ces critères.</p>
      )}
    </div>
  );
}
