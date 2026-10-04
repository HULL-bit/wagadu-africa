import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Gabarit partagé pour les pages dont le contenu réel dépend de données que
 * l'équipe Wagadu doit fournir (gouvernance, chiffres financiers, logos
 * partenaires, textes juridiques...) — on ne fabrique jamais ces faits-là
 * (brief : rien d'inventé qui engagerait l'organisation). Même traitement
 * honnête que `/projets` et `/actualites` avant leur premier contenu réel.
 */
export function ComingSoon({
  title,
  subtitle,
  image,
  message,
}: {
  title: string;
  subtitle?: string;
  image?: string;
  message: string;
}) {
  return (
    <>
      <PageHero title={title} subtitle={subtitle} image={image} />
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-lg leading-relaxed text-wagadu-ebony/70">{message}</p>
        </Reveal>
      </div>
    </>
  );
}
