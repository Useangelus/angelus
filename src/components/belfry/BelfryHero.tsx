"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState, useSyncExternalStore } from "react";
import { money, pct, move, tone } from "@/lib/format";
import { clock, span } from "@/lib/clock";
import { useClock } from "../useClock";
import s from "./hero.module.css";

const Belfry = dynamic(() => import("./Belfry"), { ssr: false, loading: () => <div className={s.loading} /> });

export interface HeroRow {
  ticker: string; name: string; close: number;
  bell: number | null; raw: number | null; lauds: number | null; terce: number | null; compline: number | null;
}

function useNarrow() {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia("(max-width: 900px)"); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia("(max-width: 900px)").matches,
    () => false,
  );
}

export default function BelfryHero({ rows, sessionLabel, refLabel, day }: { rows: HeroRow[]; sessionLabel: string; refLabel: string; day: boolean }) {
  const narrow = useNarrow();
  const now = useClock();
  const c = now ? clock(now) : null;
  const bells = useMemo(() => rows.map((r) => ({ ticker: r.ticker, gap: move(r.bell, r.close) })), [rows]);
  const loudest = useMemo(() => bells.slice().sort((a, b) => Math.abs(b.gap ?? 0) - Math.abs(a.gap ?? 0))[0]?.ticker ?? null, [bells]);
  const [picked, setPicked] = useState<string | null>(null);
  const sel = picked ?? loudest;
  const r = rows.find((x) => x.ticker === sel);
  const gap = r ? move(r.bell, r.close) : null;

  const state = !c ? "" : c.phase === "regular"
    ? "Wall Street is trading. The bells hang still until the closing bell."
    : c.locked
      ? `04:00 ET has passed. The bells have stopped: tonight's numbers are locked. The opening bell rings in ${span(c.openAt - c.now)}.`
      : `The bells swing until 04:00 ET, ${span(c.lockAt - c.now)} from now. Then they stop and tonight's numbers are locked.`;

  return (
    <section className={s.hero} aria-label="The belfry: one bell per stock">
      <div className={s.stage}>
        <Belfry bells={bells} selected={sel} onSelect={setPicked} focusY={narrow ? 0.43 : 0.22} fill={narrow ? 0.8 : 0.42} />
        <div className={s.fade} aria-hidden />
      </div>

      <div className={`wrap ${s.over}`}>
        <div className={s.copy}>
          <p className="label">Robinhood Chain · tokenized stocks · after hours</p>
          {day
            ? <h1 className={s.h1}><span>Wall Street is <em>open.</em></span><span>Last night is being graded.</span></h1>
            : <h1 className={s.h1}><span>Wall Street is <em>asleep.</em></span><span>Its stocks are not.</span></h1>}
          <p className={s.legend}>
            Sixteen bells, one for each stock that keeps trading on-chain after the close. A bell swings as far as its token has moved from the last official close, and leans the way it moved.
          </p>
          <p className={s.state}>{state}</p>
          <div className={s.ctas}>
            <Link href="/board" className="btn">Tonight&apos;s board <span className="arr">→</span></Link>
            <Link href="/calls" className="btn ghost">Make your call</Link>
          </div>
        </div>

        {r && (
          <aside className={s.panel} aria-live="polite">
            <div className={s.pHead}>
              <span className={s.pTk}>{r.ticker}</span>
              <span className="label">{r.name}</span>
            </div>
            <p className="label" style={{ margin: "10px 0 2px" }}>The Bell for {sessionLabel}</p>
            <p className={s.pBell}>{money(r.bell)}</p>
            <p className={`num ${tone(gap)}`} style={{ margin: "2px 0 12px", fontSize: 13 }}>{pct(gap)} vs close {money(r.close)} · {refLabel}</p>
            <dl className={s.pGrid}>
              <div><dt>On-chain</dt><dd>{money(r.raw)}</dd></div>
              <div><dt>Lauds</dt><dd>{money(r.lauds)}</dd></div>
              <div><dt>Terce</dt><dd>{money(r.terce)}</dd></div>
              <div><dt>Compline</dt><dd>{money(r.compline)}</dd></div>
            </dl>
            <Link href={`/s/${r.ticker}`} className={s.pLink}>Open {r.ticker} <span>→</span></Link>
          </aside>
        )}
      </div>
    </section>
  );
}
