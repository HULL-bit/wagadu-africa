/**
 * Petit motif décoratif (brin de branches/feuilles), cohérent avec l'arbre
 * du logo — à poser près d'un titre de section ou en coin d'une image, en
 * accent discret, jamais comme illustration principale.
 */
export function BranchAccent({ className = "", flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      className={`${flip ? "-scale-x-100" : ""} ${className}`}
    >
      <path
        d="M4 60 C 10 44 14 30 26 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M26 18 C 30 22 36 22 40 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M22 30 C 27 32 32 31 35 26"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M14 44 C 19 45 24 43 27 38"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="40" cy="16" r="3" fill="currentColor" />
      <circle cx="35" cy="26" r="2.4" fill="currentColor" />
      <circle cx="27" cy="38" r="2.4" fill="currentColor" />
    </svg>
  );
}
