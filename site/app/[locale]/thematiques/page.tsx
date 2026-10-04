import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { getPiliers, pickTranslation } from "@/lib/directus";
import { PILIER_IMAGES } from "@/lib/media-map";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("thematiques") };
}

const ACCENT_TEXT: Record<string, string> = {
  terracotta: "text-wagadu-terracotta",
  amber: "text-wagadu-amber",
  bark: "text-wagadu-bark",
};

const ACCENT_BADGE: Record<string, string> = {
  terracotta: "bg-wagadu-terracotta/10 text-wagadu-terracotta",
  amber: "bg-wagadu-amber/10 text-wagadu-brown",
  bark: "bg-wagadu-bark/10 text-wagadu-bark",
};

/**
 * Sous-thèmes par pôle (brief section 2.3, texte repris tel quel du site
 * WordPress d'origine) — pas encore une collection Directus dédiée (voir
 * plan, Phase 3/4) : en dur ici, comme le reste du contenu éditorial des
 * pages secondaires tant que ce n'est pas raccordé. Environnement n'a pas de
 * texte source équivalent — ses trois entrées restent de simples badges
 * plutôt que d'inventer une description.
 */
type SousTheme = { fr: string; en: string; descriptionFr?: string; descriptionEn?: string };

const SOUS_THEMES: Record<string, SousTheme[]> = {
  technologie: [
    {
      fr: "Data",
      en: "Data",
      descriptionFr:
        "Gestion des données ancrée dans l'éthique et l'accessibilité, organisation et ouverture des données pour une meilleure prise de décision, sécurité et utilité pour les communautés.",
      descriptionEn:
        "Data governance rooted in ethics and accessibility — organizing and opening up data for better decision-making, security and usefulness for communities.",
    },
    {
      fr: "Tech",
      en: "Tech",
      descriptionFr:
        "La technologie comme moteur de transformation sociale, outils numériques adaptés aux réalités locales, innovation inclusive et durable.",
      descriptionEn:
        "Technology as a driver of social transformation — digital tools suited to local realities, inclusive and sustainable innovation.",
    },
    {
      fr: "IA",
      en: "AI",
      descriptionFr:
        "L'intelligence artificielle comme outil de connaissance collective, potentiel exploré pour renforcer les capacités humaines dans le respect de la transparence, de l'éthique et d'une approche centrée sur les contextes africains.",
      descriptionEn:
        "Artificial intelligence as a tool for collective knowledge — its potential explored to strengthen human capacities while respecting transparency, ethics and an approach centered on African contexts.",
    },
  ],
  maat: [
    {
      fr: "Souveraineté alimentaire",
      en: "Food sovereignty",
      descriptionFr:
        "Pratiques agricoles durables, lutte contre les inégalités d'accès aux ressources alimentaires, valeurs de vérité et de justice.",
      descriptionEn:
        "Sustainable farming practices, fighting inequalities in access to food resources, grounded in the values of truth and justice.",
    },
    {
      fr: "Santé publique",
      en: "Public health",
      descriptionFr:
        "Pratiques de santé combinant avancées scientifiques et approches traditionnelles, accès équitable aux soins, technologies médicales innovantes.",
      descriptionEn:
        "Health practices combining scientific advances with traditional approaches, equitable access to care, innovative medical technologies.",
    },
    {
      fr: "Droits humains",
      en: "Human rights",
      descriptionFr: "Engagement pour les droits fondamentaux et la lutte contre les discriminations.",
      descriptionEn: "Commitment to fundamental rights and the fight against discrimination.",
    },
  ],
  environnement: [
    { fr: "Ressources naturelles", en: "Natural resources" },
    { fr: "Biodiversité", en: "Biodiversity" },
    { fr: "Énergies renouvelables", en: "Renewable energy" },
  ],
};

