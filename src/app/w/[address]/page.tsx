import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listing } from "@/lib/registry";
import { dayLabel } from "@/lib/clock";
import { money, short } from "@/lib/format";
import { walletRecord } from "@/lib/wallet";
import { TickerCell } from "@/components/BellGlyph";
import SkyBand from "@/components/belfry/SkyBand";
import { pageMeta } from "@/lib/meta";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ address: string }> }): Promise<Metadata> {
  const { address } = await params;
  const r = await walletRecord(address);
  if (!r) return { title: "Wallet" };
  const title = `Calls of ${short(address)}`;
  const description = r.settled.length ? `${r.won} right, ${r.lost} wrong against the opening bell.` : "Calls against the opening bell.";
  return pageMeta({ title, description, path: `/w/${address.toLowerCase()}`, image: { url: `/w/${address}/opengraph-image`, width: 1600, height: 900, alt: title }, noindex: true });
}

export default async function WalletPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const r = await walletRecord(address);
  if (!r) notFound();
  const { calls, settled, won, lost, pending, rate, streak, byStock } = r;
  const shareText = settled.length
    ? `My record against the opening bell on ANGELUS: ${won} right, ${lost} wrong.`
    : "My calls against the opening bell on ANGELUS.";

  return (
    <>
      <SkyBand>
        <header className="wrap grid-2" style={{ paddingBottom: 40 }}>
          <div>
            <p className="label" style={{ marginBottom: 18 }}>Wallet · {short(address)}</p>
            <h1 className="h2">
              {settled.length
                ? <>{won} called right, <em>{lost} called wrong.</em></>
                : pending
                  ? <>{pending} {pending === 1 ? "call" : "calls"} <em>waiting for the bell.</em></>
                  : <>No calls <em>yet.</em></>}
            </h1>
          </div>
          <div style={{ alignSelf: "end", display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-start" }}>
            <p className="mute num" style={{ margin: 0, fontSize: 13, wordBreak: "break-all" }}>{r.address}</p>
            {calls.length > 0 && <ShareRecord text={shareText} path={`/w/${r.address}`} />}
          </div>
        </header>
      </SkyBand>
      <div className="wrap">
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 28, padding: "8px 0 40px", borderBottom: "1px solid var(--rule)" }}>
          <div className="stat"><span className="label">Hit rate</span><span className="v">{rate != null ? `${Math.round(rate * 100)}%` : "—"}</span></div>
          <div className="stat"><span className="label">Settled</span><span className="v">{settled.length}</span></div>
          <div className="stat"><span className="label">Waiting for the bell</span><span className="v">{pending}</span></div>
          <div className="stat"><span className="label">Current streak</span><span className="v">{streak.current ? `${streak.current} ${streak.kind === "won" ? "right" : "wrong"}` : "—"}</span></div>
          <div className="stat"><span className="label">Best streak</span><span className="v">{streak.best || "—"}</span></div>
        </section>

        {byStock.length > 0 && (
          <section className="sec" style={{ borderTop: 0 }}>
            <div className="sec-head"><span className="label">By stock</span><h2 className="h3">Where this wallet reads the night best</h2></div>
            <div className="scroll-x">
              <table className="ledger">
                <thead><tr><th>Stock</th><th>Right</th><th>Wrong</th><th>Hit rate</th></tr></thead>
                <tbody>
                  {byStock.map((s) => (
                    <tr key={s.ticker}>
                      <td><TickerCell ticker={s.ticker} name={listing(s.ticker)?.name ?? s.ticker} gap={null} href={`/s/${s.ticker}`} /></td>
                      <td>{s.won}</td>
                      <td>{s.lost}</td>
                      <td>{Math.round((s.won / (s.won + s.lost)) * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="sec">
          <div className="sec-head"><span className="label">Every call</span><h2 className="h3">{calls.length ? `${calls.length} signed ${calls.length === 1 ? "call" : "calls"}` : "Nothing signed from this wallet"}</h2></div>
          {calls.length ? (
            <div className="scroll-x">
              <table className="ledger">
                <thead><tr><th>Session</th><th>Stock</th><th>Call</th><th>Open</th><th>Result</th><th>Card</th></tr></thead>
                <tbody>
                  {calls.map((c) => (
                    <tr key={c.session + c.ticker}>
                      <td style={{ fontFamily: "var(--f-serif)", fontSize: 16 }}>{dayLabel(c.session)}</td>
                      <td>{c.ticker}</td>
                      <td>{c.side} {money(c.ref)}</td>
                      <td>{money(c.open)}</td>
                      <td className={c.outcome === "won" ? "best" : "mute"}>{c.outcome === "won" ? "right" : c.outcome === "lost" ? "wrong" : c.outcome}</td>
                      <td><Link className="u" href={`/call?a=${c.address}&t=${c.ticker}&d=${c.session}`}>View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="note">Calls open at the closing bell and lock at 04:00 ET. <Link href="/calls" className="u">Make the first one</Link>.</p>
          )}
        </section>
      </div>
    </>
  );
}

function ShareRecord({ text, path }: { text: string; path: string }) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3217").replace(/\/$/, "");
  const href = `https://x.com/intent/post?via=useangelus&text=${encodeURIComponent(text)}&url=${encodeURIComponent(site + path)}`;
  return <a className="btn ghost" href={href} target="_blank" rel="noreferrer">Post this record on X</a>;
}
