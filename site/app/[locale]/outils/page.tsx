import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  const locale = (await getLocale()) as AppLocale;
  return {
    title: t("outils"),
    description:
      locale === "fr"
        ? "La donnée au service de l'humanité : ce n'est pas un slogan, c'est ce que nous construisons sur le terrain."
        : "Data in service of humanity: not a slogan, but what we build in the field.",
  };
}

const GARANTIES = [
  {
    fr: { titre: "Collecte encadrée", texte: "Chaque donnée collectée sur le terrain répond à un protocole clair, connu des communautés qui la produisent." },
    en: { titre: "Structured collection", texte: "Every piece of data collected in the field follows a clear protocol, known to the communities producing it." },
  },
  {
    fr: { titre: "Restitution aux communautés", texte: "Les communautés restent propriétaires de ce qu'elles documentent — la donnée sert à faire valoir leurs droits, jamais à leur insu." },
    en: { titre: "Returned to communities", texte: "Communities remain owners of what they document — data serves to assert their rights, never behind their backs." },
  },
  {
    fr: { titre: "Éthique et transparence", texte: "Mêmes principes que Maât : vérité, équité, redevabilité — appliqués à la manière dont la donnée est recueillie et utilisée." },
    en: { titre: "Ethics and transparency", texte: "The same principles as Maât: truth, fairness, accountability — applied to how data is gathered and used." },
  },
];

/**
 * Signature de marque du site (brief section 3.0) : rend concret le
 * positionnement « la donnée au service de l'humanité », au-delà de la fiche
 * Blue-Track dans les réalisations.
 */
export default async function OutilsPage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("nav");
  const tCommon = await getTranslations("common");
  const g = (item: (typeof GARANTIES)[number]) => (locale === "fr" ? item.fr : item.en);

  return (
    <>
      <PageHero
        title={t("outils")}
        subtitle={
          locale === "fr"
            ? "La donnée au service de l'humanité : ce n'est pas un slogan, c'est ce que nous construisons sur le terrain."
            : "Data in service of humanity: not a slogan, but what we build in the field."
        }
        image="/media/photos/blue-track-plateforme-full.jpg"
        bgTexture="/media/photos/terrain-01-remise-attestations-large.jpg"
      />

      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-lg leading-relaxed text-wagadu-ebony/80">
            {locale === "fr"
              ? "Wagadu Africa n'est pas une ONG culturelle qui utilise accessoirement la technologie : c'est une organisation qui construit des outils concrets de collecte et de documentation pour que les communautés fassent valoir leurs droits."
              : "Wagadu Africa is not a cultural NGO that happens to use technology: it's an organization that builds concrete data collection and documentation tools so communities can assert their rights."}
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-16 grid items-center gap-10 rounded-3xl border border-wagadu-sand bg-white p-8 shadow-sm lg:grid-cols-2 lg:p-12">
          <div className="shape-leaf relative aspect-[4/3] overflow-hidden">
            <Image
              src="/media/photos/blue-track-plateforme-full.jpg"
              alt="Blue-Track"
              fill
              sizes="(min-width: 1024px) 45vw, 90vw"
              className="object-cover"
            />
          </div>
          <div>
            <span className="text-sm font-semibold uppercase tracking-wide text-wagadu-terracotta">
              {locale === "fr" ? "Notre outil phare" : "Our flagship tool"}
            </span>
            <h2 className="mt-2 font-display text-3xl font-semibold text-wagadu-ebony">Blue-Track</h2>
            <p className="mt-4 text-base leading-relaxed text-wagadu-ebony/80">
              {locale === "fr"
                ? "Une plateforme numérique qui permet aux communautés de terrain — pêcheurs en première ligne — de documenter et de faire valoir leurs droits face aux atteintes environnementales et sociales, notamment liées à l'exploitation pétrolière et gazière au large du Sénégal."
                : "A digital platform that lets communities on the ground — fishers first and foremost — document and assert their rights in the face of environmental and social harm, particularly linked to offshore oil and gas activity in Senegal."}
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href="/realisations/blue-track"
                className="inline-flex items-center gap-1 text-sm font-semibold text-wagadu-terracotta hover:underline"
              >
                {tCommon("enSavoirPlus")} →
              </Link>
              <a
                href="https://www.blue-track.org"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm font-semibold text-wagadu-ebony/60 hover:text-wagadu-terracotta"
              >
                {tCommon("voirLaPlateforme")} ↗
              </a>
            </div>
          </div>
        </Reveal>

        <div className="mt-20">
          <Reveal className="text-center">
            <h2 className="font-display text-2xl font-semibold text-wagadu-ebony">
              {locale === "fr" ? "Nos garanties" : "Our guarantees"}
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {GARANTIES.map((item, index) => {
              const c = g(item);
              return (
                <Reveal key={c.titre} delay={index * 0.08}>
                  <div className="h-full rounded-3xl border border-wagadu-sand bg-white p-7 shadow-sm">
                    <h3 className="font-display text-lg font-semibold text-wagadu-terracotta">{c.titre}</h3>
                    <p className="mt-3 text-base leading-relaxed text-wagadu-ebony/70">{c.texte}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
