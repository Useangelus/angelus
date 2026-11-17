import { AbsoluteFill, useCurrentFrame } from "remotion";
import { mono, serif, serifItalic } from "../fonts";
import { Label, Rise } from "../fx/Type";
import { inOut, out, ramp } from "../ease";
import { rng } from "../three/parts";
import { DUR } from "../motion";

// How the Bell is cast: three chains trade the stock all night; three agents read them; one number speaks.
export const S4_FRAMES = DUR.s4;
const N = 140;
const X0 = 1010, X1 = 1600, Y0 = 250, Y1 = 690;
const LOCK_X = 12 / 17.5; // 04:00 sits 12 h into the 17.5 h night

function walk(seed: number, vol: number, drift: number, stale = 0): number[] {
  const r = rng(seed);
  const out: number[] = [];
  let v = 0;
  for (let i = 0; i < N; i++) {
    if (!(stale && r() < stale)) v += (r() - 0.5) * vol + drift;
    out.push(v);
  }
  return out;
}

const RH = walk(7, 0.34, -0.022);
const SOL = RH.map((v, i) => v + Math.sin(i / 9) * 0.35 + (rng(i + 50)() - 0.5) * 0.25);
const ETH = walk(19, 0.3, -0.006, 0.55).map((v) => v + 0.6);
const BELL = RH.map((v, i) => 0.5 * v + 0.32 * SOL[i] + 0.18 * ETH[i] - 0.05 * (i / N));
const ALL = [...RH, ...SOL, ...ETH, ...BELL];

/** End-of-line label positions, pushed apart so no two are closer than 28 px. */
function labelYs(ys: number[]): number[] {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  const out = new Array<number>(ys.length);
  let last = -Infinity;
  for (const o of order) {
    const y = Math.max(o.y, last + 28);
    out[o.i] = y;
    last = y;
  }
  return out;
}
const LO = Math.min(...ALL), HI = Math.max(...ALL);
const xy = (i: number, v: number) => [X0 + (i / (N - 1)) * (X1 - X0), Y0 + (1 - (v - LO) / (HI - LO)) * (Y1 - Y0)] as const;
const path = (s: number[]) => s.map((v, i) => `${i ? "L" : "M"}${xy(i, v)[0].toFixed(1)},${xy(i, v)[1].toFixed(1)}`).join(" ");

