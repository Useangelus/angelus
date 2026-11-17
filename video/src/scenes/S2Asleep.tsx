import { AbsoluteFill, useCurrentFrame } from "remotion";
import { mono } from "../fonts";
import { Label, Rise } from "../fx/Type";
import { inOut, ramp } from "../ease";
import { NIGHT } from "../data";
import { rng } from "../three/parts";
import { DUR } from "../motion";

// The exchange goes quiet: a tape of sixteen quotes stops ticking, then goes dark stock by stock.
export const S2_FRAMES = DUR.s2;
const CLOSE: Record<string, number> = {
  NVDA: 156.14, TSLA: 379.74, AAPL: 352.78, MSFT: 517.99, AMZN: 257.75, META: 626.41, GOOGL: 283.72, AMD: 504.28,
  PLTR: 160.39, COIN: 119.84, MSTR: 103.03, CRCL: 57.65, NFLX: 60.75, AVGO: 333.4, SPY: 739.95, QQQ: 661.75,
};
const FREEZE = 34;

function Tape() {
  const f = useCurrentFrame();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", rowGap: 34, columnGap: 20, width: 1640 }}>
      {NIGHT.map(({ ticker }, i) => {
        // Live quotes flicker until the close, then hold the closing print.
        const r = rng(i * 131 + Math.min(f, FREEZE) * 7);
        const px = f < FREEZE ? CLOSE[ticker] * (1 + (r() - 0.5) * 0.004) : CLOSE[ticker];
        const off = ramp(f, FREEZE + 10 + i * 3.2, FREEZE + 30 + i * 3.2);
        const on = ramp(f, 2 + i * 1.2, 16 + i * 1.2);
        const c = Math.round(242 - off * 190);
        return (
          <div key={ticker} style={{ fontFamily: mono, opacity: on, display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 17, letterSpacing: "0.18em", color: `rgb(${c - 40},${c - 40},${c - 40})` }}>{ticker}</span>
            <span style={{ fontSize: 30, letterSpacing: "-0.01em", color: `rgb(${c},${c},${c})` }}>{px.toFixed(2)}</span>
            <span style={{ height: 1, width: "100%", background: `rgba(255,255,255,${0.22 - off * 0.16})` }} />
          </div>
        );
      })}
    </div>
  );
}

export function S2Asleep() {
  const f = useCurrentFrame();
  const fadeIn = ramp(f, 0, 12);
  const fadeOut = 1 - ramp(f, DUR.s2 - 18, DUR.s2, 0, 1, inOut);
  const tapeOut = 1 - ramp(f, 116, 150, 0, 1, inOut);
  return (
    <AbsoluteFill style={{ background: "#000", opacity: fadeIn * fadeOut }}>
      <AbsoluteFill style={{ padding: "120px 140px" }}>
        <Label text="The official close · 16 prints, held" at={6} size={20} outAt={156} />
        <div style={{ marginTop: 48, opacity: tapeOut, transform: `translateY(${(1 - tapeOut) * -20}px)` }}>
          <Tape />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 140px 150px" }}>
        <div>
          <Rise parts={[{ text: "Wall Street is" }]} at={78} size={150} outAt={164} />
        </div>
        <div style={{ marginTop: -6 }}>
          <Rise parts={[{ text: "asleep.", italic: true }]} at={90} size={150} dur={34} outAt={166} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
