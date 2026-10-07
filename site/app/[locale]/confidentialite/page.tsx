import { getLocale, getTranslations } from "next-intl/server";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata() {
  const t = await getTranslations("footer");
  const locale = (await getLocale()) as AppLocale;
  return {
    title: t("confidentialite"),
    description:
      locale === "fr"
        ? "Comment Wagadu Africa traite les données personnelles collectées via ce site, bientôt en ligne."
        : "How Wagadu Africa processes personal data collected through this site, coming soon.",
    robots: { index: false, follow: true },
  };
}

/**
 * Politique de confidentialité réelle à rédiger avec l'équipe/un conseil
 * juridique (traitement des données du formulaire de contact et de la
 * newsletter) — même principe que /mentions-legales, on ne l'invente pas.
 */
export default async function ConfidentialitePage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("footer");

  return (
    <>
      <PageHero title={t("confidentialite")} />
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-lg leading-relaxed text-wagadu-ebony/70">
            {locale === "fr"
              ? "Cette page décrira comment Wagadu Africa traite les données personnelles collectées via ce site (formulaire de contact, newsletter), dès la validation du texte par l'équipe."
              : "This page will describe how Wagadu Africa processes the personal data collected through this site (contact form, newsletter), once the text is validated by the team."}
          </p>
        </Reveal>
      </div>
    </>
  );
}
