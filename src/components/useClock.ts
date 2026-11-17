"use client";

import { useSyncExternalStore } from "react";

// One shared one-second ticker for every clock on the page.
let now = 0;
const subs = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(cb: () => void) {
  subs.add(cb);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      subs.forEach((s) => s());
    }, 1000);
  }
  return () => {
    subs.delete(cb);
    if (!subs.size && timer) { clearInterval(timer); timer = null; }
  };
}

/** Wall-clock time, ticking each second. Null during server render so markup matches. */
export function useClock(): number | null {
  return useSyncExternalStore(subscribe, () => now || Date.now(), () => null);
}
