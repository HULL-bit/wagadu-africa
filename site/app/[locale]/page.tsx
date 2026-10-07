import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { BranchAccent } from "@/components/ui/BranchAccent";
import { FounderPhoto } from "@/components/ui/FounderPhoto";
import { HeroCarousel, type HeroSlide } from "@/components/ui/HeroCarousel";
import { Reveal } from "@/components/ui/Reveal";
import { TiltCard } from "@/components/ui/TiltCard";
import { WaveDivider } from "@/components/ui/WaveDivider";
import {
  getPageStatique,
  getPiliers,
  getRealisations,
  getValeurs,
  pickTranslation,
} from "@/lib/directus";
import {
  PILIER_IMAGES,
  PILIER_TAGS,
  REALISATION_IMAGES,
  REALISATION_IMAGES_SECONDARY,
  FALLBACK_CARD_IMAGE,
} from "@/lib/media-map";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata() {
  const locale = (await getLocale()) as AppLocale;
  const page = await getPageStatique("accueil-positionnement", locale);
  const translation = page ? pickTranslation(page.translations, locale) : undefined;
  return { title: translation?.titre ?? "Wagadu Africa" };
}

const ACCENT_CLASSES: Record<string, string> = {
  terracotta: "from-wagadu-terracotta/90 to-wagadu-terracotta/40",
  amber: "from-wagadu-amber/90 to-wagadu-amber/40",
  bark: "from-wagadu-bark/95 to-wagadu-bark/60",
};

