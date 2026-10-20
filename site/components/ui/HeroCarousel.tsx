"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

export type HeroSlide = {
  id: string;
  kind: "video" | "image";
  src: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  /** Point de recadrage CSS `object-position` (ex. "center 20%") — pour les
   * photos au cadrage vertical/portrait affichées dans ce format large, où
   * un centrage par défaut coupe les visages en haut de l'image. */
  objectPosition?: string;
  /** Logo du partenaire associé à cette diapo (ex. FAO pour FISH4ACP) — pour
   * mettre en évidence un partenariat réel plutôt que de ne le mentionner
   * qu'en texte (retour utilisateur). */
  partnerLogo?: { src: string; alt: string };
};

/**
 * Hero d'accueil en carrousel rotatif (référence HOTOSM, brief 3.4/6) — média
 * plein cadre + titre court + phrase + lien, plutôt qu'une bannière statique
 * unique. Chaque page qui s'ouvre sur ce composant respecte le principe
 * Greenpeace : jamais de bloc de texte seul avant le premier visuel.
 *
 * Perf : seule la diapo active charge sa vidéo (le `src` n'est posé sur le
 * <video> que quand elle est sélectionnée) — sinon les 2-3 vidéos du
 * carrousel se chargeraient toutes en même temps au premier rendu, ce qui
 * pèse lourd sur une connexion faible (cible Afrique de l'Ouest, brief 0.7).
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 6500, stopOnInteraction: false, stopOnMouseEnter: true }),
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("init", onSelect);
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  return (
    <section className="relative h-[92vh] min-h-[560px] overflow-hidden bg-wagadu-ebony text-wagadu-ivory">
      <div className="h-full" ref={emblaRef}>
        <div className="flex h-full">
          {slides.map((slide, index) => {
            const isActive = index === selectedIndex;
            return (
              <div key={slide.id} className="relative h-full min-w-0 flex-[0_0_100%] overflow-hidden">
                {/* Média plein cadre, intact — jamais de voile ni de texte
                    dessus (retour utilisateur : l'image doit être mise en
                    évidence, pas le texte). */}
                {slide.kind === "video" ? (
                  <video
                    className="absolute inset-0 h-full w-full object-cover"
                    src={isActive ? slide.src : undefined}
                    autoPlay={isActive}
                    muted
                    loop
                    playsInline
                    preload="none"
                  />
                ) : (
                  <motion.div
                    className="absolute inset-0 h-full w-full"
                    animate={shouldReduceMotion ? undefined : { scale: isActive ? 1.09 : 1 }}
                    transition={{ duration: 7, ease: "linear" }}
                  >
                    <Image
                      src={slide.src}
                      alt={slide.title}
                      fill
                      sizes="100vw"
                      priority={index === 0}
                      className="object-cover"
                      style={slide.objectPosition ? { objectPosition: slide.objectPosition } : undefined}
                    />
                  </motion.div>
                )}

                {/* Étiquette (ex. "WAGADU AFRICA", "BLUE-TRACK — NEWS",
                    "JOIN US") remise directement sur l'image, avec son fond
                    en pastille, comme avant — distincte de la carte de titre
                    ci-dessous (retour utilisateur). */}
                {slide.eyebrow ? (
                  <p className="absolute left-1/2 top-5 z-[1] -translate-x-1/2 rounded-full bg-wagadu-ebony/50 px-4 py-1.5 font-mono text-xs tracking-widest text-wagadu-amber backdrop-blur-sm sm:top-6 sm:text-sm">
                    {slide.eyebrow}
                  </p>
                ) : null}

                {/* Petite carte flottante, centrée, pas toute la largeur —
                    son fond est un vrai flou de verre (`backdrop-blur`) de ce
                    qu'il y a juste derrière elle, jamais de l'image elle-même
                    qui reste nette partout ailleurs. `items-center` (pas
                    seulement `text-center`) pour que l'étiquette, le logo
                    partenaire et le bouton soient eux aussi de vraies
                    pastilles centrées, pas des blocs étirés en largeur. */}
                <div className="absolute inset-x-0 bottom-10 z-[1] flex justify-center px-4 sm:bottom-16 sm:px-6">
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 16 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.55, ease: "easeOut" }}
                    className="flex w-full max-w-[27rem] flex-col items-center rounded-3xl bg-wagadu-ebony/45 px-6 py-5 text-center shadow-xl ring-1 ring-white/15 backdrop-blur-lg sm:max-w-lg sm:px-8 sm:py-7"
                  >
                    <h1 className="line-clamp-2 max-w-[24rem] whitespace-pre-line text-balance text-center font-display text-base font-semibold sm:text-xl">
                      {slide.title}
                    </h1>
                    {slide.subtitle ? (
                      <p className="mt-1.5 line-clamp-2 max-w-[24rem] text-center text-xs text-wagadu-ivory/80 sm:text-sm">
                        {slide.subtitle}
                      </p>
                    ) : null}
                    {slide.partnerLogo ? (
                      <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1">
                        <Image
                          src={slide.partnerLogo.src}
                          alt={slide.partnerLogo.alt}
                          width={18}
                          height={18}
                          className="h-4 w-auto"
                        />
                        <span className="font-mono text-[0.6rem] font-semibold text-wagadu-ebony">
                          {slide.partnerLogo.alt}
                        </span>
                      </div>
                    ) : null}
                    {slide.ctaLabel && slide.ctaHref ? (
                      <Link
                        href={slide.ctaHref}
                        className="mt-4 inline-block rounded-full bg-wagadu-terracotta px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-wagadu-amber hover:text-wagadu-ebony"
                      >
                        {slide.ctaLabel} →
                      </Link>
                    ) : null}
                  </motion.div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {slides.length > 1 ? (
        <>
          {/* Flèches cachées sur mobile (retour utilisateur : elles chevauchaient
              le sous-titre sur petit écran) — le swipe tactile et les points
              suffisent, comme sur la plupart des carrousels mobiles. */}
          <button
            type="button"
            aria-label="Précédent"
            onClick={scrollPrev}
            className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-wagadu-ebony/40 text-wagadu-ivory backdrop-blur-sm transition hover:bg-wagadu-ebony/70 sm:flex sm:left-6 sm:h-12 sm:w-12"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Suivant"
            onClick={scrollNext}
            className="absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-wagadu-ebony/40 text-wagadu-ivory backdrop-blur-sm transition hover:bg-wagadu-ebony/70 sm:flex sm:right-6 sm:h-12 sm:w-12"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Points en bas de l'image, sous la carte de légende (remontée),
              pas en haut — l'étiquette occupe déjà le haut, centrée. */}
          <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Slide ${index + 1}`}
                aria-current={index === selectedIndex}
                onClick={() => emblaApi?.scrollTo(index)}
                className={`h-1.5 rounded-full transition-all ${
                  index === selectedIndex ? "w-8 bg-wagadu-amber" : "w-4 bg-wagadu-ivory/40"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
