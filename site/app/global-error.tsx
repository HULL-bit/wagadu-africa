"use client";

import "./globals.css";

/**
 * Ultime filet de secours (erreur dans `[locale]/layout.tsx` lui-même,
 * avant même que `[locale]/error.tsx` puisse s'appliquer) — même principe
 * que `app/not-found.tsx` : définit son propre `<html>`/`<body>` et importe
 * `globals.css` pour ne jamais retomber sur une page sans aucun style.
 */
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-wagadu-ebony px-6 text-center text-wagadu-ivory">
        <p className="font-mono text-sm tracking-widest text-wagadu-amber">!</p>
        <h1 className="font-display text-2xl font-semibold">Une erreur est survenue / Something went wrong</h1>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-wagadu-terracotta px-6 py-3 text-sm font-semibold text-white"
        >
          Réessayer / Try again
        </button>
      </body>
    </html>
  );
}
