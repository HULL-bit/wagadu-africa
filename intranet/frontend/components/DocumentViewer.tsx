"use client";

import { useEffect, useState } from "react";
import { tokenStore } from "@/lib/api";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";

/** Lecteur de document intégré : affiche PDF et images directement dans la
 * plateforme ; propose le téléchargement pour les autres formats. */
export function DocumentViewer({ documentId, contentType, filename }: {
  documentId: number;
  contentType: string;
  filename: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const kind =
    contentType.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(filename) ? "image"
    : contentType === "application/pdf" || /\.pdf$/i.test(filename) ? "pdf"
    : "other";

  useEffect(() => {
    if (kind === "other") return;
    let objectUrl: string | null = null;
    fetch(`${BASE}/documents/${documentId}/preview/`, {
      headers: { Authorization: `Bearer ${tokenStore.access}` },
    })
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error("Aperçu indisponible"))))
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((e) => setError(e.message));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [documentId, kind]);

  if (kind === "other") {
    return (
      <div className="card text-sm opacity-70">
        Ce format ({contentType || filename.split(".").pop()}) ne peut pas être affiché
        directement. Utilisez « Télécharger » pour l&apos;ouvrir.
      </div>
    );
  }
  if (error) return <p className="text-sm text-wagadu-terracotta">{error}</p>;
  if (!url) return <p className="text-sm opacity-60">Chargement de l&apos;aperçu…</p>;

  return kind === "image" ? (
    <img src={url} alt={filename} className="rounded-2xl border border-wagadu-sand max-h-[80vh] mx-auto" />
  ) : (
    <iframe src={url} title={filename}
      className="w-full rounded-2xl border border-wagadu-sand" style={{ height: "80vh" }} />
  );
}
