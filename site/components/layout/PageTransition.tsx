"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * Transition entre pages (retour utilisateur : le site doit "exploser" au
 * niveau animations — navigations trop sèches jusqu'ici). `key={pathname}`
 * force Framer Motion à traiter chaque page comme un élément qui
 * sort/entre — même mécanisme que `Reveal`/`TiltCard` déjà utilisés
 * ailleurs sur le site, pas de nouvelle dépendance.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) return <>{children}</>;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 18, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -12, filter: "blur(2px)" }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
