import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import {
  getAllRealisationSlugs,
  getRealisationBySlug,
  pickTranslation,
  type RealisationTranslation,
} from "@/lib/directus";
import { Reveal } from "@/components/ui/Reveal";
import { REALISATION_IMAGES, FALLBACK_CARD_IMAGE } from "@/lib/media-map";
import type { AppLocale } from "@/i18n/routing";

export async function generateStaticParams() {
  const slugs = await getAllRealisationSlugs().catch(() => []);
  return slugs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = (await getLocale()) as AppLocale;
  const item = await getRealisationBySlug(slug, locale);
  const translation = item ? pickTranslation(item.translations, locale) : undefined;
  return { title: translation?.titre ?? slug };
}

const GALLERIES: Record<string, string[]> = {
  "blue-track": [
    "/media/photos/blue-track-plateforme-full.jpg",
    "/media/photos/banniere-energy-transition-fund.jpg",
    "/media/photos/atelier-communaute-kayar-01.jpg",
    "/media/photos/atelier-equipe-ordinateur-01.jpg",
    "/media/photos/atelier-equipe-ordinateur-02.jpg",
    "/media/photos/atelier-communaute-kayar-02.jpg",
    "/media/photos/atelier-communaute-kayar-03.jpg",
    "/media/photos/atelier-communaute-kayar-04.jpg",
    "/media/photos/terrain-02.jpg",
    "/media/photos/terrain-03.jpg",
    "/media/photos/terrain-05.jpg",
    "/media/photos/terrain-06.jpg",
  ],
  fish4acp: [
    "/media/fish4acp/equipe-groupe-plage.jpg",
    "/media/fish4acp/panneau-fish4acp-nemabah.jpg",
    "/media/fish4acp/panneau-fish4acp-route-nemabah.jpg",
    "/media/fish4acp/panneau-fish4acp-rue-nemabah.jpg",
    "/media/fish4acp/pirogue-marquee-fish4acp.jpg",
    "/media/fish4acp/coucher-soleil-ostreiculture.jpg",
    "/media/fish4acp/equipe-silhouette-coucher-soleil.jpg",
    "/media/fish4acp/recolte-huitres-dramatique.jpg",
    "/media/fish4acp/parc-ostreicole-vue-large.jpg",
    "/media/fish4acp/entretien-beneficiaire.jpg",
    "/media/fish4acp/cooperative-yokhoss.jpg",
    "/media/fish4acp/recolte-huitres-plage.jpg",
    "/media/fish4acp/recolte-huitres-sourire.jpg",
    "/media/fish4acp/controle-qualite-huitres.jpg",
    "/media/fish4acp/unite-transformation.jpg",
    "/media/fish4acp/unite-transformation-materiel.jpg",
    "/media/fish4acp/pesee-conditionnement.jpg",
    "/media/fish4acp/equipier-materiel-moteur.jpg",
    "/media/fish4acp/pirogue-chenal-mangrove.jpg",
    "/media/fish4acp/pirogues-mangrove-seche.jpg",
    "/media/fish4acp/equipe-terrain-vehicule.jpg",
    "/media/fish4acp/zone-ostreicole-pirogues.jpg",
    "/media/fish4acp/contexte-local.jpg",
  ],
};

export default async function RealisationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = (await getLocale()) as AppLocale;
  const item = await getRealisationBySlug(slug, locale);

  if (!item) notFound();

  const translation = pickTranslation(item.translations, locale);
  const tCommon = await getTranslations("common");
  const image = REALISATION_IMAGES[item.slug] ?? FALLBACK_CARD_IMAGE;
  const gallery = GALLERIES[item.slug] ?? [];

  if (item.template === "scroll_story") {
    return (
      <ScrollStory
        item={item}
        translation={translation}
        locale={locale}
        ctaLabel={tCommon("voirLaPlateforme")}
        image={image}
        gallery={gallery}
      />
    );
  }

  return (
    <StandardTemplate
      item={item}
      translation={translation}
      locale={locale}
      ctaLabel={tCommon("voirLaPlateforme")}
      image={image}
      gallery={gallery}
    />
  );
}

type ItemProps = {
  item: NonNullable<Awaited<ReturnType<typeof getRealisationBySlug>>>;
  translation: ReturnType<typeof pickTranslation<RealisationTranslation>>;
  ctaLabel: string;
  image: string;
  gallery: string[];
};

