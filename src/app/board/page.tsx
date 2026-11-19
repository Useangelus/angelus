import Link from "next/link";
import { TickerCell } from "@/components/BellGlyph";
import SkyBand from "@/components/belfry/SkyBand";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import { getBoard } from "@/lib/live";
import { CHAINS, type ChainId } from "@/lib/registry";
import { lausWitnesses } from "@/lib/agents";
import { money, pct, move, tone, bp, compact } from "@/lib/format";
import { dayLabel } from "@/lib/clock";
import Horae from "@/components/Horae";

export const revalidate = 60;
export const metadata: Metadata = pageMeta({ title: "Board", description: "Every stock token ANGELUS reads, with each agent's estimate of the next opening price.", path: "/board" });

const CH: ChainId[] = ["robinhood", "solana", "ethereum"];

export default async function BoardPage() {
  const b = await getBoard();
  const day = b.clock.phase === "regular";
  return (
    <>
    <SkyBand>
      <header className="wrap" style={{ paddingBottom: 8 }}>
        <p className="label" style={{ marginBottom: 18 }}>The board · session of {dayLabel(b.clock.session)}</p>
        <h1 className="h2" style={{ maxWidth: "16em" }}>
          {day ? <>Last night&apos;s numbers, <em>against the open.</em></> : <>{b.rows.length} stocks, three chains, <em>one bell each.</em></>}
        </h1>
        <Horae />
      </header>
    </SkyBand>
    <div className="wrap">

      <section style={{ paddingTop: 56 }}>
        <div className="scroll-x">
          {day ? (
            <table className="ledger">
              <thead>
                <tr><th>Stock</th><th>Prior close</th><th>The Bell said</th><th>Official open</th><th>Bell miss</th><th>Chain miss</th><th>Last</th><th>Token premium</th></tr>
              </thead>
              <tbody>
                {b.rows.map((r) => {
                  const live = r.chains.find((c) => c.chain === "robinhood")?.price ?? null;
                  return (
                    <tr key={r.ticker}>
                      <td><TickerCell ticker={r.ticker} name={r.name} gap={move(r.est.bell, r.close)} href={`/s/${r.ticker}`} /></td>
                      <td>{money(r.close)}</td>
                      <td className="bell">{money(r.est.bell)}</td>
                      <td>{money(r.open)}</td>
                      <td>{r.open && r.est.bell ? `${bp(Math.abs(r.est.bell / r.open - 1) * 1e4)} bp` : "—"}</td>
                      <td className="mute">{r.open && r.est.raw ? `${bp(Math.abs(r.est.raw / r.open - 1) * 1e4)} bp` : "—"}</td>
                      <td className={tone(move(r.last, r.close))}>{money(r.last)}</td>
                      <td className={tone(move(live, r.last))}>{pct(move(live, r.last), 2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="ledger">
              <thead>
                <tr>
                  <th>Stock</th><th>Close</th>
                  {CH.map((c) => <th key={c}>{CHAINS[c].short}</th>)}
                  <th className="sep">Lauds</th><th>Terce</th><th>Compline</th>
                  <th className="sep">The Bell</th><th>Gap</th><th>Depth</th>
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r) => {
                  const gap = move(r.est.bell, r.close);
                  const depth = r.chains.reduce((a, c) => a + c.liq, 0);
                  return (
                    <tr key={r.ticker}>
                      <td><TickerCell ticker={r.ticker} name={r.name} gap={move(r.est.bell, r.close)} href={`/s/${r.ticker}`} /></td>
                      <td>{money(r.close)}</td>
                      {CH.map((c) => {
                        const q = r.chains.find((x) => x.chain === c);
                        if (!q) return <td key={c} className="faint">—</td>;
                        const heard = lausWitnesses(r.chains).some((w) => w.chain === c);
                        return heard
                          ? <td key={c} className={tone(move(q.price, r.close))}>{money(q.price)}</td>
                          : <td key={c} className="faint" title="Set aside by Lauds: too shallow, or more than 1% away from the other chains"><s>{money(q.price)}</s></td>;
                      })}
                      <td className="sep">{money(r.est.lauds)}</td>
                      <td>{money(r.est.terce)}</td>
                      <td>{money(r.est.compline)}</td>
                      <td className="sep bell">{money(r.est.bell)}</td>
                      <td className={tone(gap)}>{pct(gap)}</td>
                      <td className="mute">{compact(depth)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="grid-2" style={{ marginTop: 40 }}>
          {day ? (
          <p className="note">
            Bell miss and chain miss are how far the Bell and the raw Robinhood Chain price, both locked at 04:00 ET, landed from the official open, in basis points (100 bp = 1%).
            Last is the stock&apos;s latest trade on the exchange; token premium is how far the Robinhood Chain token trades above (+) or below (−) that price right now.
          </p>
          ) : (
          <p className="note">
            Close is the official close of {dayLabel(b.clock.refDay)}. Chain columns are the depth-weighted price of every pool holding that stock&apos;s token
            (Robinhood&apos;s own stock tokens on Robinhood Chain, xStocks on Solana, Ondo on Ethereum), with mispriced or stale pools dropped.
            A <s>struck-through</s> price is one Lauds set aside tonight: too shallow, or more than 1% away from the other chains.
          </p>
          )}
          <p className="note">
            The Bell weights Lauds {Math.round((b.rows[0]?.params.weights.lauds ?? 0) * 100)}%, Terce {Math.round((b.rows[0]?.params.weights.terce ?? 0) * 100)}% and Compline {Math.round((b.rows[0]?.params.weights.compline ?? 0) * 100)}% tonight,
            from their errors over the last 20 sessions. <Link href="/docs" className="u">How each agent works</Link>.
          </p>
        </div>
      </section>
    </div>
    </>
  );
}
