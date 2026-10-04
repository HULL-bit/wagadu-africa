"use client";

import Link from "next/link";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { Icon, IconName } from "@/components/Icon";

interface Dashboard {
  user: { full_name: string; role: string | null; is_super_admin: boolean };
  permissions: string[];
  notifications: { unread: number; latest: { id: number; title: string; url: string; is_read: boolean }[] };
  shortcuts: { label: string; url: string }[];
  widgets: {
    administration?: { users_total: number; users_active: number; users_locked: number };
    audit?: { entries_total: number; critical_recent: number };
    hr?: { headcount: number; pending_leave: number; contracts_expiring: number };
    my_mail?: number;
    my_leave_pending?: number;
    my_tasks_open?: number;
    my_tasks_overdue?: number;
    my_tasks_to_review?: number;
    my_documents_unread?: number;
    next_meetings?: { id: number; title: string; start: string }[];
    announcements?: { id: number; title: string; body: string; pinned: boolean; publish_at: string }[];
    open_polls?: number;
    my_requests_pending?: number;
    my_onboarding?: { id: number; done: number; total: number; percent: number };
    my_evaluation_todo?: number;
    my_projects_active?: number;
  };
}

const TODAY = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

export default function DashboardPage() {
  const { me } = useAuth();
  const { data, loading } = useApi<Dashboard>("/dashboard/");
  const w = data?.widgets ?? {};

  const tiles: { label: string; value: React.ReactNode; sub?: string; href?: string; accent?: boolean; icon: IconName }[] = [];
  if (w.my_tasks_open) tiles.push({ icon: "check", label: "Tâches en cours", value: w.my_tasks_open, sub: w.my_tasks_overdue ? `${w.my_tasks_overdue} en retard` : undefined, href: "/tasks", accent: !!w.my_tasks_overdue });
  if (w.my_tasks_to_review) tiles.push({ icon: "eye", label: "Livrables à valider", value: w.my_tasks_to_review, href: "/tasks/board" });
  if (w.my_documents_unread) tiles.push({ icon: "inbox", label: "Documents non lus", value: w.my_documents_unread, href: "/documents/received" });
  if (w.my_mail) tiles.push({ icon: "mail", label: "Courrier affecté", value: w.my_mail, href: "/mail" });
  if (w.my_requests_pending) tiles.push({ icon: "file-text", label: "Demandes en validation", value: w.my_requests_pending, href: "/requests" });
  if (w.my_leave_pending) tiles.push({ icon: "palm", label: "Congés en attente", value: w.my_leave_pending, href: "/leave" });
  if (w.my_evaluation_todo) tiles.push({ icon: "award", label: "Évaluation à compléter", value: w.my_evaluation_todo, href: "/hr/evaluations", accent: true });
  if (w.my_projects_active) tiles.push({ icon: "trending-up", label: "Projets en cours", value: w.my_projects_active, href: "/projects" });
  if (w.hr) tiles.push({ icon: "users", label: "Effectif", value: w.hr.headcount, sub: `${w.hr.pending_leave} congé(s) · ${w.hr.contracts_expiring} contrat(s) < 60 j`, href: "/hr" });
  if (w.administration) tiles.push({ icon: "user", label: "Comptes actifs", value: <>{w.administration.users_active}<span className="text-base opacity-50"> / {w.administration.users_total}</span></>, sub: w.administration.users_locked ? `${w.administration.users_locked} verrouillé(s)` : undefined, href: "/admin/users" });
  if (w.audit) tiles.push({ icon: "archive", label: "Journal d'audit", value: w.audit.entries_total, sub: w.audit.critical_recent ? `${w.audit.critical_recent} critique(s)` : undefined, href: "/admin/audit", accent: !!w.audit.critical_recent });

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="wagadu-hero-gradient rounded-3xl p-6 md:p-8 text-wagadu-ivory relative overflow-hidden animate-in">
        <div className="relative flex items-center gap-4">
          <div className="ring-2 ring-white/30 rounded-full"><Avatar user={me} size={56} /></div>
          <div>
            <p className="text-xs uppercase tracking-widest text-wagadu-gold/90 capitalize">{TODAY}</p>
            <h1 className="font-display text-2xl md:text-3xl">Bonjour {me?.first_name || me?.email}</h1>
            <p className="text-sm text-wagadu-sand/80">
              {me?.is_super_admin ? "Super Administrateur" : me?.role_detail?.name ?? me?.job_title ?? "Collaborateur"}
            </p>
          </div>
          <div className="ml-auto hidden sm:flex flex-col items-end gap-2">
            <Link href="/notifications" className="inline-flex items-center gap-1.5 text-sm text-wagadu-ivory/90 hover:text-wagadu-gold">
              <Icon name="bell" className="w-4 h-4" /> {data?.notifications.unread ?? 0} non lue(s)
            </Link>
            {(data?.shortcuts ?? []).slice(0, 2).map((s) => (
              <Link key={s.url} href={s.url}
                className="text-sm px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {loading && <p className="text-wagadu-brown animate-fade">Chargement du tableau de bord…</p>}

      {data && (
        <>
          {/* KPI */}
          {tiles.length > 0 && (
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 stagger">
              {tiles.map((t) => {
                const body = (
                  <>
                    <div className="flex items-start justify-between">
                      <span className="inline-flex w-9 h-9 items-center justify-center rounded-lg bg-wagadu-sand/60 text-wagadu-brown">
                        <Icon name={t.icon} className="w-[18px] h-[18px]" />
                      </span>
                      <span className={`stat-value ${t.accent ? "!text-wagadu-terracotta" : ""}`}>{t.value}</span>
                    </div>
                    <p className="label mt-2 mb-0">{t.label}</p>
                    {t.sub && <p className="text-xs text-wagadu-terracotta mt-0.5">{t.sub}</p>}
                  </>
                );
                return t.href
                  ? <Link key={t.label} href={t.href} className="stat-tile">{body}</Link>
                  : <div key={t.label} className="stat-tile">{body}</div>;
              })}
            </section>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Colonne principale */}
            <div className="lg:col-span-2 space-y-6">
              {!!w.announcements?.length && (
                <section className="card wagadu-pattern animate-in">
                  <div className="flex items-center gap-2 mb-2 text-wagadu-brown">
                    <Icon name="megaphone" className="w-5 h-5" />
                    <h2 className="font-display text-lg">Fil d&apos;actualités</h2>
                  </div>
                  <ul className="divide-y divide-wagadu-sand">
                    {w.announcements.map((a) => (
                      <li key={a.id} className="py-3 first:pt-0">
                        <p className="font-medium text-wagadu-brown flex items-center gap-1.5">
                          {a.pinned && <Icon name="star" className="w-3.5 h-3.5 text-wagadu-gold" />}
                          {a.title}
                        </p>
                        <p className="text-sm opacity-80 whitespace-pre-wrap mt-0.5">{a.body}</p>
                        <p className="text-[11px] font-mono opacity-40 mt-1">
                          {new Date(a.publish_at).toLocaleDateString("fr-FR")}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {!!w.next_meetings?.length && (
                <section className="card animate-in">
                  <div className="flex items-center gap-2 mb-2 text-wagadu-brown">
                    <Icon name="video" className="w-5 h-5" />
                    <h2 className="font-display text-lg">Prochaines réunions</h2>
                  </div>
                  <ul className="divide-y divide-wagadu-sand">
                    {w.next_meetings.map((mt) => (
                      <li key={mt.id} className="py-2 flex justify-between items-center gap-2 text-sm">
                        <Link href={`/meetings/${mt.id}`} className="text-wagadu-terracotta font-medium">{mt.title}</Link>
                        <span className="font-mono text-xs opacity-60">{new Date(mt.start).toLocaleString("fr-FR")}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/agenda" className="text-sm text-wagadu-terracotta mt-2 inline-block">Ouvrir l&apos;agenda →</Link>
                </section>
              )}

              {w.my_onboarding && (
                <section className="card animate-in">
                  <div className="flex items-center gap-2 mb-2 text-wagadu-brown">
                    <Icon name="refresh" className="w-5 h-5" />
                    <h2 className="font-display text-lg">Mon intégration</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-3 rounded-full bg-wagadu-sand overflow-hidden">
                      <div className="h-full bg-wagadu-gold transition-all duration-500"
                        style={{ width: `${w.my_onboarding.percent}%` }} />
                    </div>
                    <span className="font-mono text-sm">{w.my_onboarding.done}/{w.my_onboarding.total}</span>
                  </div>
                  <Link href={`/hr/lifecycle/${w.my_onboarding.id}`} className="text-sm text-wagadu-terracotta mt-2 inline-block">
                    Voir la checklist →
                  </Link>
                </section>
              )}
            </div>

            {/* Colonne latérale */}
            <div className="space-y-6">
              {data.shortcuts.length > 0 && (
                <section className="card animate-in">
                  <h2 className="font-display text-lg text-wagadu-brown mb-2">Raccourcis</h2>
                  <div className="flex flex-col gap-2">
                    {data.shortcuts.map((s) => (
                      <Link key={s.url} href={s.url}
                        className="text-sm rounded-xl px-3 py-2 bg-wagadu-sand/40 hover:bg-wagadu-sand transition-colors">
                        {s.label}
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              <section className="card animate-in">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-display text-lg text-wagadu-brown">Notifications</h2>
                  <Link href="/notifications" className="text-xs text-wagadu-terracotta">Tout voir</Link>
                </div>
                {data.notifications.latest.length === 0 ? (
                  <p className="text-sm opacity-60">Rien de nouveau.</p>
                ) : (
                  <ul className="divide-y divide-wagadu-sand">
                    {data.notifications.latest.map((n) => (
                      <li key={n.id} className="py-2 text-sm flex gap-2">
                        <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${n.is_read ? "bg-wagadu-sand" : "bg-wagadu-gold"}`} />
                        {n.url ? (
                          <Link href={n.url} className={n.is_read ? "opacity-60" : ""}>{n.title}</Link>
                        ) : (
                          <span className={n.is_read ? "opacity-60" : ""}>{n.title}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {!!w.open_polls && (
                <section className="card animate-in">
                  <div className="flex items-center gap-2 mb-1 text-wagadu-brown">
                    <Icon name="vote" className="w-5 h-5" />
                    <h2 className="font-display text-lg">Sondages</h2>
                  </div>
                  <p className="text-sm opacity-75">{w.open_polls} sondage(s) ouvert(s).</p>
                  <Link href="/polls" className="text-sm text-wagadu-terracotta mt-1 inline-block">Participer →</Link>
                </section>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