function Line({ d, p, w, color, dash }: { d: string; p: number; w: number; color: string; dash?: string }) {
  return <path d={d} fill="none" stroke={color} strokeWidth={w} pathLength={1} strokeDasharray={dash ?? `${p} 1`} strokeLinecap="round" strokeLinejoin="round" style={dash ? { clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` } : undefined} />;
}

const AGENTS = [
  { name: "Lauds", line: "Every chain is a witness. Ask all of them." },
  { name: "Terce", line: "Most of a stock's night is the market's night." },
  { name: "Compline", line: "Night books misjudge the size of a move." },
];

export function S4Agents() {
  const f = useCurrentFrame();
  const draw = ramp(f, 40, 170, 0, 1, inOut);
  const bell = ramp(f, 206, 266, 0, 1, out);
  const chainsDim = 1 - 0.6 * ramp(f, 206, 240);
  const fadeIn = ramp(f, 0, 12);
  const fadeOut = 1 - ramp(f, DUR.s4 - 20, DUR.s4, 0, 1, inOut);
  const end = xy(N - 1, BELL[N - 1]);
  const ends = [
    { s: RH, label: "Robinhood Chain" },
    { s: SOL, label: "Solana" },
    { s: ETH, label: "Ethereum" },
  ];
  return (
    <AbsoluteFill style={{ background: "#000", opacity: fadeIn * fadeOut }}>
      {/* left: the words */}
      <AbsoluteFill style={{ padding: "150px 0 0 140px", width: 860 }}>
        <Label text="How the Bell is cast" at={4} size={19} />
        <div style={{ marginTop: 34 }}>
          <Rise parts={[{ text: "Three agents read the night." }]} at={12} size={64} stagger={3} />
        </div>
        <div style={{ marginTop: 4 }}>
          <Rise parts={[{ text: "One bell speaks for them.", italic: true }]} at={206} size={64} stagger={3} />
        </div>
        <div style={{ marginTop: 56, display: "flex", flexDirection: "column", gap: 26 }}>
          {AGENTS.map((a, i) => {
            const p = ramp(f, 120 + i * 24, 150 + i * 24);
            const dim = 1 - 0.55 * ramp(f, 206, 240);
            return (
              <div key={a.name} style={{ display: "grid", gridTemplateColumns: "170px 1fr", alignItems: "baseline", opacity: p * dim, transform: `translateX(${(1 - p) * -16}px)` }}>
                <span style={{ fontFamily: serifItalic, fontStyle: "italic", fontSize: 40, color: "#f2f2f2" }}>{a.name}</span>
                <span style={{ fontFamily: serif, fontSize: 26, color: "#9d9d9d", lineHeight: 1.3 }}>{a.line}</span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      {/* right: the night, as three chains trade it */}
      <AbsoluteFill>
        <svg width="1920" height="1080">
          <g opacity={ramp(f, 24, 50)}>
            <line x1={X0} x2={X1} y1={Y1 + 40} y2={Y1 + 40} stroke="rgba(255,255,255,0.25)" />
            {[0, 0.25, 0.5, 0.75, 1].map((q) => (
              <line key={q} x1={X0 + q * (X1 - X0)} x2={X0 + q * (X1 - X0)} y1={Y1 + 34} y2={Y1 + 46} stroke="rgba(255,255,255,0.3)" />
            ))}
            <text x={X0} y={Y1 + 78} fill="#7d7d7d" fontFamily={mono} fontSize={16} letterSpacing="3">16:00 CLOSE</text>
            <line x1={X0 + LOCK_X * (X1 - X0)} x2={X0 + LOCK_X * (X1 - X0)} y1={Y0 - 30} y2={Y1 + 40} stroke="rgba(255,255,255,0.28)" strokeDasharray="4 6" />
            <text x={X0 + LOCK_X * (X1 - X0)} y={Y0 - 44} fill="#bdbdbd" fontFamily={mono} fontSize={16} letterSpacing="3" textAnchor="middle">04:00 LOCK</text>
            <text x={X1} y={Y1 + 78} fill="#7d7d7d" fontFamily={mono} fontSize={16} letterSpacing="3" textAnchor="end">09:30 OPEN</text>
          </g>
          <g opacity={chainsDim}>
            <Line d={path(ETH)} p={draw} w={2} color="rgba(255,255,255,0.45)" />
            <Line d={path(SOL)} p={draw} w={2} color="rgba(255,255,255,0.7)" />
            <Line d={path(RH)} p={draw} w={2.4} color="rgba(255,255,255,0.95)" />
          </g>
          {labelYs(ends.map((e) => xy(N - 1, e.s[N - 1])[1])).map((ly, i) => {
            const { label } = ends[i];
            const x = xy(N - 1, 0)[0];
            return (
              <text key={label} x={x + 18} y={ly + 6} fill="#a5a5a5" fontFamily={mono} fontSize={15} letterSpacing="2.5" opacity={ramp(f, 165 + i * 6, 185 + i * 6) * chainsDim}>
                {label.toUpperCase()}
              </text>
            );
          })}
          <Line d={path(BELL)} p={bell} w={5} color="#ffffff" />
          <circle cx={end[0]} cy={end[1]} r={9 * ramp(f, 262, 276, 0, 1, out)} fill="#fff" />
          <text x={end[0] - 14} y={end[1] - 26} fill="#fff" fontFamily={mono} fontSize={20} letterSpacing="3" textAnchor="end" opacity={ramp(f, 266, 286)}>
            THE BELL
          </text>
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
