import { getLocale, getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/blocks/ComingSoon";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("partenaires") };
}

export default async function PartenairesPage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("nav");
  const tCommon = await getTranslations("common");

  return (
    <ComingSoon
      title={t("partenaires")}
      subtitle={
        locale === "fr"
          ? "Nos partenaires techniques, institutionnels et financiers, bientôt présentés ici."
          : "Our technical, institutional and financial partners, presented here soon."
      }
      image="/media/fish4acp/controle-cages-ostreicoles.jpg"
      message={tCommon("aucunResultat")}
    />
  );
}
