import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import SkyBand from "@/components/belfry/SkyBand";
import { getBoard } from "@/lib/live";
import Watch from "@/components/Watch";

export const revalidate = 60;
export const metadata: Metadata = pageMeta({ title: "Night Watch", description: "How much overnight gap a stock-token loan can take before the opening bell liquidates it.", path: "/watch" });

export default async function WatchPage() {
  const b = await getBoard();
  const rows = b.rows.map((r) => {
    const gaps: number[] = [];
    for (let i = 1; i < r.days.length; i++) gaps.push(r.days[i].open / r.days[i - 1].close - 1);
    return { ticker: r.ticker, name: r.name, close: r.close, bell: r.est.bell, raw: r.est.raw, gaps };
  });
  return (
    <>
    <SkyBand>
      <header className="wrap grid-2" style={{ paddingBottom: 48 }}>
        <div>
          <p className="label" style={{ marginBottom: 18 }}>Night Watch</p>
          <h1 className="h2">Borrowed against a stock? <em>Mind the gap.</em></h1>
        </div>
        <div className="prose" style={{ alignSelf: "end" }}>
          <p className="mute">
            A loan backed by a stock token is priced all night, but the real price only resets at 09:30 ET. A bad open can jump straight through your liquidation price before anyone can react.
            Night Watch shows where that line sits, what the Bell implies for your health at the open, and how often this stock has gapped that far.
          </p>
        </div>
      </header>
    </SkyBand>
    <div className="wrap">
      <section style={{ borderTop: "1px solid var(--rule-2)", paddingTop: 40 }}>
        <Watch rows={rows} />
      </section>
    </div>
    </>
  );
}
