import type { Metadata } from "next";
import Link from "next/link";
import { findCall, callQuery } from "@/lib/callcard";
import { dayLabel } from "@/lib/clock";
import { money, short } from "@/lib/format";
import SkyBand from "@/components/belfry/SkyBand";
import { pageMeta } from "@/lib/meta";

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const c = await findCall(one(sp.a), one(sp.t), one(sp.d));
  if (!c) return { title: "Call", robots: { index: false } };
  const title = `${c.ticker} ${c.side} the Bell · ${dayLabel(c.session)}`;
  const image = { url: `/call/image?${callQuery(c)}`, width: 1600, height: 900, alt: title };
  return pageMeta({ title, description: `A signed call: ${c.ticker} ${c.side} the Bell at the opening bell of ${dayLabel(c.session)}. No deposit, settled by the official open.`, path: `/call?${callQuery(c)}`, image, noindex: true });
}

export default async function CallPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const c = await findCall(one(sp.a), one(sp.t), one(sp.d));
  return (
    <>
      <SkyBand>
        <header className="wrap grid-2" style={{ paddingBottom: 40 }}>
          <div>
            <p className="label" style={{ marginBottom: 18 }}>A signed call</p>
            <h1 className="h2">{c ? <>{c.ticker} <em>{c.side}</em> the Bell.</> : <>This call <em>was not found.</em></>}</h1>
          </div>
          <p className="mute" style={{ alignSelf: "end", margin: 0 }}>
            {c
              ? <>Signed by {short(c.address)} for the opening bell of {dayLabel(c.session)}, against the Bell at {money(c.ref)}. {c.outcome === "pending" ? "It settles at 09:30 ET." : `The stock opened at ${money(c.open)}.`}</>
              : "The link may be incomplete, or the call was never recorded."}
          </p>
        </header>
      </SkyBand>
      <div className="wrap">
        {c && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/call/image?${callQuery(c)}`} alt={`${c.ticker} ${c.side} the Bell`} width={1600} height={900} style={{ width: "100%", height: "auto", display: "block", border: "1px solid var(--rule-2)" }} />
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
              <a className="btn ghost" href={`/call/image?${callQuery(c)}&s=2&download=1`}>Download 3200×1800</a>
            </div>
          </>
        )}
        <div style={{ marginTop: 40 }}>
          <Link href="/calls" className="btn">Make your own call <span className="arr">→</span></Link>
        </div>
      </div>
    </>
  );
}
