import { getLocale, getTranslations } from "next-intl/server";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata() {
  const t = await getTranslations("footer");
  const locale = (await getLocale()) as AppLocale;
  return {
    title: t("cgu"),
    description:
      locale === "fr"
        ? "Les conditions d'utilisation du site wagadu-africa.org, bientôt en ligne."
        : "The terms of use for wagadu-africa.org, coming soon.",
    // Page encore en attente de validation du texte réel — pas à indexer.
    robots: { index: false, follow: true },
  };
}

export default async function CguPage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("footer");

  return (
    <>
      <PageHero title={t("cgu")} />
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-lg leading-relaxed text-wagadu-ebony/70">
            {locale === "fr"
              ? "Cette page présentera les conditions d'utilisation du site wagadu-africa.org, dès la validation du texte par l'équipe."
              : "This page will present the terms of use for wagadu-africa.org, once the text is validated by the team."}
          </p>
        </Reveal>
      </div>
    </>
  );
}
