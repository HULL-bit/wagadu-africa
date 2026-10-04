"use client";

import { useLocale, useTranslations } from "next-intl";
import { routing } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LocaleSwitch() {
  const t = useTranslations("langue");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div
      className="flex items-center gap-1 text-sm font-medium"
      aria-label={t("changerDeLangue")}
    >
      {routing.locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => router.replace(pathname, { locale: loc })}
          aria-current={loc === locale ? "true" : undefined}
          className={
            loc === locale
              ? "rounded-full bg-wagadu-terracotta px-3 py-1 text-white"
              : "rounded-full px-3 py-1 text-wagadu-ebony/70 hover:text-wagadu-ebony"
          }
        >
          {loc.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
