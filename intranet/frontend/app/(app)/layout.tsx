"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { GlobalSearch } from "@/components/GlobalSearch";
import { NotificationsBell } from "@/components/NotificationsBell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { me, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !me) router.replace("/login");
  }, [me, loading, router]);

  if (loading || !me) {
    return (
      <main className="min-h-dvh grid place-items-center wagadu-branches">
        <p className="font-display text-xl text-wagadu-brown animate-fade">Chargement…</p>
      </main>
    );
  }

  return (
    <div className="md:flex min-h-dvh bg-wagadu-ivory">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 border-b border-wagadu-sand bg-wagadu-ivory/85 backdrop-blur
          px-4 md:px-8 py-3 flex items-center gap-3">
          <GlobalSearch />
          <div className="ml-auto"><NotificationsBell /></div>
        </header>
        <main className="flex-1 w-full relative wagadu-pattern">
          <div className="relative p-5 md:p-10 w-full max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
