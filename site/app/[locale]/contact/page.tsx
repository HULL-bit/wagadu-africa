import { getLocale, getTranslations } from "next-intl/server";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { ContactForm } from "@/components/blocks/ContactForm";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("contact") };
}

/**
 * Coordonnées en dur (mêmes valeurs que le pied de page) — proviendront de
 * la collection Directus `parametres_site` à partir de la Phase 3.
 */
const CONTACT = {
  email: "contact@wagadu-africa.org",
  telephone: "+221 76 129 85 20",
  adresse: "Cité Marine Almadie 2 N°75, Rufisque, Sénégal",
} as const;

export default async function ContactPage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("nav");
  const tContact = await getTranslations("contact");
  const tFooter = await getTranslations("footer");

  return (
    <>
      <PageHero
        title={t("contact")}
        subtitle={
          locale === "fr"
            ? "Une question, un partenariat, une envie de nous rejoindre : écrivez-nous."
            : "A question, a partnership, a wish to join us: write to us."
        }
        image="/media/fish4acp/silhouette-cage-coucher-soleil-03.jpg"
        bgTexture="/media/brand/motif-branches-carte-visite.png"
        bgTextureRepeat
      />

      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-5 lg:px-8">
        <Reveal className="lg:col-span-2">
          <h2 className="font-display text-2xl font-semibold text-wagadu-ebony">{tContact("formTitre")}</h2>
          <dl className="mt-8 space-y-6 text-base text-wagadu-ebony/80">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-wagadu-terracotta">
                {tContact("email")}
              </dt>
              <dd className="mt-1">
                <a href={`mailto:${CONTACT.email}`} className="hover:text-wagadu-terracotta">
                  {CONTACT.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-wagadu-terracotta">
                {tContact("telephone")}
              </dt>
              <dd className="mt-1">
                <a href={`tel:${CONTACT.telephone.replace(/\s+/g, "")}`} className="hover:text-wagadu-terracotta">
                  {CONTACT.telephone}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-wagadu-terracotta">
                {tFooter("adresse")}
              </dt>
              <dd className="mt-1">{CONTACT.adresse}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-wagadu-terracotta">
                {tContact("horaires")}
              </dt>
              <dd className="mt-1">{tContact("horairesValeur")}</dd>
            </div>
          </dl>
        </Reveal>

        <Reveal delay={0.1} className="lg:col-span-3">
          <ContactForm />
        </Reveal>
      </div>
    </>
  );
}
