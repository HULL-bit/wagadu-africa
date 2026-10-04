"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

export type Tab = { href: string; label: string; perm?: string; exact?: boolean };

/** Barre d'onglets pour regrouper des sous-pages d'un même module. */
export function SectionTabs({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname();
  const { can } = useAuth();
  const visible = tabs.filter((t) => !t.perm || can(t.perm));
  if (visible.length < 2) return null;

  return (
    <nav className="flex flex-wrap gap-1 border-b border-wagadu-sand -mt-1">
      {visible.map((t) => {
        const active = t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`px-3 py-2 text-sm rounded-t-lg border-b-2 -mb-px transition-colors ${
              active
                ? "border-wagadu-gold text-wagadu-brown font-medium bg-white"
                : "border-transparent text-wagadu-brown/60 hover:text-wagadu-brown hover:bg-white/50"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
