"use client";

import { usePathname } from "next/navigation";
import { SectionTabs, Tab } from "@/components/SectionTabs";

const TABS: Tab[] = [
  { href: "/tasks", label: "Mes tâches", exact: true },
  { href: "/tasks/history", label: "Historique" },
  { href: "/tasks/board", label: "Suivi", perm: "tasks.assign" },
  { href: "/tasks/calendar", label: "Calendrier" },
  { href: "/tasks/recurring", label: "Récurrentes", perm: "tasks.assign" },
  { href: "/tasks/performance", label: "Performance", perm: "tasks.oversee" },
];

const WITH_TABS = new Set(TABS.map((t) => t.href));

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="space-y-4">
      {WITH_TABS.has(pathname) && <SectionTabs tabs={TABS} />}
      {children}
    </div>
  );
}
