"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { Link, usePathname } from "@/i18n/navigation";
import { LocaleSwitch } from "./LocaleSwitch";

/**
 * 6 entrées max (retour NGO : « menu du haut trop chargé ») — Outils et
 * Projets restent accessibles (liens depuis Thématiques/pied de page), mais
 * sortent du menu principal ; Intranet reste hors de cette liste, en lien
 * discret à droite (déjà le cas, voir plus bas + Footer.tsx).
 */
const PRIMARY_NAV = [
  { href: "/qui-sommes-nous", key: "quiSommesNous" },
  { href: "/thematiques", key: "thematiques" },
  { href: "/realisations", key: "realisations" },
  { href: "/equipe", key: "equipe" },
  { href: "/actualites", key: "actualites" },
  { href: "/contact", key: "contact" },
] as const;

export function Header() {
  const t = useTranslations("nav");
  const tFooter = useTranslations("footer");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 bg-wagadu-ivory/95 backdrop-blur transition-shadow ${
        scrolled ? "shadow-[0_1px_0_0_rgba(74,42,18,0.12),0_8px_24px_-16px_rgba(30,15,4,0.35)]" : ""
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex shrink-0 items-center gap-3">
          <motion.div
            whileHover={{ rotate: -12, scale: 1.08 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            <Image
              src="/media/brand/logo-couleur.png"
              alt="Wagadu Africa"
              width={72}
              height={72}
              className="h-[4.5rem] w-[4.5rem] object-contain"
              priority
            />
          </motion.div>
          <span className="font-display text-xl font-semibold tracking-tight text-wagadu-ebony">
            Wagadu Africa
          </span>
        </Link>

        <nav
          className="hidden flex-1 flex-nowrap items-center gap-1 overflow-x-auto rounded-full border border-wagadu-sand/70 bg-white/60 p-1.5 shadow-sm [-ms-overflow-style:none] [scrollbar-width:none] xl:flex xl:max-w-[68rem] [&::-webkit-scrollbar]:hidden"
          aria-label={t("menu")}
        >
          {PRIMARY_NAV.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`relative whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                  isActive ? "text-white" : "text-wagadu-ebony/75 hover:bg-wagadu-sand/60 hover:text-wagadu-ebony"
                }`}
              >
                {isActive ? (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="absolute inset-0 rounded-full bg-wagadu-terracotta shadow-sm"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                ) : null}
                <span className="relative z-10">{t(item.key)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden shrink-0 items-center gap-5 xl:flex">
          <LocaleSwitch />
          <a
            href={process.env.NEXT_PUBLIC_HUB_URL ?? "https://intranet.wagadu-africa.org"}
            className="whitespace-nowrap rounded-full border border-wagadu-terracotta/40 px-5 py-2.5 text-sm font-semibold text-wagadu-terracotta transition-colors hover:bg-wagadu-terracotta hover:text-white"
          >
            {tFooter("espaceEquipe")}
          </a>
          <motion.div
            whileHover={{ y: -3, scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 350, damping: 18 }}
          >
            <Link
              href="/don"
              className="block whitespace-nowrap rounded-full bg-wagadu-terracotta px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-wagadu-brown hover:shadow-md"
            >
              {t("don")}
            </Link>
          </motion.div>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md p-2 text-wagadu-ebony xl:hidden"
          aria-expanded={open}
          aria-label={open ? t("fermer") : t("menu")}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? t("fermer") : t("menu")}</span>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden border-t border-wagadu-sand/60 bg-wagadu-ivory xl:hidden"
            aria-label={t("menu")}
          >
            <ul className="flex flex-col gap-1 px-4 py-4">
              {PRIMARY_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-base font-medium text-wagadu-ebony/80 hover:bg-wagadu-sand/40 hover:text-wagadu-terracotta"
                  >
                    {t(item.key)}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/don"
                  onClick={() => setOpen(false)}
                  className="mt-2 inline-block rounded-full bg-wagadu-terracotta px-5 py-2.5 text-sm font-semibold text-white"
                >
                  {t("don")}
                </Link>
              </li>
              <li>
                <a
                  href={process.env.NEXT_PUBLIC_HUB_URL ?? "https://intranet.wagadu-africa.org"}
                  className="mt-2 inline-block rounded-full border border-wagadu-terracotta/40 px-5 py-2.5 text-sm font-semibold text-wagadu-terracotta"
                >
                  {tFooter("espaceEquipe")}
                </a>
              </li>
            </ul>
            <div className="border-t border-wagadu-sand/60 px-4 py-4">
              <LocaleSwitch />
            </div>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
