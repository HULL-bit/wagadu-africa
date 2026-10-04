import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getRealisations } from "@/lib/directus";

const STATIC_ROUTES = [
  "/",
  "/qui-sommes-nous",
  "/thematiques",
  "/realisations",
  "/outils",
  "/projets",
  "/actualites",
  "/ressources",
  "/media",
  "/transparence",
  "/gouvernance",
  "/presse",
  "/partenaires",
  "/faq",
  "/nous-rejoindre",
  "/don",
  "/contact",
  "/mentions-legales",
  "/confidentialite",
  "/cgu",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wagadu-africa.org";
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const route of STATIC_ROUTES) {
      entries.push({ url: `${siteUrl}/${locale}${route === "/" ? "" : route}` });
    }

    // Le CMS Directus n'est pas forcément joignable au moment du build (dev
    // local, ou premier déploiement avant que le service Render existe) —
    // on dégrade proprement plutôt que de faire échouer `next build`.
    try {
      const realisations = await getRealisations(locale);
      for (const item of realisations) {
        entries.push({ url: `${siteUrl}/${locale}/realisations/${item.slug}` });
      }
    } catch {
      // Ignoré : les slugs dynamiques seront ajoutés au sitemap dès que le
      // CMS est joignable (Phase 2+).
    }
  }

  return entries;
}
