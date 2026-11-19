import Link from "next/link";
import { errOf, type SessionRow } from "@/lib/record";
import { dayLabel } from "@/lib/clock";

const CAP = 400; // bp: every miss this large or larger is drawn at full ink

/**
 * Every graded open on one page: a row per stock, a column per morning, each square as dark as the Bell's miss.
 * A dot marks the mornings the Bell lost to "it opens where it closed". Hover a square for the numbers.
 */
export default function Heatmap({ rows, days, tickers }: { rows: SessionRow[]; days: string[]; tickers: string[] }) {
  const at = new Map(rows.map((r) => [`${r.ticker}:${r.session}`, r]));
  const live = new Set(rows.filter((r) => r.src === "live").map((r) => r.session));
  return (
    <div className="heat">
      <div className="scroll-x">
        <table className="heat-t" aria-label="The Bell's miss for every stock and morning">
          <thead>
            <tr>
              <th />
              {days.map((d, i) => (
                <th key={d} scope="col" className={live.has(d) ? "live" : ""}>
                  {i % 5 === 0 || (i === days.length - 1 && i % 5 >= 3) ? <span>{dayLabel(d).replace(/^\w+, /, "")}</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tickers.map((t) => (
              <tr key={t}>
                <th scope="row"><Link href={`/s/${t}`} className="u">{t}</Link></th>
                {days.map((d) => {
                  const r = at.get(`${t}:${d}`);
                  const e = r ? errOf(r, "bell") : null;
                  const c = r ? errOf(r, "close") : null;
                  if (e == null) return <td key={d} className="none" title={`${t} · ${dayLabel(d)}: not graded`} />;
                  const k = Math.min(1, e / CAP);
                  const lost = c != null && e > c;
                  return (
                    <td
                      key={d}
                      style={{ background: `color-mix(in srgb, var(--ink) ${Math.round(6 + k * 88)}%, transparent)` }}
                      className={lost ? "lost" : ""}
                      title={`${t} · ${dayLabel(d)}: the Bell missed by ${e.toFixed(0)} bp, the close by ${c?.toFixed(0) ?? "—"} bp`}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="heat-key">
        <span className="label">Miss</span>
        <span className="heat-ramp" aria-hidden />
        <span className="label">0 → {CAP}+ bp</span>
        <span className="heat-dot" aria-hidden />
        <span className="label">The prior close was nearer the open than the Bell</span>
        <span className="heat-live" aria-hidden />
        <span className="label">Locked live</span>
      </div>
    </div>
  );
}
