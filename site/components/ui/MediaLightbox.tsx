"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

export type LightboxImage = { src: string; thumbSrc?: string; alt: string };

/**
 * Grille cliquable + visionneuse plein écran (retour utilisateur : « on doit
 * pouvoir cliquer sur une image et regarder en intégralité »). Navigation
 * clavier (flèches, Échap) + précédent/suivant pour parcourir toute la
 * galerie sans refermer la visionneuse.
 *
 * Root cause enfin identifiée du bug « seul le fond sombre s'affiche » :
 * CHAQUE page est enveloppée par `<PageTransition>` (`components/layout/
 * PageTransition.tsx`), qui anime `transform`/`filter` sur un `motion.div`
 * autour de `{children}` — et Framer Motion laisse ces propriétés posées en
 * style inline (valeurs au repos) même une fois l'animation terminée. Or en
 * CSS, un ancêtre avec `transform` OU `filter` devient le bloc conteneur de
 * tout descendant en `position: fixed` : notre `inset:0` ne couvrait donc
 * plus le viewport mais la hauteur totale de LA PAGE, et le contenu centré
 * (image + boutons) se retrouvait centré sur cette hauteur-là — hors écran
 * dès qu'on cliquait une vignette en bas d'une longue galerie, pendant que
 * le fond sombre (lui aussi `inset:0`) restait visible à l'endroit du
 * scroll. D'où : fond visible, rien d'autre, aucune erreur console. Fixé en
 * sortant la visionneuse de l'arbre React via un portail direct dans
 * `document.body`, qui échappe à n'importe quel ancêtre transformé.
 */
export function MediaLightbox({ images }: { images: LightboxImage[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Portail vers document.body : seul moyen fiable de savoir qu'on est
    // côté client (document n'existe pas pendant le SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

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

  const current = index !== null ? images[index] : null;

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
              src={item.thumbSrc ?? item.src}
              alt={item.alt}
              width={600}
              height={400}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="h-auto w-full object-cover transition duration-500 group-hover:scale-105"
              unoptimized
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3 text-left text-sm text-white opacity-0 transition group-hover:opacity-100">
              {item.alt}
            </span>
          </button>
        ))}
      </div>

      {current && mounted
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              onClick={close}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2147483647,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(30, 15, 4, 0.95)",
            padding: "16px",
          }}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Fermer"
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              width: "44px",
              height: "44px",
              borderRadius: "9999px",
              backgroundColor: "rgba(255,255,255,0.1)",
              color: "#FBF6EC",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: "pointer",
            }}
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
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "44px",
              height: "44px",
              borderRadius: "9999px",
              backgroundColor: "rgba(255,255,255,0.1)",
              color: "#FBF6EC",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: "pointer",
            }}
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
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "44px",
              height: "44px",
              borderRadius: "9999px",
              backgroundColor: "rgba(255,255,255,0.1)",
              color: "#FBF6EC",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: "pointer",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "1100px",
              height: "85vh",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.src}
              alt={current.alt}
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            />
            <p
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
                color: "#fff",
                textAlign: "center",
                fontSize: "14px",
                padding: "16px",
                margin: 0,
              }}
            >
              {current.alt} — {index !== null ? index + 1 : 0} / {images.length}
            </p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
