"use client";

import { useEffect, useState } from "react";
import { clock, span } from "@/lib/clock";
import { dayLabel } from "@/lib/clock";
import { etTime } from "@/lib/format";
import { useClock } from "./useClock";

type Seal = { session: string; tx: string | null; at: number } | null;
type Health = { status: string; checks: Record<string, { ok: boolean }> } | null;

const SOURCE_NAMES: Record<string, string> = { dexscreener: "pool prices", officialPrices: "official prices", storage: "storage", nightlyLock: "nightly lock" };

/**
 * The tower, right now: the next moment of the night, the last seal on Robinhood Chain, the contract,
 * and whether every source is answering. Shown at the foot of every page.
 */
export default function FootStatus({ seal, contract, explorer }: { seal: Seal; contract: string; explorer: string }) {
  const now = useClock();
  const c = now ? clock(now) : null;
  const [health, setHealth] = useState<Health>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/health", { cache: "no-store" })
        .then((r) => r.json())
        .then((h) => alive && setHealth(h))
        .catch(() => alive && setHealth({ status: "unreachable", checks: {} }));
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  let label = "", target = 0;
  if (c) {
    if (c.phase === "regular") { label = `Closing bell · ${etTime(c.closeAt)}`; target = c.closeAt; }
    else if (c.locked) { label = "Opening bell · 09:30 ET"; target = c.openAt; }
    else { label = "The lock · 04:00 ET"; target = c.lockAt; }
  }
  const down = health ? Object.entries(health.checks).filter(([, v]) => !v.ok).map(([k]) => SOURCE_NAMES[k] ?? k) : [];
  const ok = health?.status === "ok" && down.length === 0;
  const short = (s: string) => `${s.slice(0, 6)}…${s.slice(-4)}`;

  return (
    <div className="foot-status" aria-label="The tower, right now">
      <div>
        <span className="label">Next</span>
        <span className="fs-v">{c ? `in ${span(target - c.now)}` : " "}</span>
        <span className="fs-s">{label || " "}</span>
      </div>
      <div>
        <span className="label">Last seal</span>
        {seal ? (
          <>
            <span className="fs-v"><a href={`/verify?session=${seal.session}`} className="u" style={{ fontFamily: "var(--f-serif)", fontSize: "inherit" }}>{dayLabel(seal.session)}</a></span>
            <span className="fs-s">{seal.tx ? <a href={`${explorer}/tx/${seal.tx}`} target="_blank" rel="noreferrer" className="u">tx {short(seal.tx)}</a> : "on Robinhood Chain"}</span>
          </>
        ) : (
          <>
            <span className="fs-v">Next 04:00 ET</span>
            <span className="fs-s">the first seal</span>
          </>
        )}
      </div>
      <div>
        <span className="label">Contract</span>
        {contract ? (
          <>
            <span className="fs-v"><a href={`${explorer}/address/${contract}`} target="_blank" rel="noreferrer" className="u">{short(contract)}</a></span>
            <span className="fs-s">BellRegistry · chain 4663</span>
          </>
        ) : (
          <>
            <span className="fs-v">Not live yet</span>
            <span className="fs-s">locks published at /api/bell.json</span>
          </>
        )}
      </div>
      <div>
        <span className="label">Sources</span>
        <span className="fs-v"><span className={`dot${ok ? "" : " off"}`} style={{ marginRight: 10, verticalAlign: "middle" }} />{health ? (ok ? "All answering" : down.length ? `${down.length} down` : "Checking") : "Checking"}</span>
        <span className="fs-s">{health ? (ok ? "pools · official prices · storage" : down.join(" · ") || health.status) : " "}</span>
      </div>
    </div>
  );
}
