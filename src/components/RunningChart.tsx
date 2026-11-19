import { dayLabel } from "@/lib/clock";

type Pt = { session: string; errs: number[] };

/**
 * The record over time: the running average miss of the Bell against "it opens where it closed", one point per
 * morning. The gap between the two lines is what the night is worth. Drawn on the server, no script.
 */
export default function RunningChart({ bell, flat, width = 1184, height = 300 }: { bell: Pt[]; flat: Pt[]; width?: number; height?: number }) {
  const sessions = bell.map((b) => b.session);
  const run = (pts: Pt[]) => {
    let sum = 0, n = 0;
    return sessions.map((s) => {
      // every graded open counts once, so the last point equals the record's average miss
      for (const e of pts.find((p) => p.session === s)?.errs ?? []) { sum += e; n++; }
      return n ? sum / n : null;
    });
  };
  const b = run(bell), f = run(flat);
  const vals = [...b, ...f].filter((v): v is number => v != null);
  if (sessions.length < 2 || !vals.length) return null;
  const pad = { l: 8, r: 70, t: 24, b: 34 };
  const hi = Math.ceil(Math.max(...vals) / 50) * 50, lo = 0;
  const x = (i: number) => pad.l + (i / (sessions.length - 1)) * (width - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (height - pad.t - pad.b);
  const line = (s: (number | null)[]) => s.map((v, i) => (v == null ? "" : `${i && s[i - 1] != null ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)).join(" ");
  const band = b.map((v, i) => (v == null || f[i] == null ? null : i)).filter((i): i is number => i != null);
  const area = band.length ? `M${band.map((i) => `${x(i).toFixed(1)},${y(f[i]!).toFixed(1)}`).join(" L")} L${band.slice().reverse().map((i) => `${x(i).toFixed(1)},${y(b[i]!).toFixed(1)}`).join(" L")} Z` : "";
  const lastB = b[b.length - 1], lastF = f[f.length - 1];
  const ticks = [0, hi / 2, hi];
  return (
    <figure className="run-chart" style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={`Running average miss: the Bell ${lastB?.toFixed(1)} bp against ${lastF?.toFixed(1)} bp for opens where it closed, over ${sessions.length} mornings`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke="var(--rule)" />
            <text x={pad.l} y={y(t) - 6} fontFamily="var(--f-mono)" fontSize="11" fill="var(--faint)">{t} bp</text>
          </g>
        ))}
        {area ? <path d={area} fill="var(--wash)" /> : null}
        <path d={line(f)} fill="none" stroke="var(--mute)" strokeWidth="1.5" strokeDasharray="4 5" />
        <path d={line(b)} fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" />
        {lastF != null ? <text x={x(sessions.length - 1) + 10} y={y(lastF) + 4} fontFamily="var(--f-mono)" fontSize="12" fill="var(--mute)">{lastF.toFixed(1)}</text> : null}
        {lastB != null ? <text x={x(sessions.length - 1) + 10} y={y(lastB) + 4} fontFamily="var(--f-mono)" fontSize="12" fontWeight="500" fill="var(--ink)">{lastB.toFixed(1)}</text> : null}
        <text x={pad.l} y={height - 10} fontFamily="var(--f-mono)" fontSize="11" fill="var(--faint)">{dayLabel(sessions[0])}</text>
        <text x={width - pad.r} y={height - 10} textAnchor="end" fontFamily="var(--f-mono)" fontSize="11" fill="var(--faint)">{dayLabel(sessions[sessions.length - 1])}</text>
      </svg>
      <figcaption className="note" style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 10 }}>
        <span><span style={{ display: "inline-block", width: 22, height: 0, borderTop: "2.5px solid var(--ink)", verticalAlign: "middle", marginRight: 8 }} />The Bell, running average miss</span>
        <span><span style={{ display: "inline-block", width: 22, height: 0, borderTop: "1.5px dashed var(--mute)", verticalAlign: "middle", marginRight: 8 }} />Opens where it closed</span>
        <span>Shaded: the gap between the two.</span>
      </figcaption>
    </figure>
  );
}
