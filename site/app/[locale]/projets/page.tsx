import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { getProjets, pickTranslation } from "@/lib/directus";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  const locale = (await getLocale()) as AppLocale;
  return {
    title: t("projets"),
    description:
      locale === "fr"
        ? "Le portefeuille de nos initiatives en cours et à venir."
        : "The portfolio of our ongoing and upcoming initiatives.",
  };
}

const STATUT_LABEL: Record<string, string> = {
  en_cours: "En cours",
  a_venir: "À venir",
  termine: "Terminé",
};

/**
 * Distincte de `realisations` (impact déjà obtenu) — portefeuille des
 * initiatives en cours/à venir (brief section 3.3). Aucun projet n'existe
 * encore dans le brief au-delà de ce qui vit dans `realisations` : l'état
 * vide ci-dessous est donc réel, pas un bug — à peupler dès que l'équipe
 * fournit le contenu (voir plan, Phase 2 DoD).
 */
export default async function ProjetsPage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("nav");
  const tCommon = await getTranslations("common");
  const projets = await getProjets(locale);

  return (
    <>
      <PageHero
        title={t("projets")}
        subtitle={
          locale === "fr"
            ? "Le portefeuille de nos initiatives en cours et à venir."
            : "The portfolio of our ongoing and upcoming initiatives."
        }
        image="/media/fish4acp/silhouette-cage-coucher-soleil-01.jpg"
        bgTexture="/media/photos/savane-acacia-brume.jpg"
      />

      <div className="relative overflow-hidden bg-wagadu-ebony py-24">
        <div
          aria-hidden
          className="absolute inset-0 bg-repeat opacity-25"
          style={{ backgroundImage: "url(/media/brand/motif-africain-colore.jpg)", backgroundSize: "280px" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-wagadu-ebony/85 via-wagadu-ebony/70 to-wagadu-ebony/90" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {projets.length === 0 ? (
          <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-6 rounded-3xl border border-wagadu-sand bg-white p-12 text-center shadow-sm">
            <div className="grid w-full grid-cols-3 gap-4">
              <div className="relative h-40 overflow-hidden rounded-2xl">
                <Image
                  src="/media/photos/atelier-equipe-ordinateur-02.jpg"
                  alt={locale === "fr" ? "Équipe au travail lors d'un atelier à Kayar" : "Team at work during a workshop in Kayar"}
                  fill
                  sizes="300px"
                  className="object-cover"
                />
              </div>
              <div className="relative h-40 overflow-hidden rounded-2xl">
                <Image
                  src="/media/photos/atelier-communaute-kayar-02.jpg"
                  alt={locale === "fr" ? "Atelier de sensibilisation avec la communauté de Kayar" : "Awareness workshop with the Kayar community"}
                  fill
                  sizes="300px"
                  className="object-cover"
                />
              </div>
              <div className="relative h-40 overflow-hidden rounded-2xl">
                <Image
                  src="/media/photos/atelier-communaute-kayar-03.jpg"
                  alt={locale === "fr" ? "Échanges avec les pêcheurs et pêcheuses de Kayar" : "Discussions with fishers in Kayar"}
                  fill
                  sizes="300px"
                  className="object-cover"
                />
              </div>
            </div>
            <p className="text-base leading-relaxed text-wagadu-ebony/70">
              {locale === "fr"
                ? "Ces photos viennent des ateliers de formation et de sensibilisation menés à Kayar dans le cadre de Blue-Track — un travail de terrain continu avec les communautés, pas un nouveau projet distinct. C'est pour ça qu'elles n'apparaissent pas comme une fiche ci-dessous : cette page est réservée aux initiatives à venir, qui n'existent pas encore au-delà de ce qui vit déjà dans « Nos réalisations »."
                : "These photos come from the training and awareness workshops run in Kayar as part of Blue-Track — ongoing fieldwork with communities, not a separate new project. That's why they don't appear as a card below: this page is reserved for upcoming initiatives, and none exist yet beyond what already lives in \"Our achievements\"."}
            </p>
            <p className="text-lg text-wagadu-ebony/70">{tCommon("aucunResultat")}</p>
          </Reveal>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {projets.map((projet, index) => {
              const t2 = pickTranslation(projet.translations, locale);
              return (
                <Reveal key={projet.id} delay={index * 0.06}>
                  <div className="flex h-full flex-col rounded-3xl border border-wagadu-sand bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                    <span className="mb-3 w-fit rounded-full bg-wagadu-sand px-3 py-1 text-xs font-semibold text-wagadu-brown">
                      {STATUT_LABEL[projet.statut]}
                    </span>
                    <h3 className="font-display text-lg font-semibold text-wagadu-ebony">{t2?.titre}</h3>
                    <p className="mt-2 text-base leading-relaxed text-wagadu-ebony/70">
                      {t2?.description_courte}
                    </p>
                    {projet.zone_geographique ? (
                      <p className="mt-4 font-mono text-xs text-wagadu-ebony/50">
                        📍 {projet.zone_geographique}
                      </p>
                    ) : null}
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </>
  );
}