/** Les 3 résultats chiffrés du modèle de "fiche projet" (retour NGO) —
 * n'affiche le bloc que si au moins un résultat est renseigné. */
function ResultatsChiffres({ translation }: { translation: ItemProps["translation"] }) {
  const resultats = [translation?.resultat_1, translation?.resultat_2, translation?.resultat_3].filter(
    (r): r is string => Boolean(r),
  );
  if (resultats.length === 0) return null;
  return (
    <div className="mt-12 grid gap-4 sm:grid-cols-3">
      {resultats.map((resultat) => (
        <div key={resultat} className="rounded-2xl border border-wagadu-sand bg-wagadu-ivory/60 p-5 text-center">
          <p className="font-display text-lg font-semibold text-wagadu-terracotta">{resultat}</p>
        </div>
      ))}
    </div>
  );
}

function Temoignage({ translation }: { translation: ItemProps["translation"] }) {
  if (!translation?.temoignage_citation) return null;
  return (
    <blockquote className="mt-12 border-l-4 border-wagadu-amber pl-6 italic text-wagadu-ebony/80">
      <p className="text-lg leading-relaxed">« {translation.temoignage_citation} »</p>
      {translation.temoignage_auteur ? (
        <p className="mt-2 text-sm font-semibold not-italic text-wagadu-ebony/60">
          {translation.temoignage_auteur}
        </p>
      ) : null}
    </blockquote>
  );
}

function RapportTelechargeable({ url, locale }: { url?: string | null; locale: AppLocale }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-8 inline-flex items-center gap-2 rounded-full border border-wagadu-terracotta px-6 py-3 text-sm font-semibold text-wagadu-terracotta transition hover:bg-wagadu-terracotta hover:text-white"
    >
      {locale === "fr" ? "Télécharger le rapport" : "Download the report"} ↓
    </a>
  );
}

function Gallery({ images, titre }: { images: string[]; titre?: string }) {
  if (images.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-3">
      {images.map((src) => (
        <div key={src} className="relative aspect-square overflow-hidden rounded-2xl">
          <Image
            src={src}
            alt={titre ?? ""}
            fill
            sizes="33vw"
            className="object-cover transition duration-500 hover:scale-110"
          />
        </div>
      ))}
    </div>
  );
}

function StandardTemplate({
  item,
  translation,
  locale,
  ctaLabel,
  image,
  gallery,
}: ItemProps & { locale: AppLocale }) {
  return (
    <>
      {/* Panneau cadré plutôt qu'image étirée plein écran — les visuels
          récupérés du WordPress ne font que ~300px de large et deviennent
          flous en fond plein cadre ; ici ils restent nets. */}
      <div className="relative overflow-hidden bg-gradient-to-br from-wagadu-terracotta via-wagadu-brown to-wagadu-ebony text-wagadu-ivory">
        <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 py-20 sm:px-6 lg:flex-row lg:items-center lg:px-8 lg:py-24">
          <div className="lg:w-1/2">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {item.piliers.map((p) => (
                <span
                  key={p.piliers_id.id}
                  className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm"
                >
                  {pickTranslation(p.piliers_id.translations, locale)?.nom}
                </span>
              ))}
            </div>
            <h1 className="font-display font-semibold">{translation?.titre}</h1>
            <p className="mt-5 text-lg text-wagadu-ivory/85 sm:text-xl">{translation?.resume}</p>
          </div>
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10 lg:w-1/2">
            <Image
              src={image}
              alt={translation?.titre ?? ""}
              fill
              sizes="(min-width: 1024px) 45vw, 90vw"
              priority
              className="object-cover"
            />
          </div>
        </div>
        <div
          className="h-5 w-full bg-repeat sm:h-7"
          style={{ backgroundImage: "url(/media/brand/motif-africain-colore.jpg)", backgroundSize: "180px" }}
          aria-hidden
        />
      </div>

      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        {item.localisation_label ? (
          <p className="mb-6 font-mono text-sm text-wagadu-ebony/60">
            📍 {item.localisation_label}
            {item.date_realisation ? ` — ${item.date_realisation}` : ""}
          </p>
        ) : null}
        {item.slug === "fish4acp" ? (
          <div className="mb-8 flex items-center gap-3 rounded-2xl border border-wagadu-sand bg-wagadu-ivory/60 px-5 py-4">
            <Image
              src="/media/partners/fao-logo.svg"
              alt="FAO — Organisation des Nations Unies pour l'alimentation et l'agriculture"
              width={36}
              height={36}
              className="shrink-0"
            />
            <p className="text-sm text-wagadu-ebony/70">
              {locale === "fr"
                ? "FISH4ACP est un programme de l'Organisation des Nations Unies pour l'alimentation et l'agriculture (FAO)."
                : "FISH4ACP is a programme of the Food and Agriculture Organization of the United Nations (FAO)."}
            </p>
          </div>
        ) : null}
        <div
          className="prose prose-neutral max-w-none text-lg leading-relaxed prose-headings:font-display prose-a:text-wagadu-terracotta"
          dangerouslySetInnerHTML={{ __html: translation?.corps ?? "" }}
        />

        <ResultatsChiffres translation={translation} />
        <Temoignage translation={translation} />

        {gallery.length > 0 ? (
          <Reveal className="mt-12">
            <Gallery images={gallery} titre={translation?.titre} />
          </Reveal>
        ) : null}

        <div className="flex flex-wrap gap-4">
          {item.lien_externe ? (
            <a
              href={item.lien_externe}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-block rounded-full bg-wagadu-terracotta px-7 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-wagadu-brown"
            >
              {ctaLabel}
            </a>
          ) : null}
          <RapportTelechargeable url={item.rapport_url} locale={locale} />
        </div>
      </div>
    </>
  );
}

