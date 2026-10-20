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

                {/* Petite carte flottante, centrée, pas toute la largeur —
                    son fond est un vrai flou de verre (`backdrop-blur`) de ce
                    qu'il y a juste derrière elle, jamais de l'image elle-même
                    qui reste nette partout ailleurs. */}
                <div className="absolute inset-x-0 bottom-6 z-[1] flex justify-center px-6 sm:bottom-10">
                  <div className="w-full max-w-[22rem] rounded-3xl bg-wagadu-ebony/45 px-5 py-4 text-center shadow-xl ring-1 ring-white/15 backdrop-blur-xl sm:max-w-sm sm:px-6 sm:py-5">
                    {slide.eyebrow ? (
                      <p className="font-mono text-[0.65rem] font-semibold tracking-widest text-wagadu-amber">
                        {slide.eyebrow}
                      </p>
                    ) : null}
                    <h1 className="mt-1.5 line-clamp-2 whitespace-pre-line text-balance font-display text-base font-semibold sm:text-lg">
                      {slide.title}
                    </h1>
                    {slide.subtitle ? (
                      <p className="mt-1.5 line-clamp-2 text-xs text-wagadu-ivory/80 sm:text-sm">
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
                        className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-wagadu-amber hover:text-wagadu-ivory"
                      >
                        {slide.ctaLabel} →
                      </Link>
                    ) : null}
                  </div>
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

          {/* Points remontés en haut (plutôt qu'en bas, par-dessus le nouveau
              bandeau de légende) pour ne jamais chevaucher le texte ou le CTA. */}
          <div className="absolute inset-x-0 top-5 z-10 flex justify-center gap-2">
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
