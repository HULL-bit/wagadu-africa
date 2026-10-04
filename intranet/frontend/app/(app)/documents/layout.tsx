"use client";

import { usePathname } from "next/navigation";
import { SectionTabs, Tab } from "@/components/SectionTabs";

const TABS: Tab[] = [
  { href: "/documents", label: "Bibliothèque", exact: true },
  { href: "/documents/received", label: "Reçus" },
  { href: "/documents/sent", label: "Envoyés" },
  { href: "/documents/trash", label: "Corbeille" },
];

const WITH_TABS = new Set(TABS.map((t) => t.href));

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="space-y-4">
      {WITH_TABS.has(pathname) && <SectionTabs tabs={TABS} />}
      {children}
    </div>
  );
}