export default async function HomePage() {
  const locale = (await getLocale()) as AppLocale;
  const tCommon = await getTranslations("common");
  const tNav = await getTranslations("nav");

  const [page, valeurs, piliers, realisations, motFondateurPage] = await Promise.all([
    getPageStatique("accueil-positionnement", locale),
    getValeurs("accueil", locale),
    getPiliers(locale),
    getRealisations(locale),
    getPageStatique("mot-fondateur", locale),
  ]);

  const hero = page ? pickTranslation(page.translations, locale) : undefined;
  const motFondateur = motFondateurPage ? pickTranslation(motFondateurPage.translations, locale) : undefined;
  const misesEnAvant = realisations.filter((r) => r.mise_en_avant).length
    ? realisations.filter((r) => r.mise_en_avant)
    : realisations.slice(0, 3);

  /**
   * Retour ONG : limiter à 3-4 diapositives (preuve + communauté + identité +
   * appel à l'action), chacune avec un titre court, une phrase, un bouton —
   * plutôt que 8 diapositives diluant le message. Les visuels retirés d'ici
   * (équipe terrain, O'Crystal, silhouette biodiversité) restent visibles
   * ailleurs sur le site (Réalisations, Thématiques), rien n'est supprimé.
   */
  const heroSlides: HeroSlide[] = [
    {
      id: "positionnement",
      kind: "image",
      src: "/media/fish4acp/DSC03795.jpg",
      objectPosition: "40% 48%",
      eyebrow: "WAGADU AFRICA",
      title: hero?.titre ?? "La donnée et      la technologie  au service de l'humanité",
      subtitle:
        hero?.sous_titre ??
        (locale === "fr"
          ? "Des outils concrets de collecte de données, pour que les communautés fassent valoir leurs droits."
          : "Concrete data tools so communities can document their realities and assert their rights."),
      ctaLabel: locale === "fr" ? "Découvrir nos réalisations" : "Discover our work",
      ctaHref: "/realisations",
    },
    {
      id: "fish4acp-cooperative",
      kind: "image",
      src: "/media/fish4acp/cooperative-yokhoss.jpg",
      objectPosition: "55% 22%",
      eyebrow: locale === "fr" ? "FISH4ACP — MAÂT" : "FISH4ACP — MAÂT",
      title:
        locale === "fr"
          ? "La coopérative de Yokhoss transforme et vend ses huîtres"
          : "The Yokhoss cooperative turns oysters into a livelihood",
      subtitle:
        locale === "fr"
          ? "Des femmes ostréicultrices organisées, formées et mieux rémunérées."
          : "Oyster-farming women, organized, trained, and better paid.",
      ctaLabel: locale === "fr" ? "Voir le projet FISH4ACP" : "See the FISH4ACP project",
      ctaHref: "/realisations/fish4acp",
    },
    {
      id: "blue-track-ministere",
      kind: "image",
      src: "/media/photos/ministreoeche.jpeg",
      objectPosition: "center 25%",
      eyebrow: locale === "fr" ? "BLUE-TRACK — ACTUALITÉ" : "BLUE-TRACK — NEWS",
      title:
        locale === "fr"
          ? "Blue-Track présenté au Ministère des Pêches"
          : "Blue-Track presented to the Ministry of Fisheries",
      subtitle:
        locale === "fr"
          ? "Une étape clé vers un outil national de gouvernance maritime."
          : "A key step toward a national maritime governance tool.",
      ctaLabel: locale === "fr" ? "Lire l'actualité" : "Read the update",
      ctaHref: "/actualites/blue-track-presentation-ministere-peches",
    },
    {
      id: "horizon",
      kind: "video",
      src: "/media/videos/bg-video.mp4",
      eyebrow: locale === "fr" ? "REJOIGNEZ-NOUS" : "JOIN US",
      title: locale === "fr" ? "Un horizon à construire, ensemble" : "A horizon to build, together",
      subtitle:
        locale === "fr"
          ? "Soutenez nos actions ou rejoignez le mouvement."
          : "Support our work or join the movement.",
      ctaLabel: tNav("don"),
      ctaHref: "/don",
    },
  ];

  return (
    <>
      <HeroCarousel slides={heroSlides} />

      {/* Nos valeurs */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <BranchAccent className="mx-auto h-10 w-10 text-wagadu-amber" />
          <h2 className="mt-2 font-display font-semibold text-wagadu-ebony">
            {locale === "fr" ? "Nos valeurs" : "Our values"}
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {valeurs.map((valeur, index) => {
            const t = pickTranslation(valeur.translations, locale);
            return (
              <Reveal key={valeur.id} delay={index * 0.08}>
                <div className="h-full rounded-3xl border border-wagadu-sand bg-white p-8 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <h3 className="font-display font-semibold text-wagadu-terracotta">{t?.nom}</h3>
                  <p className="mt-4 text-base leading-relaxed text-wagadu-ebony/70">
                    {t?.description}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Motif africain riche et multicolore — séparateur de section plein
          écran (brief 4 : "en franc", jamais en fond de texte courant). */}
      <div
        className="h-40 w-full bg-repeat sm:h-56"
        style={{ backgroundImage: "url(/media/brand/motif-africain-colore.jpg)", backgroundSize: "320px" }}
        aria-hidden
      />

      {/* Nos trois piliers — même traitement visuel pour les 3 (même taille de
          carte, même niveau de détail), chacun illustré par un vrai visuel
          plutôt qu'une icône seule (brief 4). */}
      <section className="relative overflow-hidden bg-wagadu-sand/30 py-24">
        <div
          aria-hidden
          className="absolute inset-0 bg-repeat opacity-[0.08]"
          style={{ backgroundImage: "url(/media/brand/motif-branches.png)", backgroundSize: "480px" }}
        />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center">
            <BranchAccent className="mx-auto h-10 w-10 text-wagadu-terracotta" flip />
            <h2 className="mt-2 font-display font-semibold text-wagadu-ebony">
              {locale === "fr" ? "Nos trois piliers" : "Our three pillars"}
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {piliers.map((pilier, index) => {
              const t = pickTranslation(pilier.translations, locale);
              const image = PILIER_IMAGES[pilier.slug] ?? FALLBACK_CARD_IMAGE;
              const tags = PILIER_TAGS[pilier.slug];
              return (
                <Reveal key={pilier.id} delay={index * 0.08}>
                  <TiltCard
                    className={`group relative h-96 overflow-hidden shadow-md ${index % 2 === 0 ? "shape-soft-a" : "shape-soft-b"}`}
                  >
                    <Image
                      src={image}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 33vw, 100vw"
                      className="object-cover transition duration-700 group-hover:scale-110"
                    />
                    <div
                      className={`absolute inset-0 bg-gradient-to-t ${ACCENT_CLASSES[pilier.couleur_accent]}`}
                    />
                    <div className="relative flex h-full flex-col justify-end p-7 text-white">
                      <h3 className="font-display text-2xl font-semibold">{t?.nom}</h3>
                      {tags ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium backdrop-blur-sm"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <p className="mt-3 text-base leading-relaxed opacity-95">{t?.resume}</p>
                      <Link
                        href="/thematiques"
                        className="mt-4 inline-flex w-fit items-center gap-1 text-sm font-semibold underline underline-offset-4"
                      >
                        {tCommon("enSavoirPlus")} →
                      </Link>
                    </div>
                  </TiltCard>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <div className="bg-wagadu-sand/30">
        <WaveDivider fillClassName="fill-wagadu-ebony" />
      </div>

      {/* Réalisations à la une — fond motif africain (retour utilisateur : « un
          bg images cette image ») au lieu d'un fond blanc uni ; opacité
          modérée + dégradé pour que les cartes claires restent lisibles. */}
      {misesEnAvant.length > 0 ? (
        <section className="relative overflow-hidden bg-wagadu-ebony py-24">
          <div
            aria-hidden
            className="absolute inset-0 bg-repeat opacity-25"
            style={{ backgroundImage: "url(/media/brand/motif-africain-colore.jpg)", backgroundSize: "280px" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-wagadu-ebony/85 via-wagadu-ebony/70 to-wagadu-ebony/90" />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex items-end justify-between">
              <h2 className="font-display font-semibold text-wagadu-ivory">{tNav("realisations")}</h2>
              <Link href="/realisations" className="text-sm font-semibold text-wagadu-amber hover:text-wagadu-ivory">
                {tCommon("voirTout")} →
              </Link>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {misesEnAvant.map((item, index) => {
              const t = pickTranslation(item.translations, locale);
              const image = REALISATION_IMAGES[item.slug] ?? FALLBACK_CARD_IMAGE;
              const secondaryImage = REALISATION_IMAGES_SECONDARY[item.slug];
              return (
                <Reveal key={item.id} delay={index * 0.08}>
                  <TiltCard className="h-full">
                  <Link
                    href={`/realisations/${item.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-3xl border border-wagadu-sand bg-white shadow-sm transition hover:shadow-xl"
                  >
                    <div className="relative h-64 overflow-hidden">
                      <Image
                        src={image}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-wagadu-ebony/80 via-wagadu-ebony/10 to-transparent" />
                      {item.mise_en_avant ? (
                        <span className="absolute left-4 top-4 rounded-full bg-wagadu-amber px-3 py-1 text-xs font-bold text-wagadu-ebony">
                          ★ {locale === "fr" ? "À la une" : "Featured"}
                        </span>
                      ) : null}
                      {secondaryImage ? (
                        <div className="absolute right-4 top-4 h-16 w-16 overflow-hidden rounded-xl shadow-lg ring-2 ring-white/80 sm:h-20 sm:w-20">
                          <Image src={secondaryImage} alt="" fill sizes="80px" className="object-cover" />
                        </div>
                      ) : null}
                      <span className="absolute bottom-4 left-5 font-display text-xl font-semibold text-white">
                        {t?.titre}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <p className="text-base leading-relaxed text-wagadu-ebony/70">{t?.resume}</p>
                      <span className="mt-4 text-sm font-semibold text-wagadu-terracotta group-hover:underline">
                        {tCommon("enSavoirPlus")}
                      </span>
                    </div>
                  </Link>
                  </TiltCard>
                </Reveal>
              );
            })}
          </div>
          </div>
        </section>
      ) : null}

      {/* Témoignage — texte authentique du site WordPress d'origine (brief
          section 2.1), fourni par l'équipe Wagadu pour republication. */}
      {hero?.body ? (
        <section className="relative overflow-hidden py-24">
          <div
            aria-hidden
            className="absolute inset-0 scale-110 bg-cover bg-center blur-sm"
            style={{ backgroundImage: "url(/media/photos/atelier-equipe-ordinateur-01.jpg)" }}
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-wagadu-ebony/65 via-wagadu-ebony/55 to-wagadu-ebony/70"
          />
          <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <Reveal>
              <BranchAccent className="mx-auto h-10 w-10 text-wagadu-amber" />
              <h2 className="mt-2 font-display text-2xl font-semibold text-wagadu-ivory sm:text-3xl">
                {locale === "fr"
                  ? "Réveiller la force de l'Afrique pour un avenir durable"
                  : "Awakening Africa's Strength for a Sustainable Future"}
              </h2>
              <div
                className="prose prose-invert mt-6 max-w-none text-lg leading-relaxed text-wagadu-ivory/85 prose-p:mb-4"
                dangerouslySetInnerHTML={{ __html: hero.body }}
              />
              <p className="mt-6 font-mono text-sm tracking-widest text-wagadu-amber">— WAGADU AFRICA</p>
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* Mot du fondateur — n'apparaît que si le contenu réel (nom, titre,
          message) a été renseigné dans Directus (page_statique
          "mot-fondateur") ; jamais de citation inventée au nom de quelqu'un
          de réel (brief section 4, exigence d'authenticité). */}
      {motFondateur?.body ? (
        <section className="relative overflow-hidden bg-wagadu-ebony py-24">
          <div
            aria-hidden
            className="absolute inset-0 bg-repeat opacity-20"
            style={{ backgroundImage: "url(/media/brand/motif-africain-colore.jpg)", backgroundSize: "280px" }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-wagadu-ebony/88 via-wagadu-ebony/75 to-wagadu-bark/85" />
          <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <Reveal className="grid gap-10 sm:grid-cols-[minmax(0,240px)_1fr] sm:items-center">
              <FounderPhoto src="/media/photos/mot-fondateur.jpg" alt={motFondateur.titre ?? ""} />
              <div>
                <BranchAccent className="h-9 w-9 text-wagadu-amber" />
                <div
                  className="prose prose-invert mt-3 max-w-none text-lg italic leading-relaxed text-wagadu-ivory/90 prose-p:mb-4"
                  dangerouslySetInnerHTML={{ __html: motFondateur.body }}
                />
                <p className="mt-4 font-display text-lg font-semibold text-wagadu-ivory">
                  {motFondateur.titre}
                </p>
                {motFondateur.sous_titre ? (
                  <p className="text-sm text-wagadu-amber">{motFondateur.sous_titre}</p>
                ) : null}
              </div>
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* CTA don — fond plein cadre en haute résolution (jamais un visuel
          ~300px étiré à toute la largeur, ça devient flou) ; le médaillon
          « mains » reste à une taille proche de sa résolution native pour
          rester net tout en étant beaucoup plus visible qu'avant. */}
      <section className="relative overflow-hidden py-28 text-center text-wagadu-ivory sm:py-36">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/media/fish4acp/entretien-beneficiaire.jpg)" }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-wagadu-ebony/80 via-wagadu-ebony/65 to-wagadu-ebony/88"
        />
        <div className="relative mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="animate-pulse-ring relative mx-auto h-48 w-48 overflow-hidden rounded-full shadow-xl ring-4 ring-wagadu-amber/40 sm:h-56 sm:w-56">
              <Image src="/media/photos/mains-entraide.jpg" alt="" fill sizes="224px" className="object-cover" />
            </div>
            <p className="mt-8 font-display text-3xl font-semibold italic sm:text-4xl">
              “Be the light that helps others see”
            </p>
            <p className="mx-auto mt-4 max-w-lg text-base text-wagadu-ivory/85">
              {locale === "fr"
                ? "Ensemble, nous pouvons faire une différence positive dans la vie des autres. Montrons notre générosité et notre solidarité en tendant la main à ceux qui en ont besoin."
                : "Together, we can make a positive difference in the lives of others. Let's show our generosity and solidarity by reaching out to those in need."}
            </p>
            <Link
              href="/don"
              className="mt-10 inline-block rounded-full bg-wagadu-terracotta px-9 py-4 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:bg-wagadu-amber hover:text-wagadu-ebony"
            >
              {tNav("don")}
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Même bande de motif africain qu'au-dessus de "Nos trois piliers" —
          séparateur plein écran avant le footer (retour utilisateur : espace
          blanc nu entre le CTA don et le footer). */}
      <div
        className="h-40 w-full bg-repeat sm:h-56"
        style={{ backgroundImage: "url(/media/brand/motif-africain-colore.jpg)", backgroundSize: "320px" }}
        aria-hidden
      />
    </>
  );
}
