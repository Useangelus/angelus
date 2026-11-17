import Link from "next/link";
import { TickerCell } from "@/components/BellGlyph";
import { getBoard } from "@/lib/live";
import { AGENTS } from "@/lib/agents";
import { summarize, bySession, sessionsOf } from "@/lib/record";
import { money, pct, move, tone, bp } from "@/lib/format";
import { dayLabel } from "@/lib/clock";
import BelfryHero from "@/components/belfry/BelfryHero";
import Horae from "@/components/Horae";
import Spark from "@/components/Spark";
import s from "./home.module.css";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = { alternates: { canonical: "/" } };

// Tells search engines what the site is: a free web app publishing estimates, not a broker.
const LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "ANGELUS",
  url: SITE_URL,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  description: "Agents on Robinhood Chain that read tokenized stocks while Wall Street is closed, publish the next opening price, and grade themselves at the bell.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
}).replace(/</g, "\\u003c");

export const revalidate = 60;

const FRONT = ["NVDA", "TSLA", "AAPL", "META", "SPY", "QQQ"];

export default async function Home() {
  const b = await getBoard();
  const day = b.clock.phase === "regular";
  const rows = FRONT.map((t) => b.rows.find((r) => r.ticker === t)).filter((r) => r != null);
  const sum = summarize(b.record.rows);
  const get = (w: string) => sum.find((x) => x.who === w)!;
  const bell = get("bell"), raw = get("raw"), flat = get("close");
  const days = sessionsOf(b.record.rows);
  const beat = bell.n > 0 && bell.mae < raw.mae;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: LD }} />
      <BelfryHero
        day={day}
        sessionLabel={dayLabel(b.clock.session)}
        refLabel={dayLabel(b.clock.refDay)}
        rows={b.rows.map((r) => ({ ticker: r.ticker, name: r.name, close: r.close, bell: r.est.bell, raw: r.est.raw, lauds: r.est.lauds, terce: r.est.terce, compline: r.est.compline }))}
      />
      <section className="wrap">
        <Horae />
      </section>

      <section className="sec" style={{ marginTop: 72 }}>
        <div className="wrap">
          <div className="sec-head">
            <span className="label">I · {day ? "This morning" : "Tonight"}</span>
            <h2 className="h2">{day ? <>What the night said, <em>and what the Bell did.</em></> : <>Where the bell <em>should</em> ring.</>}</h2>
          </div>
          <div className="scroll-x">
            <table className="ledger">
              <thead>
                {day ? (
                  <tr><th>Stock</th><th className="hide-sm">Prior close</th><th>The Bell said</th><th>Official open</th><th className="hide-sm">Missed by</th><th className="hide-sm">Last</th></tr>
                ) : (
                  <tr><th>Stock</th><th className="hide-sm">Close · {dayLabel(b.clock.refDay)}</th><th className="hide-sm">On-chain now</th><th>The Bell</th><th>Gap</th></tr>
                )}
              </thead>
              <tbody>
                {rows.map((r) => {
                  const gap = move(r.est.bell, r.close);
                  return (
                    <tr key={r.ticker}>
                      <td><TickerCell ticker={r.ticker} name={r.name} gap={move(r.est.bell, r.close)} href={`/s/${r.ticker}`} /></td>
                      <td className="hide-sm">{money(r.close)}</td>
                      {day ? (
                        <>
                          <td className="bell">{money(r.est.bell)}</td>
                          <td>{money(r.open)}</td>
                          <td className="hide-sm">{r.open && r.est.bell ? `${bp(Math.abs(r.est.bell / r.open - 1) * 10000)} bp` : "—"}</td>
                          <td className={`hide-sm ${tone(move(r.last, r.close))}`}>{money(r.last)}</td>
                        </>
                      ) : (
                        <>
                          <td className="hide-sm">{money(r.est.raw)}</td>
                          <td className="bell">{money(r.est.bell)}</td>
                          <td className={tone(gap)}>{pct(gap)}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="note" style={{ marginTop: 18 }}>
            {b.rows.length} stocks on the full <Link href="/board" className="u">board</Link>. Prices refresh every minute. The number is locked for scoring at 04:00 ET, before Wall Street&apos;s own pre-market opens.
          </p>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <span className="label">II · The offices</span>
            <h2 className="h2">Three agents read the night. <em>One bell</em> speaks for them.</h2>
          </div>
          <div className={s.offices}>
            {AGENTS.map((a) => {
              const st = get(a.id);
              const series = bySession(b.record.rows, a.id).slice(-30).map((x) => x.err);
              return (
                <article key={a.id} className={`${s.office} ${a.id === "bell" ? s.theBell : ""}`}>
                  <div className={s.oName}>
                    <h3>{a.name}</h3>
                    <span className="label">{a.hour}</span>
                  </div>
                  <div className={s.oText}>
                    <p className={s.thesis}>{a.thesis}</p>
                    <p className="note">{a.method}</p>
                  </div>
                  <div className={s.oStats}>
                    <div className="stat"><span className="label">Avg miss</span><span className="v">{st.n ? `${bp(st.mae)}` : "—"}<small className={s.unit}> bp</small></span></div>
                    <div className="stat"><span className="label">Direction</span><span className="v">{st.hit != null ? `${Math.round(st.hit * 100)}%` : "—"}</span></div>
                    <div className={s.spark}><Spark values={series} width={150} height={34} stroke={a.id === "bell" ? "var(--bronze)" : "var(--ink)"} label={`${a.name} error by session`} /><span className="label">Miss per session</span></div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap grid-2">
          <div>
            <p className="label" style={{ marginBottom: 18 }}>III · Graded at the bell</p>
            <h2 className="h2">No number goes unchecked.</h2>
          </div>
          <div className="prose">
            {bell.n > 0 ? (
              <>
                <p>
                  Over the last {days.length} trading sessions ({dayLabel(days[0])} to {dayLabel(days[days.length - 1])}), The Bell missed the official open by <b className="num">{bp(bell.mae)} bp</b> on average across {bell.n} stock-mornings.
                  Reading the Robinhood Chain price alone missed by <b className="num">{bp(raw.mae)} bp</b>. Assuming nothing moved overnight missed by <b className="num">{bp(flat.mae)} bp</b>.
                </p>
                <p>{beat ? "The blend earns its place: it beats the raw chain price." : "The raw chain price is still the better guess. The record says so on the front page, and the agents' weights adjust from it."}</p>
              </>
            ) : (
              <p>The record is rebuilt from public data. It appears here once the first sessions are scored.</p>
            )}
            <p><Link href="/record" className="u">Read the full record</Link>, stock by stock and night by night.</p>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap grid-2">
          <div>
            <p className="label" style={{ marginBottom: 18 }}>IV · Your turn</p>
            <h2 className="h2">Over or under <em>the Bell?</em></h2>
          </div>
          <div className="prose">
            <p>
              Calls open at the closing bell and lock at 04:00 ET. Pick a stock, say whether the real open lands over or under the Bell&apos;s number, and sign it with your wallet.
              No deposit, no gas, no custody: a signature is the whole ticket. The opening bell settles every call, and the season table keeps score by month.
            </p>
            <Link href="/calls" className="btn">Open the call sheet <span className="arr">→</span></Link>
          </div>
        </div>
      </section>
    </>
  );
}
