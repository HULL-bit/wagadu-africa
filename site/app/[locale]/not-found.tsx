import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");
  const tCommon = useTranslations("common");

  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden bg-wagadu-ebony px-6 text-center text-wagadu-ivory">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,var(--color-wagadu-terracotta)_0,transparent_45%),radial-gradient(circle_at_80%_60%,var(--color-wagadu-amber)_0,transparent_45%)]"
      />
      <p className="relative font-mono text-sm tracking-widest text-wagadu-amber">404</p>
      <h1 className="relative mt-4 font-display text-4xl font-semibold sm:text-5xl">
        {t("titre")}
      </h1>
      <p className="relative mt-4 max-w-md text-wagadu-ivory/80">{t("description")}</p>
      <Link
        href="/"
        className="relative mt-8 inline-block rounded-full bg-wagadu-terracotta px-6 py-3 text-sm font-semibold text-white transition hover:bg-wagadu-amber hover:text-wagadu-ebony"
      >
        {tCommon("retourAccueil")}
      </Link>
    </div>
  );
}
