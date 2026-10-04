"use client";

import { use, useEffect, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";

interface Meta {
  title: string;
  description: string;
  filename: string;
  size: number;
  password_required: boolean;
  expires_at: string | null;
}

export default function PublicSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/public/share/${token}/`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Lien invalide ou expiré."))))
      .then(setMeta)
      .catch((e) => setError(e.message));
  }, [token]);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/public/share/${token}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        throw new Error(res.status === 403 ? "Mot de passe incorrect." : "Téléchargement impossible.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = meta?.filename || "document";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh grid place-items-center wagadu-branches p-6"
      style={{ background: "var(--wagadu-ivory)" }}>
      <div className="card w-full max-w-md space-y-4">
        <p className="font-display text-xl text-wagadu-brown">Wagadu&nbsp;Hub — Partage de document</p>
        {error && <p className="text-sm text-wagadu-terracotta">{error}</p>}
        {meta && (
          <>
            <div>
              <p className="font-medium">{meta.title}</p>
              {meta.description && <p className="text-sm opacity-70">{meta.description}</p>}
              <p className="text-xs opacity-50 font-mono">{meta.filename}</p>
            </div>
            {meta.password_required && (
              <input type="password" className="input" placeholder="Mot de passe"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            )}
            <button className="btn-primary w-full" onClick={download} disabled={busy}>
              {busy ? "Téléchargement…" : "Télécharger"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
