"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";

type Status = "idle" | "loading" | "success" | "error";

export function NewsletterForm() {
  const t = useTranslations("footer");
  const locale = useLocale();
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    const form = event.currentTarget;
    const email = new FormData(form).get("email");
    const siteWeb = new FormData(form).get("site_web");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, langue: locale, site_web: siteWeb }),
      });
      if (!res.ok) throw new Error("request_failed");
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return <p className="mt-4 text-sm font-semibold text-wagadu-amber">{t("newsletterSucces")}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="relative mt-4 flex gap-2">
      <div className="absolute -left-[9999px]" aria-hidden>
        <label htmlFor="newsletter-site-web">Site web</label>
        <input id="newsletter-site-web" name="site_web" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <label htmlFor="newsletter-email" className="sr-only">
        {t("newsletterPlaceholder")}
      </label>
      <input
        id="newsletter-email"
        name="email"
        type="email"
        required
        placeholder={t("newsletterPlaceholder")}
        className="w-full rounded-full border border-wagadu-ivory/30 bg-transparent px-4 py-2 text-sm text-wagadu-ivory placeholder:text-wagadu-ivory/50 focus:border-wagadu-amber focus:outline-none"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="shrink-0 rounded-full bg-wagadu-amber px-4 py-2 text-sm font-semibold text-wagadu-ebony disabled:opacity-60"
      >
        {status === "loading" ? t("newsletterEnCours") : t("newsletterSubmit")}
      </button>

      {status === "error" ? (
        <p className="absolute -bottom-6 left-0 text-xs text-red-300">{t("newsletterErreur")}</p>
      ) : null}
    </form>
  );
}
