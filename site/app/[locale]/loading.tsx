/**
 * Affiché automatiquement par Next.js pendant le chargement d'un segment de
 * route (navigation ou données lentes) — remplace le flash blanc par un
 * repère de marque animé, cohérent avec `.animate-pulse-ring` déjà utilisé
 * ailleurs sur le site.
 */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 animate-ping rounded-full bg-wagadu-terracotta/30" />
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-wagadu-amber via-wagadu-terracotta to-wagadu-brown" />
      </div>
      <p className="font-mono text-xs uppercase tracking-widest text-wagadu-ebony/40">
        Wagadu Africa
      </p>
    </div>
  );
}
