/**
 * Séparateur de section organique (brief : « bordure vague/feuille plutôt que
 * ligne droite ») — une vague douce en SVG, plutôt que la bande de motif
 * plate déjà utilisée ailleurs. `fillClassName` doit correspondre au fond de
 * la section qui SUIT le séparateur (la vague « découvre » cette couleur).
 */
export function WaveDivider({
  fillClassName = "fill-wagadu-ivory",
  flip = false,
}: {
  fillClassName?: string;
  flip?: boolean;
}) {
  return (
    <div aria-hidden className={`w-full overflow-hidden leading-none ${flip ? "rotate-180" : ""}`}>
      <svg viewBox="0 0 1440 110" preserveAspectRatio="none" className={`h-14 w-full sm:h-24 ${fillClassName}`}>
        <path d="M0,32 C 220,90 420,0 700,36 C 980,72 1180,8 1440,46 L1440,110 L0,110 Z" />
      </svg>
    </div>
  );
}
