import { getLocale, getTranslations } from "next-intl/server";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { FounderPhoto } from "@/components/ui/FounderPhoto";
import { getPageStatique, pickTranslation } from "@/lib/directus";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  const locale = (await getLocale()) as AppLocale;
  return {
    title: t("equipe"),
    description:
      locale === "fr"
        ? "Les personnes qui construisent Wagadu Africa, sur le terrain et avec la donnée."
        : "The people building Wagadu Africa, in the field and with data.",
  };
}

/**
 * Seul le fondateur a un profil réel vérifié (page_statique "mot-fondateur").
 * Le reste de l'équipe (photos, titres, expertise, liens LinkedIn) n'a pas
 * encore été fourni par l'ONG — proposition du document de retours NGO
 * (section « Équipe et paragraphe du CEO ») : repère [À COMPLÉTER] plutôt
 * qu'une fiche inventée, voir règle de rédaction établie sur tout le site.
 */
export default async function EquipePage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("nav");
  const motFondateurPage = await getPageStatique("mot-fondateur", locale);
  const motFondateur = motFondateurPage ? pickTranslation(motFondateurPage.translations, locale) : undefined;

  return (
    <>
      <PageHero
        title={t("equipe")}
        subtitle={
          locale === "fr"
            ? "Les personnes qui construisent Wagadu Africa, sur le terrain et avec la donnée."
            : "The people building Wagadu Africa, in the field and with data."
        }
        image="/media/photos/equipe-01.jpeg"
        bgTexture="/media/photos/terrain-06-large.jpg"
      />

      <div className="mx-auto max-w-5xl px-4 py-24 sm:px-6 lg:px-8">
        {motFondateur?.body ? (
          <Reveal className="grid gap-10 rounded-3xl border border-wagadu-sand bg-white p-8 shadow-sm sm:grid-cols-[minmax(0,220px)_1fr] sm:items-center sm:p-12">
            <FounderPhoto src="/media/photos/mot-fondateur.jpg" alt={motFondateur.titre ?? ""} />
            <div>
              <div
                className="prose prose-neutral max-w-none text-lg leading-relaxed prose-p:mb-4"
                dangerouslySetInnerHTML={{ __html: motFondateur.body }}
              />
              <p className="mt-4 font-display text-lg font-semibold text-wagadu-ebony">
                {motFondateur.titre}
              </p>
              {motFondateur.sous_titre ? (
                <p className="text-sm font-semibold uppercase tracking-wide text-wagadu-terracotta">
                  {motFondateur.sous_titre}
                </p>
              ) : null}
            </div>
          </Reveal>
        ) : null}

        <Reveal delay={0.1} className="mt-12 rounded-3xl border border-dashed border-wagadu-sand bg-wagadu-ivory/60 p-8 text-center">
          <p className="text-base leading-relaxed text-wagadu-ebony/70">
            {locale === "fr"
              ? "[À COMPLÉTER : photos, titres, expertise en deux lignes et lien LinkedIn pour chaque membre de l'équipe — à fournir par l'ONG avant publication, pour ne pas présenter de profils approximatifs.]"
              : "[TO BE COMPLETED: photo, title, two-line expertise summary and LinkedIn link for each team member — to be supplied by the NGO before publication, so no profile is approximate or guessed.]"}
          </p>
        </Reveal>
      </div>
    </>
  );
}
