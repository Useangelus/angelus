import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRow } from "@/lib/live";
import { LISTINGS, CHAINS, listing, type ChainId } from "@/lib/registry";
import { hourly } from "@/lib/sources";
import { AGENTS } from "@/lib/agents";
import { errOf } from "@/lib/record";
import { money, pct, move, tone, bp, compact, dexName } from "@/lib/format";
import { dayLabel } from "@/lib/clock";
import NightChart from "@/components/NightChart";
import StockBell from "@/components/belfry/StockBell";
import { getVigil } from "@/lib/vigil";
import { pageMeta } from "@/lib/meta";

export const revalidate = 60;

export function generateStaticParams() {
  return LISTINGS.map((l) => ({ ticker: l.ticker }));
}

export async function generateMetadata({ params }: { params: Promise<{ ticker: string }> }): Promise<Metadata> {
  const { ticker } = await params;
  const l = listing(ticker);
  if (!l) return { title: "Not found" };
  return pageMeta({ title: `${l.ticker} · ${l.name}`, description: `Where ${l.name} (${l.ticker}) should open, priced overnight from its tokens on Robinhood Chain, Solana and Ethereum, and how close ANGELUS has come.`, path: `/s/${l.ticker}`, image: { url: `/s/${l.ticker}/opengraph-image`, width: 1600, height: 900, alt: `${l.ticker}: tonight's Bell on ANGELUS` } });
}

