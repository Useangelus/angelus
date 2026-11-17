import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import SkyBand from "@/components/belfry/SkyBand";
import Link from "next/link";

export const metadata: Metadata = pageMeta({ title: "$ANGELUS", description: "The ANGELUS token on Robinhood Chain.", path: "/token" });

export default function TokenPage() {
  const ca = process.env.NEXT_PUBLIC_TOKEN_CA;
  return (
    <>
    <SkyBand>
      <header className="wrap grid-2" style={{ paddingBottom: 48 }}>
        <div>
          <p className="label" style={{ marginBottom: 18 }}>$ANGELUS · Robinhood Chain</p>
          <h1 className="h2">{ca ? <>The token <em>is live.</em></> : <>The token <em>has not rung yet.</em></>}</h1>
        </div>
        <div className="prose" style={{ alignSelf: "end" }}>
          {ca ? (
            <>
              <p className="label">Contract</p>
              <p className="num" style={{ fontSize: 15, wordBreak: "break-all", color: "var(--ink)" }}>{ca}</p>
              <p><a className="u" href={`https://dexscreener.com/robinhood/${ca}`} target="_blank" rel="noreferrer">Chart on DexScreener</a></p>
            </>
          ) : (
            <p className="mute">No contract address is published yet. When it is, it will appear on this page and nowhere else first. Any address you see before that is not ours.</p>
          )}
        </div>
      </header>
    </SkyBand>
    <div className="wrap">
      <section className="sec">
        <div className="sec-head"><span className="label">What it does</span><h2 className="h2">A seat in the tower, <em>not a lever on the bell.</em></h2></div>
        <div className="grid-2">
          <div className="prose">
            <h3 style={{ marginTop: 0 }}>What it is</h3>
            <p>The flag of the people who stay up for the bell. Anything built for holders will be announced on this page, with its rules, before it goes live.</p>
            <p>The token never changes the Bell&apos;s number, the agents&apos; weights or anyone&apos;s score. The record stays the record.</p>
          </div>
          <div className="prose">
            <h3 style={{ marginTop: 0 }}>What it is not</h3>
            <p>Not a share of anything, not a claim on fees, not a promise of price. ANGELUS publishes estimates, not advice; read the <Link href="/docs" className="u">method</Link> before you trust a number.</p>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
