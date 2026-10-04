"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";

const ICON_PATHS: Record<string, React.ReactNode> = {
  hr: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  mail: (
    <>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </>
  ),
  tasks: (
    <>
      <rect width="8" height="4" x="8" y="2" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </>
  ),
  docs: (
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  ),
  chat: <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />,
  reports: (
    <>
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </>
  ),
};

function ModuleIcon({ name }: { name: keyof typeof ICON_PATHS }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-6 h-6"
      aria-hidden
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

const MODULES = [
  { icon: "hr", title: "Ressources humaines", text: "Fiches employés, contrats, congés, évaluations, intégration et départ." },
  { icon: "mail", title: "Courrier", text: "Enregistrement, affectation et traçabilité du courrier entrant et sortant." },
  { icon: "tasks", title: "Tâches", text: "Assignation, suivi hebdomadaire, tableau kanban et validation des livrables." },
  { icon: "docs", title: "Documents", text: "Diffusion ciblée, bibliothèque commune, gestion des versions et suivi de lecture." },
  { icon: "chat", title: "Communication", text: "Messagerie d'équipe, visioconférence et agenda partagé." },
  { icon: "reports", title: "Demandes & rapports", text: "Circuits de validation, exports et tableaux de bord de pilotage." },
] as const;

const PHOTOS = ["/brand/photo-scales.jpg", "/brand/photo-child.png", "/brand/photo-2.jpg", "/brand/photo-5.jpg"];

export default function LandingPage() {
  const { me } = useAuth();
  const cta = me
    ? { href: "/dashboard", label: "Accéder à la plateforme" }
    : { href: "/login", label: "Se connecter" };

  return (
    <main className="bg-wagadu-ivory text-wagadu-ebony">
      {/* ── Hero plein écran ──────────────────────────────────────── */}
      <section className="relative min-h-dvh flex flex-col overflow-hidden text-wagadu-ivory">
        <Image src="/brand/bg-hero.jpg" alt="" fill priority className="object-cover" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(115deg, rgba(30,15,4,0.94) 0%, rgba(74,42,18,0.86) 40%, rgba(110,60,19,0.55) 78%, rgba(210,129,46,0.35) 100%)",
          }}
          aria-hidden
        />

        {/* En-tête transparent */}
        <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5">
          <div className="flex items-center gap-3">
            <Image src="/brand/logo-mark.png" alt="Wagadu Africa" width={52} height={52} className="rounded-xl" />
            <span className="font-display text-2xl">Wagadu&nbsp;Hub</span>
          </div>
          <Link
            href={cta.href}
            className="rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold hover:bg-white/10 transition-colors"
          >
            Accéder à la plateforme
          </Link>
        </header>

        {/* Contenu du hero */}
        <div className="relative z-10 flex-1 flex items-center">
          <div className="w-full max-w-6xl mx-auto px-6 md:px-12 py-16 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-wagadu-gold">
                Wagadu&nbsp;Africa
              </p>
              <h1 className="font-display text-4xl sm:text-6xl md:text-7xl leading-[1.03] mt-4">
                La plateforme interne de Wagadu&nbsp;Africa
              </h1>
              <p className="mt-6 text-lg md:text-2xl font-light text-wagadu-sand/90 max-w-xl">
                Un seul espace, sécurisé et accessible en mobilité, pour piloter le fonctionnement
                administratif et organisationnel de l&apos;ONG — du siège comme sur le terrain.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href={cta.href} className="btn-primary text-base px-6 py-3">
                  {cta.label}
                </Link>
                <a
                  href="#modules"
                  className="btn-ghost text-base px-6 py-3 text-wagadu-ivory border-white/40 hover:bg-white/10"
                >
                  Découvrir les modules
                </a>
              </div>
            </div>

            {/* Mosaïque photo */}
            <div className="hidden lg:grid grid-cols-2 gap-4">
              {PHOTOS.map((src, i) => (
                <div
                  key={src}
                  className={`relative aspect-[4/5] rounded-2xl overflow-hidden border border-white/15 shadow-xl ${i % 2 ? "mt-8" : ""}`}
                >
                  <Image src={src} alt="" fill sizes="25vw" className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Indicateur de défilement */}
        <div className="relative z-10 pb-8 flex justify-center">
          <a href="#modules" className="text-wagadu-ivory/60 hover:text-wagadu-gold transition-colors" aria-label="Défiler">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </a>
        </div>
      </section>

      {/* ── Modules ───────────────────────────────────────────────── */}
      <section id="modules" className="px-6 md:px-12 py-20 max-w-6xl mx-auto scroll-mt-8">
        <h2 className="font-display text-3xl md:text-4xl text-wagadu-brown">Ce que couvre Wagadu&nbsp;Hub</h2>
        <p className="mt-3 text-wagadu-brown/70 max-w-2xl">
          Les outils dispersés remplacés par un environnement unique, cohérent et traçable.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
          {MODULES.map(({ icon, title, text }) => (
            <div key={title} className="card card-hover">
              <span className="inline-flex w-11 h-11 items-center justify-center rounded-xl bg-wagadu-sand/60 text-wagadu-brown">
                <ModuleIcon name={icon} />
              </span>
              <h3 className="font-display text-lg text-wagadu-brown mt-4">{title}</h3>
              <p className="text-sm text-wagadu-ebony/70 mt-1.5 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Aperçu visuel (mobile / tablette) ─────────────────────── */}
      <section className="lg:hidden px-6 md:px-12 pb-4 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 gap-3">
          {PHOTOS.map((src) => (
            <div key={src} className="relative aspect-[4/3] rounded-2xl overflow-hidden">
              <Image src={src} alt="" fill sizes="50vw" className="object-cover" />
            </div>
          ))}
        </div>
      </section>

      {/* ── Bande mission ─────────────────────────────────────────── */}
      <section className="relative text-wagadu-ivory mt-12 lg:mt-16">
        <Image src="/brand/bg-africa.jpg" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-wagadu-ebony/85" aria-hidden />
        <div className="relative px-6 md:px-12 py-20 max-w-3xl mx-auto text-center">
          <span className="font-display text-lg text-wagadu-gold">Wagadu&nbsp;Africa</span>
          <p className="font-display text-2xl md:text-3xl leading-snug mt-4">
            « Réduire la dépendance aux outils dispersés et donner à chacun un accès unique,
            sécurisé et clair au fonctionnement de l&apos;organisation. »
          </p>
        </div>
      </section>

      <footer className="px-6 md:px-12 py-10 text-center text-sm text-wagadu-ebony/55">
        Wagadu Africa — plateforme interne · réservée aux membres et collaborateurs de l&apos;ONG
      </footer>
    </main>
  );
}
