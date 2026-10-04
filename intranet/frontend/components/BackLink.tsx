"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/Icon";

/** Lien de retour : va à `href` si fourni, sinon revient en arrière dans l'historique. */
export function BackLink({ href, label = "Retour" }: { href?: string; label?: string }) {
  const router = useRouter();
  const cls =
    "inline-flex items-center gap-1.5 text-sm text-wagadu-brown/70 hover:text-wagadu-brown transition-colors";
  if (href) {
    return (
      <Link href={href} className={cls}>
        <Icon name="chevron-left" className="w-4 h-4" /> {label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => router.back()} className={cls}>
      <Icon name="chevron-left" className="w-4 h-4" /> {label}
    </button>
  );
}
