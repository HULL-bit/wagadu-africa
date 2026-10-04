import { getLocale, getTranslations } from "next-intl/server";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("nousRejoindre") };
}

/**
 * Pas d'offre d'emploi/stage réelle à afficher pour l'instant (brief section
 * 3.2) — on ne fabrique pas de fausses offres. En attendant, la page reste
 * utile : elle explique comment nous écrire directement.
 */
export default async function NousRejoindrePage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("nav");

  return (
    <>
      <PageHero
        title={t("nousRejoindre")}
        subtitle={
          locale === "fr"
            ? "Bénévolat, stages, offres d'emploi : l'équipe Wagadu grandit avec ses projets."
            : "Volunteering, internships, job openings: the Wagadu team grows with its projects."
        }
        image="/media/fish4acp/recolte-huitres-plage.jpg"
      />
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-lg leading-relaxed text-wagadu-ebony/70">
            {locale === "fr"
              ? "Aucune offre n'est ouverte pour le moment. Si vous souhaitez proposer votre aide, un stage ou une candidature spontanée, écrivez-nous : nous lisons chaque message."
              : "No positions are open right now. If you'd like to offer your help, an internship or an unsolicited application, write to us: we read every message."}
          </p>
          <a
            href="mailto:contact@wagadu-africa.org"
            className="mt-8 inline-block rounded-full bg-wagadu-terracotta px-8 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-wagadu-amber hover:text-wagadu-ebony"
          >
            contact@wagadu-africa.org
          </a>
        </Reveal>
      </div>
    </>
  );
}
