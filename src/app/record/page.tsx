import Link from "next/link";
import { TickerCell } from "@/components/BellGlyph";
import SkyBand from "@/components/belfry/SkyBand";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import { getRecord, summarize, bySession, sessionsOf, errOf, type Scored, type SessionRow } from "@/lib/record";
import { LISTINGS } from "@/lib/registry";
import { bp } from "@/lib/format";
import { dayLabel } from "@/lib/clock";
import Spark from "@/components/Spark";
import RunningChart from "@/components/RunningChart";

export const revalidate = 300;
export const metadata: Metadata = pageMeta({ title: "Record", description: "Every estimate ANGELUS published, scored against the official opening price.", path: "/record" });

const NAMES: Record<Scored, string> = { bell: "The Bell", lauds: "Lauds", terce: "Terce", compline: "Compline", raw: "Raw chain price", close: "No move (prior close)" };

const errsBy = (rows: SessionRow[], days: string[], who: Scored) =>
  days.map((session) => ({ session, errs: rows.filter((r) => r.session === session).map((r) => errOf(r, who)).filter((x): x is number => x != null) }));

export default async function RecordPage() {
  const rec = await getRecord();
  const rows = rec.rows;
  const sum = summarize(rows);
  const days = sessionsOf(rows);
  const liveDays = new Set(rows.filter((r) => r.src === "live").map((r) => r.session)).size;
  const bellS = bySession(rows, "bell");
  const rawS = bySession(rows, "raw");
  const latest = days.slice().reverse().slice(0, 25);
  const maxErr = Math.max(1, ...bellS.map((x) => x.err ?? 0), ...rawS.map((x) => x.err ?? 0));

  return (
    <>
    <SkyBand>
      <header className="wrap grid-2" style={{ paddingBottom: 40 }}>
        <div>
          <p className="label" style={{ marginBottom: 18 }}>The record</p>
          <h1 className="h2">Every number, <em>against the bell.</em></h1>
        </div>
        <div className="prose" style={{ alignSelf: "end" }}>
          <p className="mute">
            Each trading morning, every agent&apos;s 04:00 ET estimate is compared with the official opening price. The miss is measured in basis points of the open
            (100 bp = 1%). Two baselines are scored the same way, so you can see whether the agents add anything: the raw Robinhood Chain price, and simply assuming nothing moved.
          </p>
          <p className="note">
            {days.length ? (
              <>
                {days.length} sessions, {dayLabel(days[0])} to {dayLabel(days[days.length - 1])}: {liveDays} locked live, {days.length - liveDays} replayed from hourly history (<Link href="/docs" className="u">what that means</Link>).
              </>
            ) : "No sessions scored yet. The first one is scored at the next opening bell."}
          </p>
        </div>
      </header>
    </SkyBand>
    <div className="wrap">

      <section style={{ paddingBottom: 72 }}>
        <div className="scroll-x">
          <table className="ledger">
            <thead><tr><th>Who</th><th>Mornings</th><th>Average miss</th><th>Median miss</th><th>Right direction</th><th>Miss per session</th></tr></thead>
            <tbody>
              {sum.map((x) => (
                <tr key={x.who}>
                  <td className="tk it" style={{ color: x.who === "bell" ? "var(--bronze)" : x.who === "raw" || x.who === "close" ? "var(--mute)" : undefined }}>{NAMES[x.who]}</td>
                  <td>{x.n}</td>
                  <td className={x.who === "bell" ? "bell" : ""}>{x.n ? `${bp(x.mae)} bp` : "—"}</td>
                  <td>{x.n ? `${bp(x.median)} bp` : "—"}</td>
                  <td>{x.hit != null ? `${Math.round(x.hit * 100)}%` : "—"}</td>
                  <td><div style={{ display: "flex", justifyContent: "flex-end" }}><Spark values={bySession(rows, x.who).slice(-40).map((s) => s.err)} width={170} height={28} stroke={x.who === "bell" ? "var(--bronze)" : "var(--ink)"} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="sec">
        <div className="sec-head"><span className="label">Over time</span><h2 className="h2">What the night <em>is worth.</em></h2></div>
        <div className="only-wide"><RunningChart bell={errsBy(rows, days, "bell")} flat={errsBy(rows, days, "close")} /></div>
        <div className="only-narrow"><RunningChart bell={errsBy(rows, days, "bell")} flat={errsBy(rows, days, "close")} width={440} height={320} /></div>
      </section>

      <section className="sec">
        <div className="sec-head"><span className="label">Morning by morning</span><h2 className="h2">The Bell <em>vs</em> the raw chain.</h2></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {latest.map((d) => {
            const b = bellS.find((x) => x.session === d)?.err ?? null;
            const r = rawS.find((x) => x.session === d)?.err ?? null;
            return (
              <div key={d} style={{ display: "grid", gridTemplateColumns: "130px 1fr 90px", gap: 16, alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--rule)" }}>
                <span style={{ fontSize: 16 }}>{dayLabel(d)}</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ height: 6, width: `${((b ?? 0) / maxErr) * 100}%`, background: "var(--bronze)" }} title={`Bell ${bp(b)} bp`} />
                  <div style={{ height: 6, width: `${((r ?? 0) / maxErr) * 100}%`, background: "var(--rule-2)" }} title={`Chain ${bp(r)} bp`} />
                </div>
                <span className="num" style={{ textAlign: "right", fontSize: 13 }}><span style={{ color: "var(--bronze)" }}>{bp(b)}</span> <span className="faint">/ {bp(r)}</span></span>
              </div>
            );
          })}
        </div>
        <p className="note" style={{ marginTop: 16 }}>Solid bar: the Bell&apos;s average miss that morning. Faint bar: the raw chain price. Shorter is better. Values in bp.</p>
      </section>

      <section className="sec">
        <div className="sec-head"><span className="label">Stock by stock</span><h2 className="h2">Where the night <em>lies most.</em></h2></div>
        <div className="scroll-x">
          <table className="ledger">
            <thead><tr><th>Stock</th><th>Mornings</th><th>The Bell</th><th>Lauds</th><th>Terce</th><th>Compline</th><th>Raw chain</th><th>No move</th></tr></thead>
            <tbody>
              {LISTINGS.map((l) => {
                const rs = rows.filter((r) => r.ticker === l.ticker);
                const m = (w: Scored) => {
                  const e = rs.map((r) => errOf(r, w)).filter((x): x is number => x != null);
                  return e.length ? e.reduce((a, b) => a + b, 0) / e.length : null;
                };
                const vals = (["bell", "lauds", "terce", "compline", "raw", "close"] as Scored[]).map((w) => [w, m(w)] as const);
                const best = Math.min(...vals.map(([, v]) => v ?? Infinity));
                return (
                  <tr key={l.ticker}>
                    <td><TickerCell ticker={l.ticker} name={l.name} gap={rs.length ? rs[rs.length - 1].open / rs[rs.length - 1].close - 1 : null} href={`/s/${l.ticker}`} /></td>
                    <td>{rs.length}</td>
                    {vals.map(([w, v]) => (
                      <td key={w} className={`${v === best ? "best" : ""} ${w === "bell" ? "bell" : ""}`}>{v == null ? "—" : bp(v)}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="note" style={{ marginTop: 16 }}>Average miss in bp. The underlined figure is the best reading for that stock.</p>
      </section>
    </div>
    </>
  );
}
