"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [needTotp, setNeedTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password, totp);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.data && typeof err.data === "object" && "totp_code" in err.data) {
        setNeedTotp(true);
        setError("Code de vérification à deux facteurs requis.");
      } else {
        setError(err instanceof Error ? err.message : "Connexion impossible.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh md:grid md:grid-cols-[1.1fr_1fr]">
      {/* ── Visuel plein cadre ────────────────────────────────────── */}
      <div className="relative hidden md:block">
        <Image src="/brand/photo-4.jpg" alt="" fill priority sizes="55vw" className="object-cover" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(30,15,4,0.55) 0%, rgba(74,42,18,0.30) 38%, rgba(30,15,4,0.88) 100%)",
          }}
          aria-hidden
        />
        <div className="relative h-full flex flex-col justify-between p-10 text-wagadu-ivory">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-wagadu-ivory/85 hover:text-wagadu-gold transition-colors"
          >
            <span aria-hidden>←</span> Retour à l&apos;accueil
          </Link>
          <div>
            <span className="font-display text-2xl">Wagadu&nbsp;Hub</span>
            <p className="font-display text-4xl leading-tight mt-3 max-w-md">
              La plateforme interne de Wagadu&nbsp;Africa
            </p>
            <p className="mt-4 text-wagadu-sand/85 max-w-sm">
              RH, courrier, tâches, documents et réunions — un seul accès sécurisé,
              sur ordinateur comme sur mobile.
            </p>
          </div>
        </div>
      </div>

      {/* ── Formulaire ────────────────────────────────────────────── */}
      <div className="relative flex flex-col items-center justify-center p-6 bg-wagadu-ivory wagadu-pattern">
        <Link
          href="/"
          className="md:hidden self-start inline-flex items-center gap-1.5 text-sm text-wagadu-brown mb-6"
        >
          <span aria-hidden>←</span> Accueil
        </Link>

        <form onSubmit={onSubmit} className="relative card w-full max-w-sm space-y-4">
          <div className="flex items-center gap-3">
            <Image src="/brand/logo-mark.png" alt="Wagadu Africa" width={48} height={48} className="rounded-xl" />
            <span className="font-display text-xl text-wagadu-brown">Wagadu&nbsp;Hub</span>
          </div>
          <h1 className="font-display text-2xl text-wagadu-brown">Connexion</h1>

          <div>
            <label className="label" htmlFor="email">Adresse e-mail</label>
            <input id="email" type="email" required autoComplete="username"
              className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div>
            <label className="label" htmlFor="password">Mot de passe</label>
            <input id="password" type="password" required autoComplete="current-password"
              className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          {needTotp && (
            <div>
              <label className="label" htmlFor="totp">Code à deux facteurs</label>
              <input id="totp" inputMode="numeric" className="input font-mono"
                value={totp} onChange={(e) => setTotp(e.target.value)} />
            </div>
          )}

          {error && <p className="text-sm text-wagadu-terracotta">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="mt-6 text-xs text-center text-wagadu-ebony/50 max-w-sm">
          Accès réservé aux membres et collaborateurs de Wagadu&nbsp;Africa.
        </p>
      </div>
    </main>
  );
}
