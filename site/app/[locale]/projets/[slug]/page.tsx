import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getProjets, pickTranslation } from "@/lib/directus";
import type { AppLocale } from "@/i18n/routing";

/**
 * Aucun projet publié n'existe encore (voir projets/page.tsx) — la page
 * détail est prête à recevoir du contenu dès que l'équipe en fournit.
 */
export async function generateStaticParams() {
  return [];
}

export default async function ProjetDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = (await getLocale()) as AppLocale;
  const projets = await getProjets(locale);
  const projet = projets.find((p) => p.slug === slug);

  if (!projet) notFound();

  const t = pickTranslation(projet.translations, locale);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-semibold text-wagadu-ebony">{t?.titre}</h1>
      <div
        className="prose prose-neutral mt-6 max-w-none prose-headings:font-display prose-a:text-wagadu-terracotta"
        dangerouslySetInnerHTML={{ __html: t?.description_detaillee ?? "" }}
      />
    </div>
  );
}
