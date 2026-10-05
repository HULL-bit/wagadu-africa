import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { NewsletterForm } from "@/components/blocks/NewsletterForm";

const INSTITUTIONNEL = [
  { href: "/transparence", key: "transparence" },
  { href: "/gouvernance", key: "gouvernance" },
  { href: "/presse", key: "presse" },
  { href: "/partenaires", key: "partenaires" },
] as const;

const RESSOURCES = [
  { href: "/ressources", key: "ressources" },
  { href: "/media", key: "media" },
  { href: "/faq", key: "faq" },
  { href: "/nous-rejoindre", key: "nousRejoindre" },
] as const;

const LEGAL = [
  { href: "/mentions-legales", key: "mentionsLegales" },
  { href: "/confidentialite", key: "confidentialite" },
  { href: "/cgu", key: "cgu" },
] as const;

/**
 * Coordonnées : en dur pour l'instant, proviendront de la collection Directus
 * `parametres_site` à partir de la Phase 3 (voir plan, section D).
 */
const CONTACT = {
  email: "contact@wagadu-africa.org",
  telephone: "+221 76 129 85 20",
  adresse: "Cité Marine Almadie 2 N°75, Rufisque, Sénégal",
} as const;

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4 shrink-0">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4 shrink-0">
      <path d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2a1.2 1.2 0 0 1 1.2-.3c1.1.4 2.3.6 3.5.6.7 0 1.2.5 1.2 1.2V20c0 .7-.5 1.2-1.2 1.2C10.9 21.2 2.8 13.1 2.8 3.9c0-.7.5-1.2 1.2-1.2h3.3c.7 0 1.2.5 1.2 1.2 0 1.2.2 2.4.6 3.5.1.4 0 .9-.3 1.2Z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4 shrink-0">
      <path d="M12 21s7-7.1 7-12a7 7 0 1 0-14 0c0 4.9 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

export function Footer() {
  const tNav = useTranslations("nav");
  const tFooter = useTranslations("footer");

  return (
    <footer className="relative overflow-hidden border-t border-wagadu-sand/60 bg-wagadu-ebony text-wagadu-ivory">
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center opacity-25"
        style={{ backgroundImage: "url(/media/fish4acp/parc-ostreicole-coucher-soleil-large.jpg)" }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-repeat opacity-10"
        style={{ backgroundImage: "url(/media/brand/motif-bogolan-footer.jpg)", backgroundSize: "260px" }}
      />
      <div className="absolute inset-0 bg-wagadu-ebony/75" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:px-8">
        <div className="lg:col-span-4">
          <p className="font-display text-xl font-semibold">Wagadu Africa</p>
          <p className="mt-3 max-w-sm text-base text-wagadu-ivory/70">{tFooter("coordonnees")}</p>

          <ul className="mt-6 space-y-3 text-sm text-wagadu-ivory/80">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 text-wagadu-amber">
                <MailIcon />
              </span>
              <span>
                <span className="block text-xs font-semibold uppercase tracking-wide text-wagadu-ivory/50">
                  {tFooter("email")}
                </span>
                <a href={`mailto:${CONTACT.email}`} className="hover:text-white">
                  {CONTACT.email}
                </a>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 text-wagadu-amber">
                <PhoneIcon />
              </span>
              <span>
                <span className="block text-xs font-semibold uppercase tracking-wide text-wagadu-ivory/50">
                  {tFooter("telephone")}
                </span>
                <a href={`tel:${CONTACT.telephone.replace(/\s+/g, "")}`} className="hover:text-white">
                  {CONTACT.telephone}
                </a>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 text-wagadu-amber">
                <PinIcon />
              </span>
              <span>
                <span className="block text-xs font-semibold uppercase tracking-wide text-wagadu-ivory/50">
                  {tFooter("adresse")}
                </span>
                <span>{CONTACT.adresse}</span>
              </span>
            </li>
          </ul>

          <div className="mt-6">
            <p className="text-sm font-semibold text-wagadu-ivory/90">{tFooter("suivezNous")}</p>
            {/* Réseaux sociaux : uniquement les comptes réels confirmés (Phase 3) — voir plan section F(b) */}
          </div>
        </div>

        <nav className="lg:col-span-2" aria-label={tFooter("institutionnel")}>
          <p className="text-sm font-semibold text-wagadu-amber">{tFooter("institutionnel")}</p>
          <ul className="mt-3 space-y-2 text-base text-wagadu-ivory/80">
            {INSTITUTIONNEL.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-white">
                  {tNav(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="lg:col-span-2" aria-label={tNav("ressources")}>
          <p className="text-sm font-semibold text-wagadu-amber">{tNav("ressources")}</p>
          <ul className="mt-3 space-y-2 text-base text-wagadu-ivory/80">
            {RESSOURCES.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-white">
                  {tNav(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="lg:col-span-4">
          <p className="text-sm font-semibold text-wagadu-amber">{tFooter("newsletter")}</p>
          <p className="mt-3 text-base text-wagadu-ivory/80">{tFooter("newsletterDescription")}</p>
          <NewsletterForm />
        </div>
      </div>

      <div className="relative border-t border-wagadu-ivory/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-xs text-wagadu-ivory/60 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} Wagadu Africa — {tFooter("tousDroitsReserves")}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {LEGAL.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-white">
                {tFooter(item.key)}
              </Link>
            ))}
            <a
              href={process.env.NEXT_PUBLIC_HUB_URL ?? "https://intranet.wagadu-africa.org"}
              className="text-wagadu-ivory/40 hover:text-white"
            >
              {tFooter("espaceEquipe")}
            </a>
            {process.env.NEXT_PUBLIC_DIRECTUS_ADMIN_URL ? (
              <a
                href={process.env.NEXT_PUBLIC_DIRECTUS_ADMIN_URL}
                className="text-wagadu-ivory/40 hover:text-white"
              >
                {tFooter("administration")}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
