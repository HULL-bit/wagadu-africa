import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("don") };
}

const USAGES_FR = [
  "Agriculture durable",
  "Conservation de la biodiversité",
  "Accès à l'eau potable",
  "Éducation environnementale",
  "Renforcement des capacités locales",
  "Soutien aux initiatives communautaires",
  "Recherche et développement de solutions innovantes",
  "Campagnes de sensibilisation et de plaidoyer",
];

const USAGES_EN = [
  "Sustainable agriculture",
  "Biodiversity conservation",
  "Access to clean water",
  "Environmental education",
  "Local capacity building",
  "Support for community initiatives",
  "Research and development of innovative solutions",
  "Awareness and advocacy campaigns",
];

/**
 * Contenu repris de l'ancien site (brief section 2.5). Paiement en ligne :
 * choix retenu = Donorbox (widget hébergé, pas de traitement de carte côté
 * Wagadu). `NEXT_PUBLIC_DONORBOX_CAMPAIGN` = le slug de la campagne
 * (donorbox.org/embed/<slug>) une fois le compte créé côté équipe — tant
 * qu'il n'est pas renseigné, on garde le contact direct plutôt qu'un widget
 * cassé pointant vers une campagne qui n'existe pas.
 */
export default async function DonPage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("nav");
  const usages = locale === "fr" ? USAGES_FR : USAGES_EN;
  const donorboxCampaign = process.env.NEXT_PUBLIC_DONORBOX_CAMPAIGN;

  return (
    <>
      <PageHero
        title={t("don")}
        subtitle={
          locale === "fr"
            ? "« Be the light that helps others see » — soyez la lumière qui aide les autres à voir."
            : "“Be the light that helps others see.”"
        }
        image="/media/fish4acp/entretien-beneficiaire.jpg"
        imageShape="blob"
      />

      <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-lg leading-relaxed text-wagadu-ebony/80">
            {locale === "fr"
              ? "Ensemble, nous pouvons faire une différence positive dans la vie des autres. Montrons notre générosité et notre solidarité en tendant la main à ceux qui en ont besoin."
              : "Together, we can make a positive difference in the lives of others. Let's show our generosity and solidarity by reaching out to those in need."}
          </p>
        </Reveal>

        <Reveal delay={0.08} className="mt-12 grid grid-cols-2 gap-4">
          <div className="relative col-span-2 aspect-[16/9] overflow-hidden rounded-3xl shadow-md sm:col-span-1">
            <Image
              src="/media/fish4acp/parc-ostreicole-vue-large.jpg"
              alt={locale === "fr" ? "Un parc ostréicole soutenu par nos actions de terrain" : "An oyster farm supported by our fieldwork"}
              fill
              sizes="(min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="relative aspect-[16/9] overflow-hidden rounded-3xl shadow-md">
            <Image
              src="/media/fish4acp/equipier-materiel-moteur.jpg"
              alt={locale === "fr" ? "Un membre d'une communauté partenaire sur le terrain" : "A member of a partner community in the field"}
              fill
              sizes="(min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </Reveal>
        </div>

      <section className="relative mt-16 overflow-hidden bg-wagadu-ebony py-20">
        <div
          aria-hidden
          className="absolute inset-0 bg-repeat opacity-20"
          style={{ backgroundImage: "url(/media/brand/motif-africain-colore.jpg)", backgroundSize: "280px" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-wagadu-ebony/85 via-wagadu-ebony/70 to-wagadu-ebony/90" />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <h2 className="font-display text-2xl font-semibold text-wagadu-ivory">
              {locale === "fr" ? "Comment vos dons sont utilisés" : "How your donations are used"}
            </h2>
          </Reveal>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {usages.map((usage, index) => (
              <li key={usage}>
                <Reveal variant="scale" delay={index * 0.05}>
                  <div className="rounded-2xl border border-wagadu-ivory/15 bg-white/10 px-5 py-4 text-base text-wagadu-ivory/90 shadow-sm backdrop-blur-sm">
                    {usage}
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {donorboxCampaign ? (
          <Reveal delay={0.15} className="mt-16 flex flex-col items-center">
            <h2 className="font-display text-2xl font-semibold text-wagadu-ebony">
              {locale === "fr" ? "Faire un don" : "Make a donation"}
            </h2>
            <iframe
              src={`https://donorbox.org/embed/${donorboxCampaign}?default_interval=o`}
              name="donorbox"
              seamless
              title={locale === "fr" ? "Formulaire de don Donorbox" : "Donorbox donation form"}
              className="mt-6 w-full max-w-[500px] min-w-[250px]"
              style={{ height: 900 }}
              frameBorder={0}
              scrolling="no"
              allow="payment"
            />
          </Reveal>
        ) : (
          <Reveal delay={0.15} className="mt-16 rounded-3xl bg-wagadu-sand/40 p-8 text-center">
            <p className="text-base text-wagadu-ebony/80">
              {locale === "fr"
                ? "Le paiement en ligne n'est pas encore disponible sur le site. Pour faire un don dès maintenant, contactez-nous directement — nous vous indiquerons la marche à suivre."
                : "Online payment isn't available on the site yet. To donate right away, contact us directly — we'll let you know how to proceed."}
            </p>
            <a
              href="mailto:contact@wagadu-africa.org"
              className="mt-6 inline-block rounded-full bg-wagadu-terracotta px-8 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-wagadu-amber hover:text-wagadu-ebony"
            >
              contact@wagadu-africa.org
            </a>
          </Reveal>
        )}
      </div>
    </>
  );
}
