import { getLocale, getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/blocks/ComingSoon";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  const locale = (await getLocale()) as AppLocale;
  return {
    title: t("presse"),
    description:
      locale === "fr"
        ? "Les médias qui ont parlé de Wagadu Africa, bientôt réunis ici."
        : "The media outlets that have covered Wagadu Africa, gathered here soon.",
  };
}

export default async function PressePage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("nav");
  const tCommon = await getTranslations("common");

  return (
    <ComingSoon
      title={t("presse")}
      subtitle={
        locale === "fr"
          ? "Les médias qui ont parlé de Wagadu Africa, bientôt réunis ici."
          : "The media outlets that have covered Wagadu Africa, gathered here soon."
      }
      image="/media/fish4acp/recolte-huitres-sourire.jpg"
      message={tCommon("aucunResultat")}
    />
  );
}
