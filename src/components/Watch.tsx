"use client";

import { useMemo, useState } from "react";
import { money, pct } from "@/lib/format";

interface Row { ticker: string; name: string; close: number; bell: number | null; raw: number | null; gaps: number[] }

export default function Watch({ rows }: { rows: Row[] }) {
  const [ticker, setTicker] = useState(rows[0]?.ticker ?? "NVDA");
  const [units, setUnits] = useState("100");
  const [debt, setDebt] = useState("10000");
  const [lltv, setLltv] = useState("77");
  const r = rows.find((x) => x.ticker === ticker) ?? rows[0];

  const calc = useMemo(() => {
    const u = Number(units), d = Number(debt), l = Number(lltv) / 100;
    if (!r || !(u > 0) || !(d >= 0) || !(l > 0 && l < 1)) return null;
    const now = r.raw ?? r.close;
    const liq = d / (u * l);
    const hf = (u * now * l) / (d || 1e-9);
    const cushion = liq / r.close - 1; // gap from the close that would liquidate
    const worse = r.gaps.filter((g) => g <= cushion).length;
    return { now, liq, hf, cushion, worse, nights: r.gaps.length, bellHf: r.bell ? (u * r.bell * l) / (d || 1e-9) : null };
  }, [r, units, debt, lltv]);

  const bins = useMemo(() => {
    if (!r) return [];
    const lo = -0.08, hi = 0.08, n = 32, w = (hi - lo) / n;
    const b = Array.from({ length: n }, (_, i) => ({ x: lo + i * w, c: 0 }));
    for (const g of r.gaps) b[Math.min(n - 1, Math.max(0, Math.floor((g - lo) / w)))].c++;
    return b;
  }, [r]);
  const maxC = Math.max(1, ...bins.map((b) => b.c));
  const W = 640, H = 150;
  const gx = (g: number) => ((Math.max(-0.08, Math.min(0.08, g)) + 0.08) / 0.16) * W;

  const field = { background: "transparent", border: "1px solid var(--rule-2)", color: "var(--ink)", padding: "12px 12px", borderRadius: 2, fontFamily: "var(--f-mono)", fontSize: 15, width: "100%" } as const;

  return (
    <div className="grid-2" style={{ alignItems: "start" }}>
      <form onSubmit={(e) => e.preventDefault()} style={{ display: "grid", gap: 18 }}>
        <label style={{ display: "grid", gap: 8 }}>
          <span className="label">Collateral</span>
          <select value={ticker} onChange={(e) => setTicker(e.target.value)} style={field}>
            {rows.map((x) => <option key={x.ticker} value={x.ticker} style={{ background: "var(--bg)" }}>{x.ticker} · {x.name}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 8 }}>
          <span className="label">Tokens posted</span>
          <input inputMode="decimal" value={units} onChange={(e) => setUnits(e.target.value)} style={field} />
        </label>
        <label style={{ display: "grid", gap: 8 }}>
          <span className="label">Debt (USD)</span>
          <input inputMode="decimal" value={debt} onChange={(e) => setDebt(e.target.value)} style={field} />
        </label>
        <label style={{ display: "grid", gap: 8 }}>
          <span className="label">Liquidation LTV (%)</span>
          <input inputMode="decimal" value={lltv} onChange={(e) => setLltv(e.target.value)} style={field} />
        </label>
        <p className="note">Use the numbers from your lending market (for example a Morpho market on Robinhood Chain). Nothing here touches your wallet.</p>
      </form>

      <div>
        {calc && r ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, marginBottom: 32 }}>
              <div className="stat"><span className="label">Liquidated below</span><span className="v" style={{ color: "var(--down)" }}>{money(calc.liq)}</span></div>
              <div className="stat"><span className="label">Health now</span><span className="v">{calc.hf.toFixed(2)}</span></div>
              <div className="stat"><span className="label">Cushion vs close</span><span className="v">{pct(calc.cushion, 1)}</span></div>
              <div className="stat"><span className="label">Health at the Bell</span><span className="v" style={{ color: "var(--bronze)" }}>{calc.bellHf != null ? calc.bellHf.toFixed(2) : "—"}</span></div>
            </div>
            <svg viewBox={`0 0 ${W} ${H + 30}`} width="100%" role="img" aria-label={`Overnight gaps for ${r.ticker} with your liquidation line`}>
              {bins.map((b, i) => (
                <rect key={i} x={(i * W) / bins.length + 1} width={W / bins.length - 2} y={H - (b.c / maxC) * (H - 10)} height={(b.c / maxC) * (H - 10)} fill={b.x + 0.005 <= calc.cushion ? "var(--down)" : "var(--rule-2)"} />
              ))}
              <line x1={gx(0)} x2={gx(0)} y1={0} y2={H} stroke="var(--faint)" strokeDasharray="2 3" />
              {calc.cushion > -0.08 && calc.cushion < 0.08 && <line x1={gx(calc.cushion)} x2={gx(calc.cushion)} y1={0} y2={H} stroke="var(--down)" />}
              <text x={0} y={H + 20} fontSize="11" fill="var(--faint)" fontFamily="var(--f-mono)">−8%</text>
              <text x={gx(0) - 10} y={H + 20} fontSize="11" fill="var(--faint)" fontFamily="var(--f-mono)">0</text>
              <text x={W - 26} y={H + 20} fontSize="11" fill="var(--faint)" fontFamily="var(--f-mono)">+8%</text>
            </svg>
            <p style={{ fontSize: 19, lineHeight: 1.45, marginTop: 18 }}>
              {calc.cushion >= 0 ? (
                <>At the last close this position was already past its liquidation price.</>
              ) : (
                <>In the last {calc.nights} nights, {r.ticker} opened at least {pct(-calc.cushion, 1).replace("+", "")} below its prior close <b className="num">{calc.worse}</b> {calc.worse === 1 ? "time" : "times"}.
                  {calc.worse === 0 ? " Not once." : ` That is ${(calc.worse / calc.nights * 100).toFixed(1)}% of nights.`}</>
              )}
            </p>
            <p className="note">Bars: how far {r.ticker} opened from its prior close, night by night, over six months. Solid bars are gaps big enough to liquidate this position at the open; faint bars are the rest.</p>
          </>
        ) : <p className="note">Fill in the position to see its night.</p>}
      </div>
    </div>
  );
}
