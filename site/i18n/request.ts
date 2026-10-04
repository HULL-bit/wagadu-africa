import * as rootParams from "next/root-params";
import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "./routing";

/**
 * Lit la locale depuis `next/root-params` (Next.js 16.3+) plutôt que depuis
 * `requestLocale` — cette dernière lit les headers de la requête, ce qui
 * force tout l'arbre de rendu en dynamique. `next/root-params` lit le
 * segment [locale] directement, ce qui rend les pages éligibles au rendu
 * statique sans avoir à appeler `setRequestLocale` (désormais dépréciée)
 * dans chaque page.tsx. Voir https://next-intl.dev/blog/nextjs-root-params
 */
export default getRequestConfig(async () => {
  const paramValue = await rootParams.locale();
  const locale = hasLocale(routing.locales, paramValue) ? paramValue : notFound();

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
