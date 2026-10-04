"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Micro-interaction "charmante" au survol (retour utilisateur : le site
 * manquait de mouvement/animation) — léger tilt + lift avec un ressort
 * `motion`, plutôt qu'une simple transition CSS. Respecte
 * `prefers-reduced-motion` (le tilt est désactivé, seule l'ombre reste).
 */
export function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      whileHover={
        shouldReduceMotion
          ? { y: -2 }
          : { y: -6, rotate: -0.6, scale: 1.015 }
      }
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {children}
    </motion.div>
  );
}
