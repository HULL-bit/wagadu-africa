"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";

export type LightboxImage = { src: string; alt: string };

/**
 * Grille cliquable + visionneuse plein écran (retour utilisateur : « on doit
 * pouvoir cliquer sur une image et regarder en intégralité ») — jusqu'ici la
 * médiathèque ouvrait l'image brute dans un nouvel onglet (`target="_blank"`),
 * ce qui marche mais sort de l'expérience du site. Navigation clavier
 * (flèches, Échap) + précédent/suivant pour parcourir toute la galerie sans
 * refermer la visionneuse.
 */
export function MediaLightbox({ images }: { images: LightboxImage[] }) {
  const [index, setIndex] = useState<number | null>(null);

  const close = useCallback(() => setIndex(null), []);
  const prev = useCallback(
    () => setIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length)),
    [images.length],
  );
  const next = useCallback(
    () => setIndex((i) => (i === null ? null : (i + 1) % images.length)),
    [images.length],
  );

  useEffect(() => {
    if (index === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [index, close, prev, next]);

  return (
    <>
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
        {images.map((item, i) => (
          <button
            key={item.src}
            type="button"
            onClick={() => setIndex(i)}
            className="group relative block w-full overflow-hidden rounded-2xl shadow-sm break-inside-avoid"
          >
            <Image
              src={item.src}
              alt={item.alt}
              width={600}
              height={400}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="h-auto w-full object-cover transition duration-500 group-hover:scale-105"
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3 text-left text-sm text-white opacity-0 transition group-hover:opacity-100">
              {item.alt}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {index !== null ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-wagadu-ebony/95 p-4 sm:p-8"
            onClick={close}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Fermer"
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-wagadu-ivory transition hover:bg-white/20"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="Précédent"
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-wagadu-ivory transition hover:bg-white/20 sm:left-6"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="Suivant"
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-wagadu-ivory transition hover:bg-white/20 sm:right-6"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <motion.div
              key={images[index].src}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="relative h-full w-full max-w-5xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={images[index].src}
                alt={images[index].alt}
                fill
                sizes="100vw"
                className="object-contain"
                priority
              />
              <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-4 text-center text-sm text-white">
                {images[index].alt} — {index + 1} / {images.length}
              </p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
