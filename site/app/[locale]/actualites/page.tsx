import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { HeroCarousel, type HeroSlide } from "@/components/ui/HeroCarousel";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { TiltCard } from "@/components/ui/TiltCard";
import { getActualites, pickTranslation } from "@/lib/directus";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  const locale = (await getLocale()) as AppLocale;
  return {
    title: t("actualites"),
    description:
      locale === "fr"
        ? "Les nouvelles de nos projets, de nos équipes et de nos communautés partenaires."
        : "News from our projects, our teams and our partner communities.",
  };
}

/** Fil d'actualités (brief section 3.3) — première vraie publication : la
 * présentation de Blue-Track au Ministère des Pêches (cms/seed/06-actualites.mjs). */
export default async function ActualitesPage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("nav");
  const tCommon = await getTranslations("common");
  const actualites = await getActualites(locale);

  const slides: HeroSlide[] = actualites
    .filter((item) => item.image_une)
    .map((item) => {
      const tr = pickTranslation(item.translations, locale);
      return {
        id: item.id,
        kind: "image",
        src: item.image_une as string,
        eyebrow: new Date(item.date_publication).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        title: tr?.titre ?? "",
        subtitle: tr?.chapo,
        objectPosition: "center 15%",
        ctaLabel: tCommon("enSavoirPlus"),
        ctaHref: `/actualites/${item.slug}`,
      };
    });

  return (
    <>
      {slides.length > 0 ? (
        <HeroCarousel slides={slides} />
      ) : (
        <PageHero
          title={t("actualites")}
          subtitle={
            locale === "fr"
              ? "Les nouvelles de nos projets, de nos équipes et de nos communautés partenaires."
              : "News from our projects, our teams and our partner communities."
          }
          image="/media/photos/visiteministrepeche.jpeg"
          bgTexture="/media/photos/savane-acacia-nuages.jpg"
        />
      )}

      <div className="relative overflow-hidden bg-wagadu-ebony py-24">
        <div
          aria-hidden
          className="absolute inset-0 bg-repeat opacity-25"
          style={{ backgroundImage: "url(/media/brand/motif-africain-colore.jpg)", backgroundSize: "280px" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-wagadu-ebony/85 via-wagadu-ebony/70 to-wagadu-ebony/90" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {actualites.length === 0 ? (
            <p className="text-center text-wagadu-ivory/70">{tCommon("aucunResultat")}</p>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {actualites.map((item, index) => {
                const tr = pickTranslation(item.translations, locale);
                return (
                  <Reveal key={item.id} delay={index * 0.08}>
                    <TiltCard className="h-full">
                      <Link
                        href={`/actualites/${item.slug}`}
                        className="group flex h-full flex-col overflow-hidden rounded-3xl border border-wagadu-sand bg-white shadow-sm transition hover:shadow-xl"
                      >
                        {item.image_une ? (
                          <div className="relative h-56 overflow-hidden">
                            <Image
                              src={item.image_une}
                              alt={tr?.titre ?? ""}
                              fill
                              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                              className="object-cover transition duration-700 group-hover:scale-110"
                            />
                          </div>
                        ) : null}
                        <div className="flex flex-1 flex-col p-6">
                          <p className="font-mono text-xs text-wagadu-ebony/50">
                            {new Date(item.date_publication).toLocaleDateString(
                              locale === "fr" ? "fr-FR" : "en-US",
                              { day: "numeric", month: "long", year: "numeric" },
                            )}
                          </p>
                          <h2 className="mt-2 font-display text-xl font-semibold text-wagadu-ebony">
                            {tr?.titre}
                          </h2>
                          <p className="mt-3 text-base leading-relaxed text-wagadu-ebony/70">{tr?.chapo}</p>
                          <span className="mt-4 text-sm font-semibold text-wagadu-terracotta group-hover:underline">
                            {tCommon("enSavoirPlus")} →
                          </span>
                        </div>
                      </Link>
                    </TiltCard>
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
