import { getLocale, getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/blocks/ComingSoon";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  const locale = (await getLocale()) as AppLocale;
  return {
    title: t("transparence"),
    description:
      locale === "fr"
        ? "La répartition de nos fonds et notre budget annuel, bientôt en ligne."
        : "Our fund allocation and annual budget, coming soon.",
  };
}

/**
 * Répartition des fonds et budget annuel (brief section 3.1) — des chiffres
 * réels que seule l'équipe Wagadu peut fournir. On ne les invente pas : les
 * inventer serait trompeur pour des bailleurs qui liraient cette page.
 */
export default async function TransparencePage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("nav");

  return (
    <ComingSoon
      title={t("transparence")}
      subtitle={
        locale === "fr"
          ? "La répartition de nos fonds et notre budget annuel, bientôt en ligne."
          : "Our fund allocation and annual budget, coming soon."
      }
      image="/media/fish4acp/controle-qualite-huitres.jpg"
      message={
        locale === "fr"
          ? "Cette page présentera la répartition de nos fonds (part consacrée aux programmes vs au fonctionnement) et un budget annuel synthétique, dès que l'équipe aura validé les chiffres à publier."
          : "This page will present our fund allocation (share spent on programs vs. operations) and a summary annual budget, once the team has validated the figures to publish."
      }
    />
  );
}
