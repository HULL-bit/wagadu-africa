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

      {/* Travailler avec nous — retour NGO (doc "Convaincre les partenaires") :
          un bailleur/institution cherche d'abord à savoir CE QUE l'on peut
          faire et POUR QUI, avant de remplir un formulaire. Services et types
          de partenaires repris du document, pas inventés ; la plaquette PDF
          reste un [À COMPLÉTER] tant qu'elle n'existe pas réellement. */}
      <div className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 lg:px-8">
        <Reveal>
          <h2 className="font-display text-2xl font-semibold text-wagadu-ebony">
            {locale === "fr" ? "Travailler avec nous" : "Work with us"}
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-wagadu-ebony/70">
            {locale === "fr"
              ? "Wagadu accompagne les agences des Nations Unies, ONG, ministères, équipes de recherche et acteurs privés qui ont besoin de données fiables et de terrain pour agir."
              : "Wagadu supports UN agencies, NGOs, ministries, research teams and private actors who need reliable, field-grounded data to act."}
          </p>
        </Reveal>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <Reveal delay={0.05} className="rounded-3xl border border-wagadu-sand bg-white p-7 shadow-sm">
            <h3 className="font-display text-lg font-semibold text-wagadu-terracotta">
              {locale === "fr" ? "Nos services" : "Our services"}
            </h3>
            <ul className="mt-4 space-y-2 text-base leading-relaxed text-wagadu-ebony/80">
              {(locale === "fr"
                ? ["Collecte et analyse de données de terrain", "Cartographie", "Études de filières", "Formations Open Data", "Suivi-évaluation de projets"]
                : ["Field data collection and analysis", "Mapping", "Value-chain studies", "Open Data training", "Project monitoring & evaluation"]
              ).map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-wagadu-amber">—</span>
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1} className="rounded-3xl border border-wagadu-sand bg-white p-7 shadow-sm">
            <h3 className="font-display text-lg font-semibold text-wagadu-terracotta">
              {locale === "fr" ? "Types de partenaires" : "Types of partners"}
            </h3>
            <ul className="mt-4 space-y-2 text-base leading-relaxed text-wagadu-ebony/80">
              {(locale === "fr"
                ? ["Agences des Nations Unies", "ONG", "Ministères", "Chercheurs", "Secteur privé"]
                : ["UN agencies", "NGOs", "Ministries", "Researchers", "Private sector"]
              ).map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-wagadu-amber">—</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-wagadu-ebony/50">
              {locale === "fr"
                ? "[À COMPLÉTER : plaquette de présentation PDF bilingue, à préparer avec l'équipe.]"
                : "[TO BE COMPLETED: bilingual PDF presentation brochure, to be prepared with the team.]"}
            </p>
          </Reveal>
        </div>
      </div>

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
