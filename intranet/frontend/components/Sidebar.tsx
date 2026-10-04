"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { Icon, IconName } from "@/components/Icon";

type Item = { href: string; label: string; perm?: string; icon: IconName };
type Group = { id: string; label: string; anyPerm?: string[]; items: Item[] };

const GROUPS: Group[] = [
  {
    id: "home",
    label: "",
    items: [{ href: "/dashboard", label: "Tableau de bord", icon: "home" }],
  },
  {
    id: "me",
    label: "Mon espace",
    items: [
      { href: "/tasks", label: "Mes tâches", icon: "check" },
      { href: "/agenda", label: "Mon agenda", icon: "calendar" },
      { href: "/availability", label: "Mes disponibilités", icon: "palm" },
      { href: "/requests", label: "Mes demandes", icon: "file-text" },
      { href: "/documents/received", label: "Documents reçus", icon: "inbox" },
    ],
  },
  {
    id: "work",
    label: "Travail",
    items: [
      { href: "/tasks/board", label: "Suivi des tâches", perm: "tasks.assign", icon: "kanban" },
      { href: "/mail", label: "Courrier", perm: "mail.view", icon: "mail" },
      { href: "/documents", label: "Documents", perm: "documents.view", icon: "folder" },
      { href: "/meetings", label: "Réunions", icon: "video" },
      { href: "/messagerie", label: "Messagerie", icon: "chat" },
    ],
  },
  {
    id: "projects",
    label: "Projets",
    anyPerm: ["projects.view"],
    items: [
      { href: "/projects", label: "Projets", perm: "projects.view", icon: "trending-up" },
    ],
  },
  {
    id: "hr",
    label: "Ressources humaines",
    anyPerm: ["hr.view"],
    items: [
      { href: "/hr", label: "Tableau de bord RH", perm: "hr.view", icon: "bar-chart" },
      { href: "/hr/employees", label: "Effectif", perm: "hr.view", icon: "users" },
      { href: "/hr/evaluations", label: "Évaluations", icon: "star" },
    ],
  },
  {
    id: "validate",
    label: "Validation",
    anyPerm: ["requests.validate"],
    items: [{ href: "/requests/validate", label: "Demandes à valider", perm: "requests.validate", icon: "check-square" }],
  },
  {
    id: "internal",
    label: "Vie interne",
    items: [
      { href: "/directory", label: "Annuaire", icon: "contact" },
      { href: "/polls", label: "Sondages", icon: "vote" },
    ],
  },
  {
    id: "steering",
    label: "Pilotage",
    anyPerm: ["reports.export", "tasks.oversee"],
    items: [{ href: "/reports", label: "Rapports", perm: "reports.export", icon: "trending-up" }],
  },
  {
    id: "admin",
    label: "Administration",
    anyPerm: ["accounts.view", "audit.view", "engagement.announce", "platform.manage_validation_flows", "organization.manage"],
    items: [
      { href: "/admin/users", label: "Comptes", perm: "accounts.view", icon: "user" },
      { href: "/admin/departments", label: "Services", perm: "organization.manage", icon: "users" },
      { href: "/admin/roles", label: "Rôles & permissions", perm: "accounts.view", icon: "key" },
      { href: "/admin/permission-overrides", label: "Exceptions", perm: "accounts.manage_permissions", icon: "sliders" },
      { href: "/admin/announcements", label: "Annonces", perm: "engagement.announce", icon: "megaphone" },
      { href: "/admin/audit", label: "Journal d'audit", perm: "audit.view", icon: "archive" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { me, can, logout } = useAuth();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false); // menu mobile

  useEffect(() => {
    try {
      const raw = localStorage.getItem("wh_nav_collapsed");
      if (raw) setCollapsed(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  function toggle(id: string) {
    setCollapsed((c) => {
      const next = { ...c, [id]: !c[id] };
      try { localStorage.setItem("wh_nav_collapsed", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  const allow = (i: Item) => !i.perm || can(i.perm);
  const groups = GROUPS
    .map((g) => ({ ...g, items: g.items.filter(allow) }))
    .filter((g) => g.items.length > 0 && (!g.anyPerm || g.anyPerm.some((p) => can(p))));

  return (
    <>
      {/* barre mobile */}
      <div className="md:hidden flex items-center justify-between bg-wagadu-bark text-wagadu-ivory px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Image src="/brand/logo-mark.png" alt="" width={38} height={38} className="rounded-lg" />
          <span className="font-display text-lg">Wagadu&nbsp;Hub</span>
        </Link>
        <button onClick={() => setOpen((v) => !v)} aria-label="Menu" className="p-1">
          <Icon name={open ? "x" : "menu"} className="w-6 h-6" />
        </button>
      </div>

      <aside className={`${open ? "block" : "hidden"} md:block w-full md:w-72 md:shrink-0 md:min-h-dvh
        bg-wagadu-bark text-wagadu-ivory md:flex md:flex-col wagadu-branches`}>
        <Link href="/dashboard" className="hidden md:flex p-5 items-center gap-3 border-b border-white/10">
          <Image src="/brand/logo-mark.png" alt="Wagadu Africa" width={52} height={52} className="rounded-xl" />
          <span className="font-display text-2xl">Wagadu&nbsp;Hub</span>
        </Link>

        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {groups.map((g) => (
            <div key={g.id}>
              {g.label && (
                <button onClick={() => toggle(g.id)}
                  className="w-full flex items-center justify-between px-2 pt-4 pb-1.5 text-xs
                    font-semibold uppercase tracking-wider text-wagadu-sand/60 hover:text-wagadu-sand">
                  <span>{g.label}</span>
                  <span>{collapsed[g.id] ? "▸" : "▾"}</span>
                </button>
              )}
              {!collapsed[g.id] && g.items.map((i) => {
                const active = pathname === i.href || pathname.startsWith(i.href + "/");
                return (
                  <Link key={i.href} href={i.href} onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors ${
                      active ? "bg-wagadu-gold text-wagadu-ebony font-semibold" : "font-medium hover:bg-white/10"
                    }`}>
                    <Icon name={i.icon} className="w-5 h-5 shrink-0 opacity-90" />
                    <span className="truncate">{i.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <Link href="/account" onClick={() => setOpen(false)}
          className="m-3 mt-0 flex items-center gap-3 rounded-xl p-3 bg-white/5 hover:bg-white/10 transition-colors">
          <Avatar user={me} size={42} />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold truncate">{me?.first_name || me?.email}</p>
            <p className="text-[13px] text-wagadu-sand/70 truncate">
              {me?.is_super_admin ? "Super Administrateur" : me?.role_detail?.name ?? me?.job_title ?? "Collaborateur"}
            </p>
          </div>
        </Link>
        <button onClick={logout}
          className="mx-3 mb-3 btn-ghost text-wagadu-ivory border-white/25 hover:bg-white/10 w-[calc(100%-1.5rem)]">
          Se déconnecter
        </button>
      </aside>
    </>
  );
}
