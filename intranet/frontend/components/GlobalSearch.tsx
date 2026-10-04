"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { SEARCH_TYPE_LABEL, SearchResult } from "@/lib/phase6";

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(() => {
      api<{ results: SearchResult[] }>(`/search/?q=${encodeURIComponent(q)}`)
        .then((r) => { setResults(r.results); setOpen(true); })
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  return (
    <div ref={box} className="relative w-full max-w-md">
      <input
        className="input py-1.5"
        placeholder="Rechercher une tâche, un courrier, un document, une personne…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
      />
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-wagadu-sand bg-white shadow-lg max-h-96 overflow-y-auto">
          {results.map((r) => (
            <Link key={`${r.type}-${r.id}`} href={r.url}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm hover:bg-wagadu-sand/40">
              <span className="badge bg-wagadu-sand mr-2">{SEARCH_TYPE_LABEL[r.type] ?? r.type}</span>
              <span className="font-medium">{r.title}</span>
              <span className="opacity-60"> — {r.subtitle}</span>
            </Link>
          ))}
        </div>
      )}
      {open && q.trim().length >= 2 && results.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-wagadu-sand bg-white shadow-lg px-3 py-2 text-sm opacity-60">
          Aucun résultat.
        </div>
      )}
    </div>
  );
}
