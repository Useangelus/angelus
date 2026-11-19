"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const Belfry = dynamic(() => import("./belfry/Belfry"), { ssr: false, loading: () => <div style={{ position: "absolute", inset: 0 }} /> });

export interface ReplayData {
  session: string;
  prevDay: string;
  start: number;
  lock: number;
  end: number;
  hours: number[];
  live: boolean;
  stocks: { ticker: string; name: string; close: number; bell: number | null; open: number; gaps: (number | null)[] }[];
}

const RUN_MS = 26_000; // the whole night, played at 1x
const et = (t: number, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", ...o }).format(t);
const pct = (g: number | null) => (g == null ? "—" : `${g > 0 ? "+" : ""}${(g * 100).toFixed(2)}%`);
const bpOf = (a: number, b: number) => Math.abs(a / b - 1) * 10000;

/** The gap of every stock at time t, read between the two half-hour frames around it. */
function gapsAt(d: ReplayData, t: number): (number | null)[] {
  const h = d.hours;
  let i = 0;
  while (i < h.length - 2 && h[i + 1] <= t) i++;
  const k = Math.min(1, Math.max(0, (t - h[i]) / (h[i + 1] - h[i])));
  return d.stocks.map((s) => {
    const a = s.gaps[i], b = s.gaps[i + 1];
    if (a == null) return b;
    if (b == null) return a;
    return a + (b - a) * k;
  });
}

/**
 * One night, replayed: the belfry swings as each stock's token moved, hour by hour, under the sky of that hour.
 * At 04:00 ET the bells stop (the lock); at 09:30 ET the official open grades every Bell.
 */
export default function ReplayPlayer({ data, sessions }: { data: ReplayData; sessions: string[] }) {
  const router = useRouter();
  const [p, setP] = useState(0); // 0..1 through the night
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const pRef = useRef(0);
  const driver = useRef<{ gaps: (number | null)[]; at: number; swinging: boolean } | null>({ gaps: gapsAt(data, data.start), at: data.start, swinging: true });
  const bells = useMemo(() => data.stocks.map((s) => ({ ticker: s.ticker, gap: s.gaps.find((g) => g != null) ?? null })), [data]);
  const t = data.start + (data.end - data.start) * p;

  // drive the tower every frame; refresh the page's numbers a few times a second
  useEffect(() => {
    let raf = 0, last = performance.now(), lastUi = 0;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (playing) {
        pRef.current = Math.min(1, pRef.current + (dt / RUN_MS) * speed);
        if (pRef.current >= 1) setPlaying(false);
      }
      const at = data.start + (data.end - data.start) * pRef.current;
      driver.current = { gaps: gapsAt(data, at), at, swinging: at < data.lock };
      if (now - lastUi > 66) { setP(pRef.current); lastUi = now; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, data]);

  // start once, when the page opens
  useEffect(() => {
    const id = setTimeout(() => setPlaying(true), 900);
    return () => clearTimeout(id);
  }, []);

  const seek = (v: number) => { pRef.current = v; setP(v); };
  const now = gapsAt(data, t);
  const locked = t >= data.lock;
  const opened = p >= 0.999;
  const phase = opened ? "The open · graded" : locked ? "Locked · 04:00 ET" : "Calls open · the tokens trade";
  const mark = (x: number) => `${((x - data.start) / (data.end - data.start)) * 100}%`;
  const graded = data.stocks.filter((s) => s.bell != null);
  const bellMiss = graded.reduce((a, s) => a + bpOf(s.bell!, s.open), 0) / Math.max(1, graded.length);
  const flatMiss = data.stocks.reduce((a, s) => a + bpOf(s.close, s.open), 0) / Math.max(1, data.stocks.length);
  const dayName = (s: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(`${s}T12:00:00Z`));

  return (
    <div className="replay">
      <div className="rp-stage">
        <Belfry bells={bells} selected={null} onSelect={() => {}} focusY={0.64} fill={0.6} showLabels={false} driver={driver} />
        <div className="rp-hud">
          <div>
            <span className="label">{et(t, { weekday: "short", month: "short", day: "numeric" })} · New York</span>
            <span className="rp-clock">{et(t, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}</span>
            <span className="label">{phase}</span>
          </div>
        </div>
      </div>

      <div className="wrap">
        <div className="rp-controls">
          <button type="button" className="btn" onClick={() => { if (p >= 0.999) seek(0); setPlaying((x) => !x); }} aria-label={playing ? "Pause" : "Play"}>
            {playing ? "Pause" : p >= 0.999 ? "Play again" : "Play"}
          </button>
          <button type="button" className="btn ghost" onClick={() => setSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1))} aria-label="Speed">{speed}×</button>
          <div className="rp-track">
            <input type="range" min={0} max={1000} value={Math.round(p * 1000)} onChange={(e) => { setPlaying(false); seek(Number(e.target.value) / 1000); }} aria-label="Time through the night" />
            <div className="rp-marks" aria-hidden>
              <span style={{ left: 0 }}>{et(data.start, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })} close</span>
              <span style={{ left: mark(data.lock - 4 * 3600_000) }}>00:00</span>
              <span style={{ left: mark(data.lock) }} className="rp-lock">04:00 lock</span>
              <span style={{ left: "100%" }} className="rp-end">09:30 open</span>
            </div>
          </div>
          <label className="rp-night">
            <span className="label">Night</span>
            <select value={data.session} onChange={(e) => router.push(`/replay/${e.target.value}`)}>
              {sessions.map((s) => (
                <option key={s} value={s}>{dayName(s)}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="rp-grid">
          {data.stocks.map((s, i) => {
            const g = now[i];
            const miss = s.bell != null ? bpOf(s.bell, s.open) : null;
            return (
              <Link key={s.ticker} href={`/s/${s.ticker}`} className="rp-cell">
                <span className="tk">{s.ticker}</span>
                <span className={`num ${g == null ? "" : g > 0.00005 ? "up" : g < -0.00005 ? "down" : ""}`}>{pct(g)}</span>
                <span className="rp-sub">{opened ? `opened ${pct(s.open / s.close - 1)}` : locked ? `Bell ${pct(s.bell == null ? null : s.bell / s.close - 1)}` : " "}</span>
                <span className="rp-sub">{opened ? `Bell missed ${miss == null ? "—" : `${miss.toFixed(0)} bp`}` : " "}</span>
              </Link>
            );
          })}
        </div>

        <div className={`rp-result ${opened ? "on" : ""}`} aria-live="polite">
          <span className="label">09:30 ET · {dayName(data.session)}{data.live ? " · locked live" : " · replayed from hourly history"}</span>
          <div className="rp-res-grid">
            <div><span className="lm-v">{bellMiss.toFixed(0)}<small> bp</small></span><span className="lm-s">the Bell&apos;s average miss</span></div>
            <div><span className="lm-v mute">{flatMiss.toFixed(0)}<small> bp</small></span><span className="lm-s">average miss of the prior close</span></div>
            <div><span className="lm-v">{graded.filter((s) => bpOf(s.bell!, s.open) < bpOf(s.close, s.open)).length}<small> of {graded.length}</small></span><span className="lm-s">stocks where the Bell beat the prior close</span></div>
          </div>
          <p className="note">Each move is the stock&apos;s token on its deepest chain, half hour by half hour, against the {dayName(data.prevDay)} close. <Link href={`/edition/${data.session}`} className="u">This night&apos;s edition</Link> · <Link href="/record" className="u">The record</Link></p>
        </div>
      </div>
    </div>
  );
}
