"use client";

import { useSyncExternalStore } from "react";

// Dark / light switch. The choice lives on <html data-theme> and in localStorage,
// so it survives reloads and every page reads the same value before paint.

type Theme = "dark" | "light";
const subs = new Set<() => void>();

function current(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function set(t: Theme) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem("angelus-theme", t); } catch { /* private mode */ }
  subs.forEach((s) => s());
  window.dispatchEvent(new CustomEvent("angelus-theme", { detail: t }));
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => { subs.add(cb); return () => { subs.delete(cb); }; },
    current,
    () => "light",
  );
}

export default function ThemeToggle() {
  const theme = useTheme();
  const next: Theme = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="theme-btn"
      onClick={() => set(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        <circle cx="9" cy="9" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 1.75a7.25 7.25 0 0 1 0 14.5Z" fill="currentColor" />
      </svg>
      <span className="theme-label">{theme === "dark" ? "Dark" : "Light"}</span>
    </button>
  );
}
