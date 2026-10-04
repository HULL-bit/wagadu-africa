"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Apparition douce à l'affichage (brief 6 : "animations de défilement
 * légères"). Respecte `prefers-reduced-motion` via le hook `motion` dédié —
 * dans ce cas, le contenu apparaît instantanément, sans décalage ni fondu.
 *
 * Déclenchée au montage (pas par `whileInView`/IntersectionObserver) : une
 * erreur JS ailleurs sur la page qui interrompt l'hydratation ne doit jamais
 * laisser une section figée à `opacity: 0` pour de bon — ça s'est produit en
 * pratique (crash RSC ponctuel) et rendait des sections entières invisibles
 * alors que leur contenu était bien présent dans le HTML. Un déclenchement au
 * montage ne dépend que du cycle de vie React, pas du scroll/layout/viewport.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  y = 24,
  variant = "slide",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
  /** "slide" (défaut, fondu + léger décalage vertical) ou "scale" (fondu +
   * zoom doux depuis 94%) — pour varier les transitions d'une section à
   * l'autre plutôt que répéter systématiquement le même mouvement. */
  variant?: "slide" | "scale";
}) {
  const shouldReduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const initial =
    variant === "scale" ? { opacity: 0, scale: 0.94 } : { opacity: 0, y };
  const animate = variant === "scale" ? { opacity: 1, scale: 1 } : { opacity: 1, y: 0 };

  return (
    <motion.div
      className={className}
      initial={shouldReduceMotion ? undefined : initial}
      animate={shouldReduceMotion || mounted ? animate : initial}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
