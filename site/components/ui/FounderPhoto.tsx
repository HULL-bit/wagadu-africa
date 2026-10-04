"use client";

import Image from "next/image";
import { motion } from "motion/react";

/**
 * Médaillon photo animé (entrée en rotation/zoom) + anneau dégradé qui
 * respire, pour la section "mot du fondateur" — extrait en composant client
 * dédié car `app/[locale]/page.tsx` est un composant serveur et ne peut pas
 * utiliser `motion` directement.
 */
export function FounderPhoto({ src, alt }: { src: string; alt: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, rotate: -6 }}
      whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto aspect-square w-48 sm:w-full"
    >
      <div className="shape-blob animate-pulse-ring absolute -inset-2 bg-gradient-to-br from-wagadu-amber via-wagadu-terracotta to-wagadu-brown opacity-80" />
      <div className="shape-blob relative h-full w-full overflow-hidden shadow-2xl ring-4 ring-wagadu-ivory/10">
        <Image src={src} alt={alt} fill sizes="240px" className="object-cover" />
      </div>
    </motion.div>
  );
}
