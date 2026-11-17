"use client";

import { clock, span } from "@/lib/clock";
import { etDay, etTime } from "@/lib/format";
import { useClock } from "./useClock";
import styles from "./horae.module.css";

// The night, drawn as a single line: closing bell → 04:00 lock → opening bell.

export default function Horae() {
  const now = useClock();
  if (!now) return <div className={styles.strip} style={{ height: 132 }} />;
  const c = clock(now);
  const day = c.phase === "regular";
  const a = day ? c.openAt : c.closeAt;
  const b = day ? c.closeAt : c.openAt;
  const at = (t: number) => Math.min(100, Math.max(0, ((t - a) / (b - a)) * 100));
  const nowX = at(now);

  // Midnight ticks across the span.
  const ticks: number[] = [];
  if (!day) {
    const h = 3600000;
    for (let t = Math.ceil(a / h) * h; t < b; t += h) {
      const hr = new Date(t).toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" });
      if (hr === "0") ticks.push(t);
    }
  }

  return (
    <div className={styles.strip}>
      <div className={styles.top}>
        <span className="label">{day ? "The trading day" : "The night"} · {etDay(a)} → {etDay(b)}</span>
        <span className="label">
          {day ? <>Closing bell in <b className={styles.b}>{span(c.closeAt - now)}</b></> :
            c.locked ? <>Numbers locked · opening bell in <b className={styles.b}>{span(c.openAt - now)}</b></> :
              <>Calls lock in <b className={styles.b}>{span(c.lockAt - now)}</b> · bell in <b className={styles.b}>{span(c.openAt - now)}</b></>}
        </span>
      </div>
      <div className={styles.track} aria-hidden>
        <div className={styles.past} style={{ width: `${nowX}%` }} />
        {ticks.map((t) => <span key={t} className={styles.tick} style={{ left: `${at(t)}%` }}><i>{etDay(t).split(",")[0]}</i></span>)}
        {!day && (
          <span className={`${styles.mark} ${styles.lock}`} style={{ left: `${at(c.lockAt)}%` }}>
            <i>04:00 lock</i>
          </span>
        )}
        <span className={`${styles.mark} ${styles.start}`} style={{ left: 0 }}><i>{day ? "09:30 open" : `${etTime(a).replace(" ET", "")} close`}</i></span>
        <span className={`${styles.mark} ${styles.end}`} style={{ left: "100%" }}><i>{day ? `${etTime(b).replace(" ET", "")} close` : "09:30 bell"}</i></span>
        <span className={styles.now} style={{ left: `${nowX}%` }}><i>{etTime(now)}</i></span>
      </div>
    </div>
  );
}
