import Link from "next/link";
import "./globals.css";

/**
 * Filet de secours hors du segment [locale] (URL malformée, aucune locale
 * détectée) — le cas normal (URL avec /fr ou /en mais aucune page ne
 * correspond) passe maintenant par `[locale]/[...rest]/page.tsx`, qui
 * affiche le vrai 404 à la charte. Celui-ci n'est plus qu'un filet de
 * secours ultime ; il importe quand même `globals.css` pour ne jamais
 * retomber sur une page sans aucun style (bug constaté : fond blanc, police
 * par défaut du navigateur).
 */
export default function RootNotFound() {
  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#1e0f04] text-[#fbf6ec]">
        <p className="font-mono text-sm tracking-widest text-[#ffa900]">404</p>
        <h1 className="text-2xl font-semibold">Page introuvable / Page not found</h1>
        <Link href="/fr" className="rounded-full bg-[#d2812e] px-6 py-3 text-sm font-semibold text-white">
          wagadu-africa.org
        </Link>
      </body>
    </html>
  );
}
