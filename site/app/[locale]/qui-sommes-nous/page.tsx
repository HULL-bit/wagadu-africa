import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { BranchAccent } from "@/components/ui/BranchAccent";
import { HeroCarousel, type HeroSlide } from "@/components/ui/HeroCarousel";
import { Reveal } from "@/components/ui/Reveal";
import { TiltCard } from "@/components/ui/TiltCard";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { getPageStatique, getValeurs, pickTranslation } from "@/lib/directus";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("nav");
  const page = await getPageStatique("qui-sommes-nous", locale);
  const translation = page ? pickTranslation(page.translations, locale) : undefined;
  return {
    title: translation?.titre ?? t("quiSommesNous"),
    description: translation?.sous_titre,
  };
}

export default async function QuiSommesNousPage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("nav");
  const tCommon = await getTranslations("common");

  const [page, valeurs] = await Promise.all([
    getPageStatique("qui-sommes-nous", locale),
    getValeurs("qui_sommes_nous", locale),
  ]);

  const translation = page ? pickTranslation(page.translations, locale) : undefined;

  const heroSlides: HeroSlide[] = [
    {
      id: "qui-sommes-nous",
      kind: "image",
      src: "/media/fish4acp/equipe-groupe-plage.jpg",
      eyebrow: locale === "fr" ? "QUI SOMMES-NOUS" : "ABOUT US",
      title: translation?.titre ?? t("quiSommesNous"),
      subtitle: translation?.sous_titre,
    },
    {
      id: "notre-equipe",
      kind: "image",
      src: "/media/fish4acp/equipe-pirogue-salut.jpg",
      eyebrow: locale === "fr" ? "NOTRE ÉQUIPE" : "OUR TEAM",
      title:
        locale === "fr"
          ? "Une équipe présente sur le terrain, aux côtés des communautés"
          : "A team present in the field, alongside communities",
      ctaLabel: t("realisations"),
      ctaHref: "/realisations",
    },
    {
      id: "communautes-partenaires",
      kind: "image",
      src: "/media/fish4acp/cooperative-yokhoss.jpg",
      eyebrow: locale === "fr" ? "NOS COMMUNAUTÉS PARTENAIRES" : "OUR PARTNER COMMUNITIES",
      title:
        locale === "fr"
          ? "La coopérative de Yokhoss, un exemple de coopération"
          : "The Yokhoss cooperative, an example of cooperation",
    },
    {
      id: "sur-le-terrain",
      kind: "image",
      src: "/media/fish4acp/recolte-huitres-plage.jpg",
      eyebrow: locale === "fr" ? "SUR LE TERRAIN" : "IN THE FIELD",
      title:
        locale === "fr"
          ? "Au plus près des réalités locales, au Sénégal et ailleurs"
          : "Close to local realities, in Senegal and beyond",
    },
    {
      id: "sensibilisation-terrain",
      kind: "image",
      src: "/media/photos/terrain-06-large.jpg",
      eyebrow: locale === "fr" ? "SENSIBILISATION" : "AWARENESS",
      title:
        locale === "fr"
          ? "Préparer la pêche artisanale face aux impacts du pétrole et du gaz"
          : "Preparing small-scale fisheries for oil and gas impacts",
    },
    {
      id: "notre-impact",
      kind: "image",
      src: "/media/fish4acp/coucher-soleil-ostreiculture.jpg",
      eyebrow: locale === "fr" ? "NOTRE IMPACT" : "OUR IMPACT",
      title:
        locale === "fr"
          ? "Des actions concrètes, mesurées, portées par les communautés"
          : "Concrete, measured actions, carried by communities",
      ctaLabel: tCommon("enSavoirPlus"),
      ctaHref: "/realisations",
    },
    {
      id: "equipe-2",
      kind: "image",
      src: "/media/fish4acp/equipe-terrain-vehicule.jpg",
      eyebrow: locale === "fr" ? "REJOIGNEZ-NOUS" : "JOIN US",
      title:
        locale === "fr"
          ? "Wagadu Africa, une équipe qui grandit avec ses projets"
          : "Wagadu Africa, a team growing with its projects",
      ctaLabel: t("contact"),
      ctaHref: "/contact",
    },
  ];

  return (
    <>
      <HeroCarousel slides={heroSlides} />

      {translation?.body ? (
        <div className="relative overflow-hidden py-24">
          <div
            aria-hidden
            className="absolute inset-0 scale-110 bg-cover bg-center blur-[2px]"
            style={{ backgroundImage: "url(/media/fish4acp/parc-ostreicole-coucher-soleil-large.jpg)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-wagadu-ebony/85 via-wagadu-ebony/75 to-wagadu-ebony/90" />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <Reveal>
            <div
              className="prose prose-invert max-w-none text-lg leading-relaxed text-wagadu-ivory/90 prose-headings:font-display prose-a:text-wagadu-amber"
              dangerouslySetInnerHTML={{ __html: translation.body }}
            />
          </Reveal>
          <Reveal delay={0.1} className="grid grid-cols-2 gap-4">
            <div className="shape-leaf relative col-span-2 aspect-video overflow-hidden shadow-xl ring-1 ring-wagadu-ivory/10">
              <Image
                src="/media/vision/cooperative-yokhoss-groupe-produit.jpg"
                alt={locale === "fr" ? "La coopérative de Yokhoss et son produit transformé" : "The Yokhoss cooperative and its processed product"}
                fill
                sizes="50vw"
                className="object-cover"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-2xl shadow-xl ring-1 ring-wagadu-ivory/10">
              <Image
                src="/media/vision/equipe-mangrove-parc-huitres.jpg"
                alt={locale === "fr" ? "L'équipe sur le terrain, dans le parc ostréicole" : "The team in the field, at the oyster farm"}
                fill
                sizes="25vw"
                className="object-cover"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-2xl shadow-xl ring-1 ring-wagadu-ivory/10">
              <Image
                src="/media/vision/portrait-membre-equipe.jpg"
                alt={locale === "fr" ? "Un membre de l'équipe Wagadu" : "A member of the Wagadu team"}
                fill
                sizes="25vw"
                className="object-cover"
              />
            </div>
            {/* Photo source ~300px de large (pas de version mieux définie
                disponible) — object-contain plutôt que cover pour ne jamais
                l'agrandir au-delà de sa résolution native (jamais de flou,
                brief 4), quitte à garder un fond autour. */}
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-wagadu-ivory/10 shadow-xl ring-1 ring-wagadu-ivory/10">
              <Image
                src="/media/vision/atelier-protection-communautes.jpg"
                alt={
                  locale === "fr"
                    ? "Atelier de formation des communautés face aux impacts du pétrole et du gaz"
                    : "Community training workshop on the impacts of oil and gas"
                }
                fill
                sizes="25vw"
                className="object-contain"
              />
            </div>
          </Reveal>
          </div>
        </div>
      ) : null}

      <section className="relative overflow-hidden bg-wagadu-ivory py-24">
        <div
          aria-hidden
          className="absolute inset-0 bg-repeat opacity-[0.07]"
          style={{ backgroundImage: "url(/media/brand/motif-branches.png)", backgroundSize: "480px" }}
        />
        <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <Reveal>
            <BranchAccent className="mx-auto h-10 w-10 text-wagadu-terracotta" />
            <h2 className="mt-2 font-display font-semibold text-wagadu-ebony">
              {locale === "fr" ? "Nos valeurs et nos piliers, sur le terrain" : "Our values and pillars, in the field"}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-wagadu-ebony/70">
              {locale === "fr"
                ? "Ce que nous présentons à chaque communauté, lors de chaque atelier — pas seulement des mots sur un site web."
                : "What we present to every community, at every workshop — not just words on a website."}
            </p>
          </Reveal>

          <div className="mt-14 grid gap-8 sm:grid-cols-2">
            {[
              {
                src: "/media/brand/banniere-wagadu-valeurs.jpg",
                alt: locale === "fr" ? "Bannière Wagadu — Éthique, Vérité, Transparence" : "Wagadu banner — Ethics, Truth, Transparency",
                label: locale === "fr" ? "Éthique · Vérité · Transparence" : "Ethics · Truth · Transparency",
              },
              {
                src: "/media/brand/banniere-wagadu-piliers-tech.jpg",
                alt: locale === "fr" ? "Bannière Wagadu — Maât, Technologie, Environnement" : "Wagadu banner — Maât, Technology, Environment",
                label: locale === "fr" ? "Maât · Technologie · Environnement" : "Maât · Technology · Environment",
              },
            ].map((banner, index) => (
              <Reveal key={banner.src} variant="scale" delay={index * 0.12}>
                <TiltCard className="group overflow-hidden rounded-3xl border border-wagadu-sand bg-white p-3 shadow-md">
                  <div className="relative aspect-[1237/2200] w-full overflow-hidden rounded-2xl">
                    <Image
                      src={banner.src}
                      alt={banner.alt}
                      fill
                      sizes="(min-width: 640px) 45vw, 90vw"
                      className="img-hover-zoom object-cover object-top"
                    />
                  </div>
                  <p className="mt-3 pb-1 text-center font-mono text-sm tracking-wide text-wagadu-brown">
                    {banner.label}
                  </p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div
        className="h-10 w-full bg-repeat sm:h-14"
        style={{ backgroundImage: "url(/media/brand/motif-branches-ambre.png)", backgroundSize: "300px" }}
        aria-hidden
      />
      <WaveDivider fillClassName="fill-wagadu-ebony" />

      <section className="relative overflow-hidden bg-wagadu-ebony py-24">
        <div
          aria-hidden
          className="absolute inset-0 bg-repeat opacity-25"
          style={{ backgroundImage: "url(/media/brand/motif-africain-colore.jpg)", backgroundSize: "280px" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-wagadu-ebony/85 via-wagadu-ebony/70 to-wagadu-ebony/90" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center">
            <BranchAccent className="mx-auto h-10 w-10 text-wagadu-amber" />
            <h2 className="mt-2 font-display font-semibold text-wagadu-ivory">
              {locale === "fr" ? "Nos valeurs" : "Our values"}
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {valeurs.map((valeur, index) => {
              const vt = pickTranslation(valeur.translations, locale);
              return (
                <Reveal key={valeur.id} delay={index * 0.06}>
                  <div className="h-full rounded-3xl border border-wagadu-sand bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                    <h3 className="font-display text-xl font-semibold text-wagadu-terracotta">
                      {vt?.nom}
                    </h3>
                    <p className="mt-3 text-base leading-relaxed text-wagadu-ebony/70">
                      {vt?.description}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-24">
        <div
          aria-hidden
          className="absolute inset-0 scale-110 bg-cover bg-center blur-[2px]"
          style={{ backgroundImage: "url(/media/fish4acp/parc-ostreicole-coucher-soleil-large.jpg)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-wagadu-ebony/80 via-wagadu-ebony/70 to-wagadu-ebony/85" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <BranchAccent className="h-10 w-10 text-wagadu-amber" flip />
              <h2 className="mt-2 font-display font-semibold text-wagadu-ivory">
                {locale === "fr" ? "Wagadu Africa, en images" : "Wagadu Africa, in pictures"}
              </h2>
            </div>
            <Link href="/media" className="text-sm font-semibold text-wagadu-amber hover:text-wagadu-ivory">
              {locale === "fr" ? "Voir toute la médiathèque" : "See the full media library"} →
            </Link>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                src: "/media/photos/atelier-communaute-kayar-04.jpg",
                alt: locale === "fr" ? "Atelier avec la communauté de Kayar" : "Workshop with the Kayar community",
              },
              {
                src: "/media/fish4acp/parc-ostreicole-vue-large.jpg",
                alt: locale === "fr" ? "Le parc ostréicole, vue d'ensemble" : "The oyster farm, wide view",
              },
              {
                src: "/media/fish4acp/pirogue-chenal-mangrove.jpg",
                alt: locale === "fr" ? "Pirogue dans un chenal de mangrove" : "Pirogue in a mangrove channel",
              },
              {
                src: "/media/fish4acp/pirogues-mangrove-seche.jpg",
                alt: locale === "fr" ? "Pirogues, mangrove à marée basse" : "Pirogues, mangrove at low tide",
              },
              {
                src: "/media/fish4acp/entretien-beneficiaire.jpg",
                alt: locale === "fr" ? "Échange avec une bénéficiaire" : "Conversation with a beneficiary",
              },
              {
                src: "/media/fish4acp/recolte-huitres-sourire.jpg",
                alt: locale === "fr" ? "Récolte d'huîtres" : "Oyster harvest",
              },
              {
                src: "/media/fish4acp/unite-transformation.jpg",
                alt: locale === "fr" ? "Unité de transformation" : "Processing unit",
              },
              {
                src: "/media/fish4acp/silhouette-cage-coucher-soleil-02.jpg",
                alt:
                  locale === "fr"
                    ? "Transport d'une cage ostréicole, coucher de soleil"
                    : "Carrying an oyster cage, sunset",
              },
            ].map((photo, index) => (
              <Reveal key={photo.src} delay={index * 0.06}>
                <div className="relative aspect-square overflow-hidden rounded-2xl shadow-sm">
                  <Image src={photo.src} alt={photo.alt} fill sizes="25vw" className="img-hover-zoom object-cover" />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
