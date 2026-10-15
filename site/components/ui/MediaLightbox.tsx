"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";

export type LightboxImage = { src: string; thumbSrc?: string; alt: string };

/**
 * Grille cliquable + visionneuse plein écran (retour utilisateur : « on doit
 * pouvoir cliquer sur une image et regarder en intégralité »). Navigation
 * clavier (flèches, Échap) + précédent/suivant pour parcourir toute la
 * galerie sans refermer la visionneuse.
 *
 * Pas de `motion`/`AnimatePresence` ici (contrairement au reste du site) :
 * en production, la photo (et les boutons fermer/précédent/suivant)
 * n'apparaissaient jamais au clic — seul le fond sombre s'affichait, sans
 * la moindre erreur console, alors que tout fonctionnait en développement
 * local. Après plusieurs correctifs ciblant uniquement l'image (fill vs
 * hauteur explicite, next/image vs <img> natif) sans succès, ce composant
 * est reconstruit en éliminant la bibliothèque d'animation elle-même —
 * rendu conditionnel simple, styles de positionnement critiques en inline
 * plutôt qu'en classes Tailwind, pour supprimer toute dépendance restante
 * qui pourrait se comporter différemment entre les deux environnements.
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

      {current ? (
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
        </div>
      ) : null}
    </>
  );
}
