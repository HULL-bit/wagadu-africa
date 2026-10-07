import { getLocale, getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/blocks/ComingSoon";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  const locale = (await getLocale()) as AppLocale;
  return {
    title: t("gouvernance"),
    description:
      locale === "fr"
        ? "Notre conseil d'administration et notre organisation, bientôt en ligne."
        : "Our board and organizational structure, coming soon.",
  };
}

/**
 * Conseil d'administration, organigramme, statut juridique et numéro
 * d'enregistrement (brief section 3.1) — des faits réels sur l'organisation
 * que seule l'équipe Wagadu peut fournir et valider avant publication.
 */
export default async function GouvernancePage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("nav");

  return (
    <ComingSoon
      title={t("gouvernance")}
      subtitle={
        locale === "fr"
          ? "Notre conseil d'administration et notre organisation, bientôt en ligne."
          : "Our board and organizational structure, coming soon."
      }
      image="/media/fish4acp/equipe-pirogue.jpg"
      message={
        locale === "fr"
          ? "Cette page présentera notre conseil d'administration, notre organigramme, ainsi que notre statut juridique et notre numéro d'enregistrement, dès que l'équipe aura validé ces informations."
          : "This page will present our board of directors, our organizational chart, and our legal status and registration number, once the team has validated this information."
      }
    />
  );
}
