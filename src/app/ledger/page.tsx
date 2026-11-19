import type { Metadata } from "next";
import Link from "next/link";
import SkyBand from "@/components/belfry/SkyBand";
import { pageMeta } from "@/lib/meta";
import { getLocks, getRecord, errOf, sessionsOf } from "@/lib/record";
import { EXPLORER, REGISTRY, getSeals } from "@/lib/seal";
import { dayLabel } from "@/lib/clock";
import { etTime } from "@/lib/format";

export const revalidate = 120;
export const metadata: Metadata = pageMeta({ title: "Ledger", description: "Every night ANGELUS has published: when it was locked, whether it was sealed on Robinhood Chain, and how it was graded at the open.", path: "/ledger" });

const short = (s: string) => `${s.slice(0, 8)}…${s.slice(-6)}`;

export default async function LedgerPage() {
  const [rec, locks, seals] = await Promise.all([getRecord(), getLocks().catch(() => ({})), getSeals().catch(() => ({}))]);
  const graded = new Set(sessionsOf(rec.rows));
  const sessions = [...new Set([...graded, ...Object.keys(locks), ...Object.keys(seals)])].sort().reverse();
  const liveCount = Object.keys(locks).length, sealCount = Object.keys(seals).length;

  return (
    <>
      <SkyBand>
        <header className="wrap grid-2" style={{ paddingBottom: 40 }}>
          <div>
            <p className="label" style={{ marginBottom: 18 }}>The ledger</p>
            <h1 className="h2">Every night, <em>on the record.</em></h1>
          </div>
          <div className="prose" style={{ alignSelf: "end" }}>
            <p className="mute">
              One line per night: when its numbers were locked, the transaction that sealed them on Robinhood Chain, and the grade at the open.
              Nights from before ANGELUS went live are marked as replayed; they were rebuilt from hourly history and were never sealed.
            </p>
            <p className="note">
              {liveCount} {liveCount === 1 ? "night" : "nights"} locked live · {sealCount} sealed · {graded.size} graded{REGISTRY ? <> · contract <a className="u num" href={`${EXPLORER}/address/${REGISTRY}`} target="_blank" rel="noreferrer">{short(REGISTRY)}</a></> : null}
            </p>
          </div>
        </header>
      </SkyBand>
      <div className="wrap" style={{ paddingTop: 40 }}>
        <div className="scroll-x">
          <table className="ledger ledger-log">
            <thead>
              <tr><th>Night</th><th>Numbers</th><th>Locked</th><th>Sealed on-chain</th><th>Graded at the open</th><th /></tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const lk = (locks as Record<string, { at: number }[]>)[s];
                const seal = (seals as Record<string, { tx: string | null; at: number; digest: string }>)[s];
                const rows = rec.rows.filter((r) => r.session === s);
                const errs = rows.map((r) => errOf(r, "bell")).filter((x): x is number => x != null);
                const flat = rows.map((r) => errOf(r, "close")).filter((x): x is number => x != null);
                const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
                const at = lk?.length ? Math.max(...lk.map((l) => l.at)) : null;
                const b = avg(errs), f = avg(flat);
                return (
                  <tr key={s}>
                    <td style={{ fontFamily: "var(--f-serif)", fontSize: 17 }}>{graded.has(s) ? <Link href={`/edition/${s}`} className="u">{dayLabel(s)}</Link> : dayLabel(s)}</td>
                    <td><span className={`pill ${lk ? "on" : ""}`}>{lk ? "Locked live" : "Replayed"}</span></td>
                    <td className="mute">{at ? etTime(at) : "—"}</td>
                    <td>{seal ? (seal.tx ? <a className="u num" href={`${EXPLORER}/tx/${seal.tx}`} target="_blank" rel="noreferrer">{etTime(seal.at)} · {short(seal.tx)}</a> : <span className="num">{etTime(seal.at)} · on-chain</span>) : <span className="mute">{lk ? "not sealed" : "—"}</span>}</td>
                    <td>{b != null ? <><span className="num bell">{b.toFixed(0)} bp</span> <span className="mute">vs {f?.toFixed(0)} bp</span></> : <span className="mute">awaiting 09:30 ET</span>}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {seal ? <Link href={`/verify?session=${s}`} className="label u">Verify</Link> : null}
                      {graded.has(s) ? <Link href={`/replay/${s}`} className="label u" style={{ marginLeft: 14 }}>Replay</Link> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="note" style={{ marginTop: 16 }}>Times in New York (ET). The grade is the average miss of the Bell against the official open, next to the miss of assuming each stock opens where it closed. As data: <a className="u" href="/api/seals">/api/seals</a> · <a className="u" href="/api/bell.json">/api/bell.json</a>.</p>
      </div>
    </>
  );
}
