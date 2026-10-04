"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

/**
 * Filet de secours pour toute erreur non gérée dans une page (ex. Directus
 * injoignable au tout premier chargement, avant qu'un cache existe — bug
 * constaté : 500 brut, sans style, sans header/footer). Remplace uniquement
 * le contenu de la page ; `[locale]/layout.tsx` (header/footer) reste
 * affiché autour, comme pour `not-found.tsx`.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden bg-wagadu-ebony px-6 text-center text-wagadu-ivory">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,var(--color-wagadu-terracotta)_0,transparent_45%),radial-gradient(circle_at_80%_60%,var(--color-wagadu-amber)_0,transparent_45%)]"
      />
      <p className="relative font-mono text-sm tracking-widest text-wagadu-amber">!</p>
      <h1 className="relative mt-4 font-display text-4xl font-semibold sm:text-5xl">{t("titre")}</h1>
      <p className="relative mt-4 max-w-md text-wagadu-ivory/80">{t("description")}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="relative mt-8 inline-block rounded-full bg-wagadu-terracotta px-6 py-3 text-sm font-semibold text-white transition hover:bg-wagadu-amber hover:text-wagadu-ebony"
      >
        {t("reessayer")}
      </button>
    </div>
  );
}
