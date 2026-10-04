"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

type Status = "idle" | "loading" | "success" | "error";

export function ContactForm() {
  const t = useTranslations("contact");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");

    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: data.get("nom"),
          email: data.get("email"),
          telephone: data.get("telephone"),
          message: data.get("message"),
          site_web: data.get("site_web"),
        }),
      });

      if (!res.ok) throw new Error("request_failed");

      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-3xl border border-wagadu-sand bg-white p-8 text-base text-wagadu-ebony/80 shadow-sm">
        {t("succes")}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-wagadu-sand bg-white p-8 shadow-sm">
      {/* Piège à robots : caché visuellement et aux lecteurs d'écran, jamais rempli par un humain. */}
      <div className="absolute -left-[9999px]" aria-hidden>
        <label htmlFor="site_web">Site web</label>
        <input id="site_web" name="site_web" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="nom" className="text-sm font-semibold text-wagadu-ebony">
            {t("nom")}
          </label>
          <input
            id="nom"
            name="nom"
            type="text"
            required
            className="mt-2 w-full rounded-xl border border-wagadu-sand px-4 py-2.5 text-sm text-wagadu-ebony focus:border-wagadu-terracotta focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="email" className="text-sm font-semibold text-wagadu-ebony">
            {t("email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-2 w-full rounded-xl border border-wagadu-sand px-4 py-2.5 text-sm text-wagadu-ebony focus:border-wagadu-terracotta focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="telephone" className="text-sm font-semibold text-wagadu-ebony">
          {t("telephone")}
        </label>
        <input
          id="telephone"
          name="telephone"
          type="tel"
          className="mt-2 w-full rounded-xl border border-wagadu-sand px-4 py-2.5 text-sm text-wagadu-ebony focus:border-wagadu-terracotta focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="message" className="text-sm font-semibold text-wagadu-ebony">
          {t("message")}
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="mt-2 w-full rounded-xl border border-wagadu-sand px-4 py-2.5 text-sm text-wagadu-ebony focus:border-wagadu-terracotta focus:outline-none"
        />
      </div>

      {status === "error" ? <p className="text-sm text-red-700">{t("erreur")}</p> : null}

      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-full bg-wagadu-terracotta px-8 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-wagadu-amber hover:text-wagadu-ebony disabled:pointer-events-none disabled:opacity-60"
      >
        {status === "loading" ? t("envoiEnCours") : t("envoyer")}
      </button>
    </form>
  );
}