export default async function StockPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const data = await getRow(ticker);
  if (!data) notFound();
  const { board, row } = data;
  const l = listing(row.ticker)!;
  const at = LISTINGS.findIndex((x) => x.ticker === row.ticker);
  const prev = LISTINGS[(at - 1 + LISTINGS.length) % LISTINGS.length];
  const next = LISTINGS[(at + 1) % LISTINGS.length];
  const day = board.clock.phase === "regular";
  const rh = l.venues.robinhood;
  const [candles, vigil] = await Promise.all([
    rh ? hourly("robinhood", rh.pool, 900, 200) : Promise.resolve([]),
    getVigil(board.clock.session),
  ]);
  const note = vigil?.notes[row.ticker] ?? null;
  const gap = move(row.est.bell, row.close);
  const hist = board.record.rows.filter((r) => r.ticker === row.ticker).sort((a, b) => b.session.localeCompare(a.session)).slice(0, 15);
  const pools = row.pairs.filter((p) => p.liq >= 5000).sort((a, b) => b.liq - a.liq);
  const w = row.params.weights;
  const inputs: Record<string, string> = {
    lauds: row.chains.map((c) => `${CHAINS[c.chain].short} ${money(c.price)}`).join(" · ") || "no chain quotes",
    terce: `beta ${row.params.beta.toFixed(2)} to SPY`,
    compline: `keeps ${Math.round(row.params.k * 100)}% of the token move`,
    bell: `weights ${Math.round(w.lauds * 100)} / ${Math.round(w.terce * 100)} / ${Math.round(w.compline * 100)}`,
  };

  return (
    <>
    <StockBell ticker={row.ticker} gap={gap}>
      <header style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 32, alignItems: "end" }} className="stock-head">
        <div>
          <p className="label" style={{ marginBottom: 14 }}><Link href="/board" className="u">Board</Link> / {row.ticker}</p>
          <h1 className="display" style={{ fontSize: "clamp(56px, 9vw, 128px)" }}>{row.ticker}</h1>
          <p className="lede" style={{ marginTop: 10 }}>{row.name}. Official close {money(row.close)} on {dayLabel(row.refDay)}.</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p className="label">{day ? "The Bell said this morning" : `The Bell for ${dayLabel(board.clock.session)}`}</p>
          <p className="num" style={{ fontSize: "clamp(40px, 5vw, 64px)", color: "var(--bronze)", margin: "6px 0 0", letterSpacing: "-0.03em" }}>{money(row.est.bell)}</p>
          <p className={`num ${tone(gap)}`} style={{ margin: 0 }}>{pct(gap)} vs close{day && row.open ? ` · open ${money(row.open)}` : ""}</p>
        </div>
      </header>
    </StockBell>
    <div className="wrap">

      {note && (
        <section style={{ padding: "40px 0 0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(120px, 180px) 1fr", gap: 24, borderTop: "1px solid var(--rule-2)", paddingTop: 20 }} className="doc-row">
            <span className="label">The Vigil · 04:00 ET</span>
            <p style={{ margin: 0, fontSize: 22, lineHeight: 1.4, fontStyle: "italic", maxWidth: "34em" }}>{note}</p>
          </div>
        </section>
      )}

      <section style={{ padding: "48px 0 0" }}>
        <div className="only-wide"><NightChart candles={candles} days={row.days} bell={row.est.bell} clock={board.clock} /></div>
        <div className="only-narrow"><NightChart candles={candles} days={row.days} bell={row.est.bell} clock={board.clock} width={640} height={420} /></div>
        <p className="note" style={{ marginTop: 8 }}>
          Line: hourly price of the Robinhood Chain token. Filled dots: official opens. Hollow dots: official closes. Shaded: regular trading hours.
        </p>
      </section>

      <section className="sec" style={{ marginTop: 56 }}>
        <div className="sec-head"><span className="label">The readings</span><h2 className="h2">Four ways to read <em>the same night.</em></h2></div>
        <div className="scroll-x">
          <table className="ledger">
            <thead><tr><th>Agent</th><th>Estimate</th><th>vs close</th><th>What it used</th></tr></thead>
            <tbody>
              {AGENTS.map((a) => {
                const v = row.est[a.id];
                return (
                  <tr key={a.id}>
                    <td className="tk it" style={{ color: a.id === "bell" ? "var(--bronze)" : undefined }}>{a.name}</td>
                    <td className={a.id === "bell" ? "bell" : ""}>{money(v)}</td>
                    <td className={tone(move(v, row.close))}>{pct(move(v, row.close))}</td>
                    <td className="mute" style={{ whiteSpace: "normal", minWidth: 260 }}>{inputs[a.id]}</td>
                  </tr>
                );
              })}
              <tr>
                <td className="tk it mute">Raw chain</td>
                <td className="mute">{money(row.est.raw)}</td>
                <td className={tone(move(row.est.raw, row.close))}>{pct(move(row.est.raw, row.close))}</td>
                <td className="mute" style={{ whiteSpace: "normal" }}>the baseline every agent has to beat</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="sec">
        <div className="grid-2">
          <div>
            <div className="sec-head" style={{ gridTemplateColumns: "1fr", marginBottom: 24 }}><span className="label">Venues</span><h2 className="h3">Every pool holding {row.ticker}</h2></div>
            <div className="scroll-x">
              <table className="ledger">
                <thead><tr><th>Chain · venue</th><th>Pair</th><th>Price</th><th>Depth</th><th>24h vol</th></tr></thead>
                <tbody>
                  {pools.map((p) => (
                    <tr key={p.pair}>
                      <td style={{ fontFamily: "var(--f-serif)", fontSize: 16 }}>
                        <a href={`${CHAINS[p.chain as ChainId].explorer}${p.pair}`} target="_blank" rel="noreferrer" className="u">{CHAINS[p.chain].label}</a>
                        <small className="label" style={{ display: "block" }}>{dexName(p.dex)} · {l.venues[p.chain]?.issuer}</small>
                      </td>
                      <td className="mute">{row.ticker}/{p.quote}</td>
                      <td>{money(p.price)}</td>
                      <td>{compact(p.liq)}</td>
                      <td className="mute">{compact(p.vol24)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <div className="sec-head" style={{ gridTemplateColumns: "1fr", marginBottom: 24 }}><span className="label">Record</span><h2 className="h3">The last {hist.length} mornings</h2></div>
            <div className="scroll-x">
              <table className="ledger">
                <thead><tr><th>Session</th><th>Close</th><th>Bell</th><th>Open</th><th>Bell miss</th><th>Chain miss</th></tr></thead>
                <tbody>
                  {hist.map((h) => {
                    const e = errOf(h, "bell"), c = errOf(h, "raw");
                    return (
                      <tr key={h.session}>
                        <td style={{ fontFamily: "var(--f-serif)", fontSize: 16 }}>{dayLabel(h.session)}</td>
                        <td className="mute">{money(h.close)}</td>
                        <td className="bell">{money(h.est.bell)}</td>
                        <td>{money(h.open)}</td>
                        <td className={e != null && c != null && e <= c ? "best" : ""} title={e != null && c != null && e <= c ? "The Bell beat the raw chain price this morning" : undefined}>{bp(e)} bp</td>
                        <td className="mute">{bp(c)} bp</td>
                      </tr>
                    );
                  })}
                  {!hist.length && <tr><td colSpan={6} className="mute">No scored mornings yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <nav aria-label="Other stocks" style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "24px 0 8px", borderTop: "1px solid var(--rule)" }}>
        <Link href={`/s/${prev.ticker}`} className="u" style={{ fontSize: 18 }}>← {prev.ticker}</Link>
        <Link href="/board" className="label u">All {LISTINGS.length} stocks</Link>
        <Link href={`/s/${next.ticker}`} className="u" style={{ fontSize: 18 }}>{next.ticker} →</Link>
      </nav>
    </div>
    </>
  );
}
