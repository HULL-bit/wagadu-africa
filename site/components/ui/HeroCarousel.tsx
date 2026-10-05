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
              <div key={slide.id} className="relative h-full min-w-0 flex-[0_0_100%]">
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
                      alt=""
                      fill
                      sizes="100vw"
                      priority={index === 0}
                      className="object-cover"
                      style={slide.objectPosition ? { objectPosition: slide.objectPosition } : undefined}
                    />
                  </motion.div>
                )}
                {/* Scrim très léger, juste assez pour que le texte reste lisible —
                    retour utilisateur : les médias doivent rester nets, pas
                    « filtrés »/teintés comme avant (brief : filtrage trop fort). */}
                <div className="absolute inset-0 bg-gradient-to-t from-wagadu-ebony/45 via-wagadu-ebony/10 to-transparent" />

                <div className="relative flex h-full flex-col items-center justify-center px-6 pb-[10vh] text-center">
                  {slide.eyebrow ? (
                    <p className="rounded-full bg-wagadu-ebony/50 px-4 py-1.5 font-mono text-sm tracking-widest text-wagadu-amber backdrop-blur-sm">
                      {slide.eyebrow}
                    </p>
                  ) : null}
                  <h1 className="mt-4 max-w-4xl whitespace-pre-line text-balance text-center font-display font-semibold">
                    {slide.title}
                  </h1>
                  {slide.subtitle ? (
                    <p className="mt-6 max-w-2xl text-lg text-wagadu-ivory/85 sm:text-xl">
                      {slide.subtitle}
                    </p>
                  ) : null}
                  {slide.ctaLabel && slide.ctaHref ? (
                    <Link
                      href={slide.ctaHref}
                      className="mt-8 inline-block rounded-full bg-wagadu-terracotta px-7 py-3.5 text-base font-semibold text-white transition hover:bg-wagadu-amber hover:text-wagadu-ebony"
                    >
                      {slide.ctaLabel} →
                    </Link>
                  ) : null}
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

          <div className="absolute inset-x-0 bottom-8 flex justify-center gap-2">
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
