"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

// Pages whose numbers move during the night. The rest (Method, Terms, Token) stay put.
const LIVE = [/^\/$/, /^\/board$/, /^\/s\//, /^\/calls$/, /^\/watch$/, /^\/flow$/, /^\/edition/];
const EVERY_MS = 60_000;

/**
 * Pulls fresh numbers into an open page about once a minute, without a reload: the server
 * components re-render with the latest board, while anything typed or chosen on the page stays.
 * Paused while the tab is hidden; catches up as soon as it is shown again.
 */
export default function AutoRefresh() {
  const router = useRouter();
  const path = usePathname();
  const live = LIVE.some((r) => r.test(path));

  useEffect(() => {
    if (!live) return;
    let last = Date.now();
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - last < EVERY_MS - 1000) return;
      last = Date.now();
      router.refresh();
    };
    const id = window.setInterval(tick, 5_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [live, path, router]);

  return null;
}
