import Link from "next/link";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import SkyBand from "@/components/belfry/SkyBand";
import { getBoard } from "@/lib/live";
import { season } from "@/lib/season";
import { seasonOf } from "@/lib/callmsg";
import { short } from "@/lib/format";
import CallSheet from "@/components/CallSheet";

export const revalidate = 30;
export const metadata: Metadata = pageMeta({ title: "Calls", description: "Call the opening bell over or under ANGELUS's number. Signed with your wallet, no deposit, settled at 09:30 ET.", path: "/calls" });

export default async function CallsPage() {
  const b = await getBoard();
  const month = seasonOf(b.clock.session);
  const s = await season(month).catch(() => ({ month, table: [], total: 0, crowdRate: null, calls: [] }));
  const label = new Date(month + "-15T12:00:00Z").toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const rows = b.rows.map((r) => ({ ticker: r.ticker, name: r.name, close: r.close, bell: r.est.bell }));

  return (
    <>
    <SkyBand>
      <header className="wrap grid-2" style={{ paddingBottom: 40 }}>
        <div>
          <p className="label" style={{ marginBottom: 18 }}>Calls · season {label}</p>
          <h1 className="h2">Over or under <em>the Bell.</em></h1>
        </div>
        <div className="prose" style={{ alignSelf: "end" }}>
          <p className="mute">
            Pick a stock and say where the official open lands against the Bell&apos;s number. Your wallet signs a plain message; nothing is sent on-chain and nothing is deposited.
            One call per stock per bell. Calls open at the closing bell and lock at 04:00 ET. The opening bell settles them. No prizes, only the record of who reads the night best. Your address and calls are public; read the <Link href="/terms" className="u">terms</Link>.
          </p>
        </div>
      </header>
    </SkyBand>
    <div className="wrap">

      <CallSheet rows={rows} session={b.clock.session} />

      <section className="sec" style={{ marginTop: 72 }}>
        <div className="sec-head"><span className="label">Season table</span><h2 className="h2">{label}</h2></div>
        <div className="grid-2" style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", gap: 48 }}>
            <div className="stat"><span className="label">Calls this season</span><span className="v">{s.total}</span></div>
            <div className="stat"><span className="label">Crowd beat the Bell</span><span className="v">{s.crowdRate != null ? `${Math.round(s.crowdRate * 100)}%` : "—"}</span></div>
          </div>
          <p className="note">A won call means the open landed on your side of the Bell&apos;s number. If the crowd wins more than half its calls, the Bell is leaning the wrong way, and that is worth knowing too.</p>
        </div>
        <div className="scroll-x">
          <table className="ledger">
            <thead><tr><th>#</th><th>Wallet</th><th>Won</th><th>Lost</th><th>Pending</th><th>Hit rate</th></tr></thead>
            <tbody>
              {s.table.slice(0, 50).map((t, i) => (
                <tr key={t.address}>
                  <td className="mute">{i + 1}</td>
                  <td title={t.address}><Link href={`/w/${t.address}`} className="u">{short(t.address)}</Link></td>
                  <td className="up">{t.won}</td>
                  <td className="down">{t.lost}</td>
                  <td className="mute">{t.pending}</td>
                  <td>{t.rate != null ? `${Math.round(t.rate * 100)}%` : "—"}</td>
                </tr>
              ))}
              {!s.table.length && <tr><td colSpan={6} className="mute" style={{ textAlign: "left" }}>No calls yet this season. The first one sets the pace.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
    </>
  );
}
