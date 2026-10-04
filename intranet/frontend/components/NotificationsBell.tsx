"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icon";

export function NotificationsBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let stop = false;
    const load = () =>
      api<{ count: number }>("/notifications/unread_count/")
        .then((r) => { if (!stop) setCount(r.count); })
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => { stop = true; clearInterval(t); };
  }, []);

  return (
    <Link href="/notifications" className="relative inline-flex items-center justify-center
      w-9 h-9 rounded-xl border border-wagadu-brown/20 hover:bg-wagadu-sand/50 transition-colors text-wagadu-brown" title="Notifications">
      <Icon name="bell" className="w-[18px] h-[18px]" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full
          bg-wagadu-terracotta text-white text-[11px] font-medium flex items-center justify-center">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
