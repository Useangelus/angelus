import { nyTime, closeMinutes, type ClockState } from "@/lib/clock";
import type { DayBar } from "@/lib/sources";
import { money } from "@/lib/format";

// The token's hourly price across the last few days and nights, with the official
// opens (filled) and closes (hollow) pinned on top, and tonight's Bell at the right edge.

export default function NightChart({
  candles, days, bell, clock, width = 1180, height = 340,
}: {
  candles: number[][];
  days: DayBar[];
  bell: number | null;
  clock: ClockState;
  width?: number;
  height?: number;
}) {
  const from = clock.now - 6 * 86400000;
  const to = clock.phase === "regular" ? clock.closeAt : clock.openAt;
  const pts = candles.filter((c) => (c[0] + 3600) * 1000 >= from).map((c) => [(c[0] + 3600) * 1000, c[4]] as const);
  const marks = days
    .filter((d) => +nyTime(d.date, 9, 30) >= from)
    .flatMap((d) => [
      { t: +nyTime(d.date, 9, 30), v: d.open, kind: "open" as const },
      { t: +nyTime(d.date, 0, closeMinutes(d.date)), v: d.close, kind: "close" as const },
    ])
    .filter((m) => m.t <= clock.now);
  const vals = [...pts.map((p) => p[1]), ...marks.map((m) => m.v), ...(bell ? [bell] : [])];
  if (pts.length < 2) return <p className="note" style={{ padding: "40px 0", borderTop: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)" }}>The hourly history source is busy. The chart comes back within a few minutes; every number on this page is live.</p>;
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo) * 0.12 || 1;
  // Narrow charts (phones) are drawn in a smaller viewBox, so text and marks scale up with them.
  const fs = width < 800 ? 20 : 11, dot = width < 800 ? 7 : 4, sw = width < 800 ? 2.2 : 1.3;
  const L = 0, R = width - fs * 7.2, T = 16, B = height - fs * 2.7;
  const x = (t: number) => L + ((t - from) / (to - from)) * (R - L);
  const y = (v: number) => B - ((v - (lo - pad)) / (hi + pad - (lo - pad))) * (B - T);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join("");
  const sessions = days.filter((dd) => +nyTime(dd.date, 9, 30) >= from - 86400000);
  const grid = [lo, (lo + hi) / 2, hi];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="Hourly on-chain price with official opens and closes" style={{ display: "block", overflow: "visible" }}>
      {sessions.map((s) => {
        const a = Math.max(x(+nyTime(s.date, 9, 30)), L), b2 = Math.min(x(+nyTime(s.date, 0, closeMinutes(s.date))), R);
        return b2 > a ? <rect key={s.date} x={a} y={T} width={b2 - a} height={B - T} fill="var(--wash)" /> : null;
      })}
      {grid.map((g) => (
        <g key={g}>
          <line x1={L} x2={R} y1={y(g)} y2={y(g)} stroke="var(--rule)" />
          <text x={R + fs * 0.7} y={y(g) + fs * 0.35} fontSize={fs} fill="var(--faint)" fontFamily="var(--f-mono)">{money(g)}</text>
        </g>
      ))}
      <path d={d} fill="none" stroke="var(--ink)" strokeWidth={sw} strokeLinejoin="round" />
      {marks.map((m) => (
        <circle key={m.t + m.kind} cx={x(m.t)} cy={y(m.v)} r={dot} fill={m.kind === "open" ? "var(--bronze)" : "var(--bg)"} stroke="var(--bronze)" strokeWidth={sw} />
      ))}
      {bell != null && clock.phase !== "regular" && (
        <g>
          <line x1={x(clock.now)} x2={R} y1={y(bell)} y2={y(bell)} stroke="var(--bronze)" strokeDasharray="3 4" />
          <path d={`M${R - 6},${y(bell) - 7} L${R},${y(bell)} L${R - 6},${y(bell) + 7}`} fill="none" stroke="var(--bronze)" />
          <text x={R + fs * 0.7} y={y(bell) - fs * 0.7} fontSize={fs} fill="var(--bronze)" fontFamily="var(--f-mono)">BELL</text>
          <text x={R + fs * 0.7} y={y(bell) + fs * 0.6} fontSize={fs + 1} fill="var(--bronze)" fontFamily="var(--f-mono)">{money(bell)}</text>
        </g>
      )}
      <line x1={x(clock.now)} x2={x(clock.now)} y1={T} y2={B} stroke="var(--verd)" strokeWidth={1} />
      {sessions.map((s) => {
        const xx = x(+nyTime(s.date, 9, 30));
        return xx >= L && xx <= R ? (
          <text key={s.date} x={xx} y={height - fs * 0.7} fontSize={fs} fill="var(--faint)" fontFamily="var(--f-mono)">
            {new Date(s.date + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", day: "numeric", timeZone: "UTC" }).toUpperCase()}
          </text>
        ) : null;
      })}
    </svg>
  );
}