/**
 * Traitement éditorial différencié pour le projet phare (brief section 3.2) —
 * texte court + visuel plein écran qui s'enchaînent au scroll. Décision
 * ouverte F(c) du plan : les vraies captures de la plateforme remplaceront
 * ces visuels dès que l'équipe les fournit.
 */
function ScrollStory({ item, translation, locale, ctaLabel, image, gallery }: ItemProps & { locale: AppLocale }) {
  return (
    <div>
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center text-wagadu-ivory">
        <Image src={image} alt={translation?.titre ?? ""} fill sizes="100vw" priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-wagadu-ebony/70 via-wagadu-ebony/60 to-wagadu-ebony" />
        <p className="relative font-mono text-sm tracking-widest text-wagadu-amber">
          {item.piliers.map((p) => p.piliers_id.slug).join(" · ")}
        </p>
        <h1 className="relative mt-4 max-w-3xl font-display font-semibold">{translation?.titre}</h1>
        <p className="relative mt-6 max-w-xl text-lg text-wagadu-ivory/85 sm:text-xl">
          {translation?.resume}
        </p>
      </section>

      <section className="relative flex min-h-[70vh] flex-col items-center justify-center bg-gradient-to-br from-wagadu-bark to-wagadu-ebony px-6 py-28 text-wagadu-ivory">
        <div
          className="prose prose-invert mx-auto max-w-2xl text-lg leading-relaxed prose-headings:font-display prose-a:text-wagadu-amber"
          dangerouslySetInnerHTML={{ __html: translation?.corps ?? "" }}
        />
        <div className="mx-auto w-full max-w-2xl">
          <ResultatsChiffres translation={translation} />
          <Temoignage translation={translation} />
          <RapportTelechargeable url={item.rapport_url} locale={locale} />
        </div>
      </section>

      {gallery.length > 0 ? (
        <section className="bg-wagadu-ivory px-6 py-20">
          <Reveal className="mx-auto max-w-3xl">
            <Gallery images={gallery} titre={translation?.titre} />
          </Reveal>
        </section>
      ) : null}

      {item.lien_externe ? (
        <section className="flex flex-col items-center gap-6 bg-wagadu-ivory px-6 pb-24 pt-4 text-center">
          <p className="max-w-md text-wagadu-ebony/70">
            {item.localisation_label}
            {item.date_realisation ? ` — ${item.date_realisation}` : ""}
          </p>
          <a
            href={item.lien_externe}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-wagadu-terracotta px-8 py-4 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:bg-wagadu-brown"
          >
            {ctaLabel} →
          </a>
        </section>
      ) : null}
    </div>
  );
}
