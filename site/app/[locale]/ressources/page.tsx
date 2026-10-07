import { getLocale, getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/blocks/ComingSoon";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  const locale = (await getLocale()) as AppLocale;
  return {
    title: t("ressources"),
    description:
      locale === "fr"
        ? "Nos rapports et études, bientôt disponibles au téléchargement."
        : "Our reports and studies, available for download soon.",
  };
}

export default async function RessourcesPage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("nav");
  const tCommon = await getTranslations("common");

  return (
    <ComingSoon
      title={t("ressources")}
      subtitle={
        locale === "fr"
          ? "Nos rapports et études, bientôt disponibles au téléchargement."
          : "Our reports and studies, available for download soon."
      }
      image="/media/fish4acp/pesee-conditionnement.jpg"
      message={tCommon("aucunResultat")}
    />
  );
}