export default async function ThematiquesPage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("nav");
  const tCommon = await getTranslations("common");
  const piliers = await getPiliers(locale);

  return (
    <>
      <PageHero
        title={t("thematiques")}
        subtitle={
          locale === "fr"
            ? "Trois pôles, une même exigence : la donnée et les outils de terrain au service des communautés."
            : "Three areas, one standard: data and field tools in the service of communities."
        }
        image="/media/photos/atelier-equipe-ordinateur-02.jpg"
        bgTexture="/media/photos/terrain-06-large.jpg"
      />

      <div className="mx-auto flex max-w-6xl flex-col gap-24 px-4 py-24 sm:px-6 lg:px-8">
        {piliers.map((pilier, index) => {
          const tr = pickTranslation(pilier.translations, locale);
          const image = PILIER_IMAGES[pilier.slug];
          const sousThemes = SOUS_THEMES[pilier.slug] ?? [];
          const hasDescriptions = sousThemes.some((s) => s.descriptionFr);
          const reversed = index % 2 === 1;

          return (
            <Reveal key={pilier.id}>
              <div
                className={`grid items-center gap-10 lg:grid-cols-2 ${reversed ? "lg:[&>*:first-child]:order-2" : ""}`}
              >
                {image ? (
                  <div className="group relative aspect-[4/3] overflow-hidden rounded-3xl shadow-md">
                    <Image
                      src={image}
                      alt={tr?.nom ?? ""}
                      fill
                      sizes="(min-width: 1024px) 45vw, 90vw"
                      className="img-hover-zoom object-cover"
                    />
                  </div>
                ) : null}

                <div>
                  <span className={`text-sm font-semibold uppercase tracking-wide ${ACCENT_TEXT[pilier.couleur_accent]}`}>
                    {locale === "fr" ? "Pôle" : "Area"}
                  </span>
                  <h2 className="mt-2 font-display text-3xl font-semibold text-wagadu-ebony">{tr?.nom}</h2>
                  <p className="mt-2 text-lg text-wagadu-ebony/70">{tr?.resume}</p>

                  {sousThemes.length > 0 && !hasDescriptions ? (
                    <ul className="mt-5 flex flex-wrap gap-2">
                      {sousThemes.map((theme) => (
                        <li
                          key={theme.fr}
                          className={`rounded-full px-3 py-1 text-sm font-semibold ${ACCENT_BADGE[pilier.couleur_accent]}`}
                        >
                          {locale === "fr" ? theme.fr : theme.en}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {sousThemes.length > 0 && hasDescriptions ? (
                    <dl className="mt-6 space-y-4">
                      {sousThemes.map((theme) => (
                        <div key={theme.fr}>
                          <dt
                            className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${ACCENT_BADGE[pilier.couleur_accent]}`}
                          >
                            {locale === "fr" ? theme.fr : theme.en}
                          </dt>
                          <dd className="mt-2 text-base leading-relaxed text-wagadu-ebony/70">
                            {locale === "fr" ? theme.descriptionFr : theme.descriptionEn}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}

                  {tr?.description_longue ? (
                    <div
                      className="prose prose-neutral mt-5 max-w-none leading-relaxed text-wagadu-ebony/80"
                      dangerouslySetInnerHTML={{ __html: tr.description_longue }}
                    />
                  ) : null}

                  {pilier.slug === "maat" ? (
                    <>
                      <p className="mt-5 text-sm text-wagadu-ebony/60">
                        {locale === "fr"
                          ? "Référence historique : la Charte de Kurukan Fuga, texte ouest-africain fondateur en matière de responsabilité collective et de devoirs de chacun envers la société."
                          : "Historical reference: the Kurukan Fuga Charter, a founding West African text on collective responsibility and the duties owed to society."}
                      </p>
                      <p className="mt-3 text-sm text-wagadu-ebony/60">
                        {locale === "fr"
                          ? "Nous menons également une recherche et une campagne de sensibilisation sur les alternatives à la farine et à l'huile de poisson — un axe de travail à part entière, à enrichir prochainement."
                          : "We are also conducting research and an awareness campaign on alternatives to fish meal and fish oil — a work area in its own right, to be expanded soon."}
                      </p>
                    </>
                  ) : null}

                  {pilier.slug === "technologie" ? (
                    <Link
                      href="/realisations/blue-track"
                      className="mt-6 inline-flex w-fit items-center gap-1 text-sm font-semibold text-wagadu-terracotta hover:underline"
                    >
                      {locale === "fr" ? "Voir Blue-Track, notre outil phare" : "See Blue-Track, our flagship tool"} →
                    </Link>
                  ) : null}

                  {pilier.slug === "environnement" ? (
                    <Link
                      href="/realisations/fish4acp"
                      className="mt-6 inline-flex w-fit items-center gap-1 text-sm font-semibold text-wagadu-terracotta hover:underline"
                    >
                      {tCommon("enSavoirPlus")} — {locale === "fr" ? "le Projet Pêche de Kayar" : "the Kayar Fisheries Project"} →
                    </Link>
                  ) : null}
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </>
  );
}
