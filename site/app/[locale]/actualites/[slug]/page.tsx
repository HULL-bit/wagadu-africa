import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Reveal } from "@/components/ui/Reveal";
import {
  getActualiteBySlug,
  getAllActualiteSlugs,
  pickTranslation,
} from "@/lib/directus";
import type { AppLocale } from "@/i18n/routing";

/** Les photos déjà utilisées en image_une (hero de l'article) ne sont pas
 * répétées ici — galerie complémentaire, pas redondante. */
const GALERIE: Record<string, string[]> = {
  "blue-track-presentation-ministere-peches": [
    "/media/photos/visiteministrepeche.jpeg",
    "/media/photos/ministreoeche.jpeg",
  ],
};

export async function generateStaticParams() {
  const slugs = await getAllActualiteSlugs().catch(() => []);
  return slugs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = (await getLocale()) as AppLocale;
  const item = await getActualiteBySlug(slug, locale);
  const tr = item ? pickTranslation(item.translations, locale) : undefined;
  return { title: tr?.titre ?? slug, description: tr?.chapo };
}

export default async function ActualiteDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = (await getLocale()) as AppLocale;
  const item = await getActualiteBySlug(slug, locale);
  if (!item) notFound();

  const tr = pickTranslation(item.translations, locale);
  const t = await getTranslations("nav");

  return (
    <>
      {item.image_une ? (
        <div className="relative h-[50vh] min-h-[360px] w-full overflow-hidden">
          <Image src={item.image_une} alt={tr?.titre ?? ""} fill sizes="100vw" priority className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-wagadu-ebony via-wagadu-ebony/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-3xl px-4 pb-10 sm:px-6 lg:px-8">
            <p className="font-mono text-sm text-wagadu-amber">
              {new Date(item.date_publication).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <h1 className="mt-2 font-display font-semibold text-wagadu-ivory">{tr?.titre}</h1>
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-lg leading-relaxed text-wagadu-ebony/80">{tr?.chapo}</p>
          <div
            className="prose prose-neutral mt-8 max-w-none text-lg leading-relaxed prose-headings:font-display prose-a:text-wagadu-terracotta"
            dangerouslySetInnerHTML={{ __html: tr?.corps ?? "" }}
          />
        </Reveal>

        {GALERIE[item.slug] ? (
          <Reveal delay={0.1} className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {GALERIE[item.slug].map((src) => (
              <div key={src} className="relative aspect-[4/5] overflow-hidden rounded-2xl">
                <Image src={src} alt="" fill sizes="33vw" className="object-cover" />
              </div>
            ))}
          </Reveal>
        ) : null}

        <Link
          href="/actualites"
          className="mt-12 inline-block text-sm font-semibold text-wagadu-terracotta hover:underline"
        >
          ← {t("actualites")}
        </Link>
      </div>
    </>
  );
}
