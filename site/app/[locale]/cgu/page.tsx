import { getLocale, getTranslations } from "next-intl/server";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata() {
  const t = await getTranslations("footer");
  return { title: t("cgu") };
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
