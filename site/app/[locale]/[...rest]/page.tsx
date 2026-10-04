import { notFound } from "next/navigation";

/**
 * Attrape-tout pour toute URL sous /fr ou /en qui ne correspond à aucune
 * page réelle (retour utilisateur : les URLs invalides tombaient sur le
 * fallback racine `app/not-found.tsx`, sans CSS ni charte — un
 * `<html>`/`<body>` différent de `[locale]/layout.tsx`, d'où l'avertissement
 * d'hydratation en plus de la page cassée). En déclenchant `notFound()`
 * depuis l'intérieur de l'arbre `[locale]`, Next.js utilise le
 * `[locale]/not-found.tsx` déjà à la charte, avec header/footer.
 */
export default function CatchAll(): never {
  notFound();
}
