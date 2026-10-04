import { getLocale, getTranslations } from "next-intl/server";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata() {
  const t = await getTranslations("footer");
  return { title: t("mentionsLegales") };
}

/**
 * Texte juridique réel à rédiger avec l'équipe/un conseil juridique — on ne
 * génère jamais de mentions légales de substitution : un texte inventé,
 * publié par erreur, engagerait l'organisation sur des bases fausses.
 */
export default async function MentionsLegalesPage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("footer");

  return (
    <>
      <PageHero title={t("mentionsLegales")} />
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-lg leading-relaxed text-wagadu-ebony/70">
            {locale === "fr"
              ? "Cette page sera complétée avec les mentions légales de Wagadu Africa (statut juridique, numéro d'enregistrement, directeur de publication, hébergeur) dès leur validation par l'équipe."
              : "This page will be completed with Wagadu Africa's legal notice (legal status, registration number, publisher, host) once validated by the team."}
          </p>
        </Reveal>
      </div>
    </>
  );
}
