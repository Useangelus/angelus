"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import SoundToggle from "./SoundToggle";
import Social from "./Social";
import dynamic from "next/dynamic";
import { clock, span } from "@/lib/clock";
import { useClock } from "./useClock";
import { etTime } from "@/lib/format";

const Mark3D = dynamic(() => import("./Mark3D"), { ssr: false, loading: () => <span style={{ width: 30, height: 30, display: "inline-block" }} /> });

const NAV = [
  ["/board", "Board"],
  ["/record", "Record"],
  ["/calls", "Calls"],
  ["/edition", "Edition"],
  ["/watch", "Night Watch"],
  ["/flow", "Flow"],
  ["/docs", "Method"],
  ["/token", "$ANGELUS"],
] as const;

export default function Masthead() {
  const path = usePathname();
  // The menu belongs to the page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === path;
  const setOpen = (f: (o: boolean) => boolean) => setOpenOn(f(open) ? path : null);
  // Escape closes the open menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenOn(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const now = useClock();
  const c = now ? clock(now) : null;

  // What the next moment is, said in full: the label names the event and its time, the value counts down to it.
  let label = "", hint = "";
  if (c) {
    if (c.phase === "regular") {
      label = `Closing bell · ${etTime(c.closeAt)}`;
      hint = "Wall Street is open and trading. At the closing bell, calls for the next open start.";
    } else if (c.locked) {
      label = "Opening bell · 09:30 ET";
      hint = "Tonight's numbers and calls are locked. The official open settles them.";
    } else {
      label = "Calls close · 04:00 ET";
      hint = "Until 04:00 ET you can call over or under the Bell. Then tonight's numbers are locked for scoring.";
    }
  }
  const target = c ? (c.phase === "regular" ? c.closeAt : c.locked ? c.openAt : c.lockAt) : 0;

  return (
    <header className="mast">
      <div className="wrap mast-in">
        <Link href="/" className="brand" aria-label="ANGELUS home">
          <Mark3D size={30} interactive={false} label="" />
          <span className="brand-word">ANGELUS</span>
        </Link>
        <nav className={`nav${open ? " open" : ""}`} aria-label="Main">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} aria-current={path.startsWith(href) ? "page" : undefined}>{label}</Link>
          ))}
          <SoundToggle inMenu />
          <Social labels className="social-menu" />
        </nav>
        <Link href="/docs#clock" className="mast-bell" title={hint} aria-label={c ? `${label}, in ${span(target - c.now)}. ${hint}` : undefined}>
          <span className={`dot${c?.phase === "regular" ? "" : " off"}`} />
          {c ? (
            <span className="mast-bell-txt">
              <span className="mast-bell-label">{label}</span>
              <b>in {span(target - c.now)}</b>
            </span>
          ) : <span>&nbsp;</span>}
        </Link>
        <Social className="social-head" />
        <SoundToggle />
        <ThemeToggle />
        <button className="menu-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{open ? "Close" : "Menu"}</button>
      </div>
    </header>
  );
}
