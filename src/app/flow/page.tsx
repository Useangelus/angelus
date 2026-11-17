import { TickerCell } from "@/components/BellGlyph";
import SkyBand from "@/components/belfry/SkyBand";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import { getBoard } from "@/lib/live";
import { compact, pct, tone, move } from "@/lib/format";

export const revalidate = 60;
export const metadata: Metadata = pageMeta({ title: "Flow", description: "Who is buying stock tokens on Robinhood Chain while Wall Street is closed.", path: "/flow" });

function Lean({ v }: { v: number | null }) {
  if (v == null) return <span className="faint">—</span>;
  const w = Math.min(1, Math.abs(v)) * 50;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <span style={{ position: "relative", width: 100, height: 8, borderLeft: "1px solid var(--rule)", borderRight: "1px solid var(--rule)", display: "inline-block" }}>
        <span style={{ position: "absolute", left: "50%", top: -3, bottom: -3, width: 1, background: "var(--rule-2)" }} />
        <span style={{ position: "absolute", top: 1, height: 6, background: v >= 0 ? "var(--up)" : "var(--down)", left: v >= 0 ? "50%" : `${50 - w}%`, width: `${w}%` }} />
      </span>
      <span className={tone(v)}>{v >= 0 ? "+" : ""}{(v * 100).toFixed(0)}</span>
    </span>
  );
}

export default async function FlowPage() {
  const b = await getBoard();
  const rows = b.rows.map((r) => {
    const rh = r.pairs.filter((p) => p.chain === "robinhood" && p.liq >= 5000);
    const sum = (f: (p: (typeof rh)[number]) => number) => rh.reduce((a, p) => a + f(p), 0);
    const b6 = sum((p) => p.buys.h6), s6 = sum((p) => p.sells.h6), b1 = sum((p) => p.buys.h1), s1 = sum((p) => p.sells.h1);
    const vol = sum((p) => p.vol24), liq = sum((p) => p.liq);
    const rhq = r.chains.find((c) => c.chain === "robinhood")?.price ?? null;
    const others = r.chains.filter((c) => c.chain !== "robinhood");
    const otherPx = others.length ? others.reduce((a, c) => a + c.price * c.liq, 0) / others.reduce((a, c) => a + c.liq, 0) : null;
    return {
      ticker: r.ticker, name: r.name, gap: move(r.est.bell, r.close), vol, liq, turnover: liq ? vol / liq : null,
      lean6: b6 + s6 >= 10 ? (b6 - s6) / (b6 + s6) : null,
      lean1: b1 + s1 >= 5 ? (b1 - s1) / (b1 + s1) : null,
      trades: b6 + s6,
      premium: move(rhq, otherPx),
    };
  }).sort((a, c) => (c.turnover ?? 0) - (a.turnover ?? 0));

  return (
    <>
    <SkyBand>
      <header className="wrap grid-2" style={{ paddingBottom: 48 }}>
        <div>
          <p className="label" style={{ marginBottom: 18 }}>Flow · Robinhood Chain</p>
          <h1 className="h2">Who is trading <em>while the floor is dark.</em></h1>
        </div>
        <div className="prose" style={{ alignSelf: "end" }}>
          <p className="mute">
            Buy and sell counts across every Robinhood Chain pool for each stock token, the last 24 hours of volume against pool depth, and whether the token trades rich or cheap
            to the same stock on Solana and Ethereum. This is a reading of the tape, not a signal to trade.
          </p>
        </div>
      </header>
    </SkyBand>
    <div className="wrap">
      <div className="scroll-x">
        <table className="ledger">
          <thead><tr><th>Stock</th><th>Trades 6h</th><th>Lean 6h</th><th>Lean 1h</th><th>Volume 24h</th><th>Depth</th><th>Turnover</th><th>vs other chains</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.ticker}>
                <td><TickerCell ticker={r.ticker} name={r.name} gap={r.gap} href={`/s/${r.ticker}`} /></td>
                <td>{r.trades.toLocaleString("en-US")}</td>
                <td><Lean v={r.lean6} /></td>
                <td><Lean v={r.lean1} /></td>
                <td>{compact(r.vol)}</td>
                <td className="mute">{compact(r.liq)}</td>
                <td>{r.turnover != null ? `${r.turnover.toFixed(2)}×` : "—"}</td>
                <td className={tone(r.premium)}>{pct(r.premium, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note" style={{ marginTop: 18, maxWidth: "52em" }}>
        Lean = (buys − sells) / (buys + sells) by trade count, from −100 to +100; blank when there were too few trades to mean anything. Turnover = 24h volume divided by pool depth.
        &quot;vs other chains&quot; compares the Robinhood Chain price with the depth-weighted price on Solana and Ethereum.
      </p>
    </div>
    </>
  );
}
