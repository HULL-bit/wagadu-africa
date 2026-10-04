import { getLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { getRealisations, pickTranslation } from "@/lib/directus";
import { REALISATION_IMAGES, REALISATION_IMAGES_SECONDARY, FALLBACK_CARD_IMAGE } from "@/lib/media-map";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("realisations") };
}

export default async function RealisationsPage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("nav");
  const tCommon = await getTranslations("common");
  const realisations = await getRealisations(locale);

  return (
    <>
      <PageHero
        title={t("realisations")}
        subtitle={
          locale === "fr"
            ? "Les preuves concrètes de notre action, portées par les communautés elles-mêmes."
            : "The concrete proof of our work, carried by the communities themselves."
        }
        image="/media/fish4acp/silhouette-cage-coucher-soleil-02.jpg"
        imageShape="leaf-mirror"
        bgTexture="/media/brand/motif-bogolan-footer.jpg"
        bgTextureRepeat
      />

      <div className="relative overflow-hidden bg-wagadu-ebony py-24">
        <div
          aria-hidden
          className="absolute inset-0 bg-repeat opacity-25"
          style={{ backgroundImage: "url(/media/brand/motif-africain-colore.jpg)", backgroundSize: "280px" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-wagadu-ebony/85 via-wagadu-ebony/70 to-wagadu-ebony/90" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {realisations.length === 0 ? (
          <p className="text-center text-wagadu-ivory/70">{tCommon("aucunResultat")}</p>
        ) : (
          <div className="grid gap-10 sm:grid-cols-2">
            {realisations.map((item, index) => {
              const translation = pickTranslation(item.translations, locale);
              const image = REALISATION_IMAGES[item.slug] ?? FALLBACK_CARD_IMAGE;
              const secondaryImage = REALISATION_IMAGES_SECONDARY[item.slug];
              return (
                <Reveal key={item.id} delay={index * 0.08}>
                  <Link
                    href={`/realisations/${item.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-3xl border border-wagadu-sand bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="relative h-72 overflow-hidden">
                      <Image
                        src={image}
                        alt=""
                        fill
                        sizes="(min-width: 640px) 50vw, 100vw"
                        className="object-cover transition duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-wagadu-ebony/85 via-wagadu-ebony/10 to-transparent" />
                      {item.mise_en_avant ? (
                        <span className="absolute left-4 top-4 rounded-full bg-wagadu-amber px-3 py-1 text-xs font-bold text-wagadu-ebony">
                          ★ {locale === "fr" ? "À la une" : "Featured"}
                        </span>
                      ) : null}
                      {secondaryImage ? (
                        <div className="absolute right-4 top-4 h-20 w-20 overflow-hidden rounded-xl shadow-lg ring-2 ring-white/80">
                          <Image src={secondaryImage} alt="" fill sizes="80px" className="object-cover" />
                        </div>
                      ) : null}
                      <div className="absolute inset-x-0 bottom-0 p-6">
                        <div className="flex flex-wrap gap-2">
                          {item.piliers.map((p) => (
                            <span
                              key={p.piliers_id.id}
                              className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm"
                            >
                              {pickTranslation(p.piliers_id.translations, locale)?.nom}
                            </span>
                          ))}
                        </div>
                        <h2 className="mt-3 font-display text-2xl font-semibold text-white">
                          {translation?.titre}
                        </h2>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col p-7">
                      <p className="text-base leading-relaxed text-wagadu-ebony/70">
                        {translation?.resume}
                      </p>
                      <span className="mt-5 text-sm font-semibold text-wagadu-terracotta group-hover:underline">
                        {tCommon("enSavoirPlus")} →
                      </span>
                    </div>
                  </Link>
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
