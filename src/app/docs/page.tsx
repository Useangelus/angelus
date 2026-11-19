import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import SkyBand from "@/components/belfry/SkyBand";
import Link from "next/link";
import { AGENTS } from "@/lib/agents";
import { LISTINGS, CHAINS, type ChainId } from "@/lib/registry";
import { REGISTRY, addressUrl, EXPLORER } from "@/lib/seal";

export const metadata: Metadata = pageMeta({ title: "Method", description: "How ANGELUS turns on-chain stock prices into an estimate of the next opening bell, and how it is scored.", path: "/docs" });

export default function Docs() {
  return (
    <>
    <SkyBand>
      <header className="wrap grid-2" style={{ paddingBottom: 48 }}>
        <div>
          <p className="label" style={{ marginBottom: 18 }}>Method</p>
          <h1 className="h2">How the Bell <em>is cast.</em></h1>
        </div>
        <p className="lede" style={{ alignSelf: "end" }}>Everything ANGELUS publishes comes from public prices and four short formulas. Nothing is hidden, so anything can be checked.</p>
      </header>
    </SkyBand>
    <div className="wrap">

      <section className="sec">
        <div className="grid-2">
          <div className="prose">
            <h3 style={{ marginTop: 0 }}>The question</h3>
            <p>
              US stocks trade on exchanges from 09:30 to 16:00 New York time. Tokens that track them trade around the clock: Robinhood&apos;s stock tokens on Robinhood Chain,
              xStocks on Solana, Ondo&apos;s on Ethereum. So between the closing bell and the next open there is a price, but no official one.
            </p>
            <p>ANGELUS asks one question per stock per night: <i>what will the official opening price be?</i> The answer is one number, the Bell.</p>
            <h3 id="clock" style={{ scrollMarginTop: 90 }}>The clock</h3>
            <p>
              The night runs from the official close to the next official open, skipping weekends and exchange holidays. At <b>04:00 ET</b> the numbers are locked for scoring.
              That is when Wall Street&apos;s own pre-market begins, so the locked number is made from on-chain trading alone. The live number keeps updating after the lock; only the 04:00 number is graded. <a href="/calendar.ics" className="u">Add the close, the lock and the open to your calendar</a>, or <Link href="/replay" className="u">watch a past night replayed</Link>.
            </p>
            <h3>The score</h3>
            <p>
              At 09:30 ET the official open arrives. Every agent&apos;s locked number is compared with it, and the miss is recorded in basis points of the open (100 bp = 1%), along with whether it called the direction from the close.
              Two baselines are scored the same way: the raw Robinhood Chain price, and the prior close (assuming nothing moved). If the agents cannot beat those, the <Link href="/record" className="u">record</Link> shows it.
            </p>
          </div>
          <div className="prose">
            <h3 style={{ marginTop: 0 }}>Cleaning the evidence</h3>
            <p>
              For each stock and chain, every pool is read. Pools under $5,000 of depth are ignored. Pools priced more than 30% from the official close are dropped as broken or mislabeled
              (stock splits that an issuer has not applied, for example). Then pools more than 3% away from the chain&apos;s depth-weighted median are dropped as stale. What is left is averaged by depth.
            </p>
            <h3>History and scoring data</h3>
            <p>
              Every night, the numbers on the board at 04:00 ET are stored as they were published, and the official open settles them. These are marked <i>live</i> in the record.
            </p>
            <p>
              Nights from before ANGELUS went live are <i>replayed</i>: rebuilt from hourly candles of the deepest pool per chain (GeckoTerminal) and official daily open and close prices.
              Historical pool depth is not public, so a replay uses today&apos;s depth, and shallow chains without history are left out. Beta and Compline&apos;s scale factor only ever use data from before the night they score, so nothing peeks ahead.
            </p>
            <h3>The Vigil</h3>
            <p>
              At the lock, a language model (Claude) reads the night&apos;s board and writes one or two sentences per stock: what the night did, whether the chains and agents agree, and what to watch at the open.
              It writes words only. It never sets or changes a number.
            </p>
            <h3>What this is not</h3>
            <p>
              The Bell is an estimate, published for information. It is not investment advice, not an offer, and not a promise that a token can be traded at that price.
              ANGELUS is independent of Robinhood, Nasdaq, NYSE and every token issuer listed here.
            </p>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="sec-head"><span className="label">The agents</span><h2 className="h2">Four formulas, <em>in plain words.</em></h2></div>
        <div style={{ borderTop: "1px solid var(--rule-2)" }}>
          {[
            ["lauds", <>Lauds = Σ price<sub>c</sub> · √depth<sub>c</sub> / Σ √depth<sub>c</sub></>, "over the chains c where the stock trades with at least $25,000 of depth and within 1% of the middle chain by price (one vote per chain; with two chains, Robinhood Chain is the reference)."],
            ["terce", <>Terce = close · (1 + β·m + ½·(r − β·m))</>, "r = Robinhood Chain move since the close, m = SPY token move since the close, β = 60-day daily beta to SPY."],
            ["compline", <>Compline = close · (1 + k·r)</>, "k = the share of the token's overnight move that past opens kept: the least-squares slope of open move on token move over this stock's last 30 scored nights (0.85 until there are five)."],
            ["bell", <>Bell = Σ w<sub>a</sub> · estimate<sub>a</sub>, with w<sub>a</sub> ∝ 1 / (average miss of a)²</>, "average miss over the last 20 scored sessions, all stocks pooled. Equal weights until each agent has ten scored mornings."],
          ].map(([id, f, note]) => [id as string, f, note as string] as const).map(([id, f, note]) => {
            const a = AGENTS.find((x) => x.id === id)!;
            return (
              <div key={id} style={{ display: "grid", gridTemplateColumns: "minmax(140px, 220px) 1fr", gap: 28, padding: "28px 0", borderBottom: "1px solid var(--rule)" }} className="doc-row">
                <h3 className="it" style={{ fontSize: 34, color: id === "bell" ? "var(--bronze)" : undefined }}>{a.name}</h3>
                <div>
                  <p style={{ margin: "0 0 10px", fontSize: 20 }}>{a.method}</p>
                  <p className="num formula" style={{ margin: "0 0 6px", fontSize: 14, color: "var(--ink)" }}>{f}</p>
                  <p className="note" style={{ margin: 0 }}>{note}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="sec" id="seal" style={{ scrollMarginTop: 90 }}>
        <div className="sec-head"><span className="label">Sealed on-chain</span><h2 className="h2">Written down <em>before the bell.</em></h2></div>
        <div className="grid-2">
          <div className="prose">
            {!REGISTRY && (
              <p className="note">
                Not live yet: the contract is written and tested but not deployed. Until it is, each night&apos;s locked numbers are published at the 04:00 ET lock on the <Link href="/edition" className="u">edition</Link> and at <a href="/api/bell.json" className="u num">/api/bell.json</a>.
              </p>
            )}
            <p>
              At the 04:00 ET lock, the night&apos;s numbers (each stock&apos;s prior close and its Bell) are written to a contract on Robinhood Chain, BellRegistry.
              The contract itself refuses a seal made after 13:30 UTC on the session day, which is never later than the 09:30 ET open. It accepts one seal per night, only moves forward in time, and has no function that edits or deletes one.
            </p>
            <p>
              So the score on the <Link href="/record" className="u">record</Link> is checked against numbers that were public before Wall Street opened, and nobody, ANGELUS included, can change them afterwards.
              The contract holds no money and decides nothing; it only keeps the receipt.
            </p>
            <p className="note">
              To check a night yourself: take its numbers from <a href="/api/seals" className="u num">/api/seals</a>, compute keccak256(abi.encode(session, tickers, closes, bells)) with the session as yyyymmdd, tickers as ascending bytes8 and prices in dollars with 6 decimals, and compare it with sealOf(session) on the contract, or call verify(...) directly. Or let the <Link href="/verify" className="u">verify page</Link> do it in your browser; every lock and seal is on the <Link href="/ledger" className="u">ledger</Link>.
            </p>
          </div>
          <div style={{ borderTop: "1px solid var(--rule-2)" }}>
            {[
              ["Contract", REGISTRY ? <a key="c" className="u num" href={addressUrl(REGISTRY)} target="_blank" rel="noreferrer">{REGISTRY}</a> : <span key="c" className="faint">Published here when it is deployed.</span>],
              ["Chain", <span key="n">Robinhood Chain, chain ID 4663</span>],
              ["Explorer", <a key="e" className="u" href={EXPLORER} target="_blank" rel="noreferrer">{EXPLORER.replace("https://", "")}</a>],
              ["Deadline", <span key="d">13:30 UTC on the session day, enforced by the contract</span>],
              ["Cost", <span key="g">About 140,000 gas a night for sixteen stocks, paid by ANGELUS</span>],
            ].map(([k, v]) => (
              <div key={k as string} style={{ display: "grid", gridTemplateColumns: "110px minmax(0, 1fr)", gap: 16, padding: "14px 0", borderBottom: "1px solid var(--rule)", alignItems: "baseline" }}>
                <span className="label">{k}</span>
                <span style={{ fontSize: 15, overflowWrap: "anywhere" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec" id="open-data">
        <div className="sec-head"><span className="label">Open data</span><h2 className="h2">Take the numbers. <em>No key needed.</em></h2></div>
        <div className="grid-2">
          <div className="prose">
            <p>
              Everything the board shows is also published as plain JSON, free to use in bots, dashboards and other projects on Robinhood Chain. It refreshes about once a minute and can be called from any site.
            </p>
            <p className="note">Please cache it for at least a minute and credit ANGELUS. Estimates, not advice.</p>
          </div>
          <div style={{ borderTop: "1px solid var(--rule-2)" }}>
            {[
              ["/api/bell.json", "Tonight's Bell for every stock, each agent's estimate and weight, the price and depth on every chain, and the record so far."],
              ["/api/seals", "Every night sealed on Robinhood Chain: the exact numbers sent, the digest and the transaction, for checking against the contract."],
              ["/api/health", "Whether the price sources and storage answer, and whether last night's 04:00 ET lock happened. For uptime monitors."],
              ["/edition/latest/image", "Tonight's edition as a 1600×900 PNG. Add ?s=2 for 3200×1800."],
            ].map(([path, text]) => (
              <div key={path} style={{ padding: "16px 0", borderBottom: "1px solid var(--rule)" }}>
                <a href={path} className="num u" style={{ fontSize: 15 }}>{path}</a>
                <p className="note" style={{ margin: "6px 0 0" }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="sec-head"><span className="label">Coverage</span><h2 className="h2">{LISTINGS.length} stocks, <em>three chains.</em></h2></div>
        <div className="scroll-x">
          <table className="ledger">
            <thead><tr><th>Stock</th>{(Object.keys(CHAINS) as ChainId[]).map((c) => <th key={c}>{CHAINS[c].label}</th>)}</tr></thead>
            <tbody>
              {LISTINGS.map((l) => (
                <tr key={l.ticker}>
                  <td className="tk">{l.ticker}<small>{l.name}</small></td>
                  {(Object.keys(CHAINS) as ChainId[]).map((c) => {
                    const v = l.venues[c];
                    return <td key={c} className={v ? "" : "faint"}>{v ? <a className="u" href={`${CHAINS[c].explorer}${v.pool}`} target="_blank" rel="noreferrer">{v.issuer}</a> : "—"}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
    </>
  );
}
