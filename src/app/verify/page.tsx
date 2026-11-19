import type { Metadata } from "next";
import Link from "next/link";
import SkyBand from "@/components/belfry/SkyBand";
import VerifyPanel from "@/components/VerifyPanel";
import { pageMeta } from "@/lib/meta";
import { EXPLORER, REGISTRY, getSeals } from "@/lib/seal";

export const revalidate = 60;
export const metadata: Metadata = pageMeta({ title: "Verify", description: "Check that a night's Bell was sealed on Robinhood Chain before the open: recompute the digest in your browser and compare it with the contract.", path: "/verify" });

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const [{ session }, seals] = await Promise.all([searchParams, getSeals().catch(() => ({}))]);
  const list = Object.values(seals)
    .sort((a, b) => b.session.localeCompare(a.session))
    .map((s) => ({ session: s.session, digest: s.digest, tx: s.tx, at: s.at, stocks: s.stocks }));
  return (
    <>
      <SkyBand>
        <header className="wrap grid-2" style={{ paddingBottom: 40 }}>
          <div>
            <p className="label" style={{ marginBottom: 18 }}>Verify</p>
            <h1 className="h2">Don&apos;t take our word. <em>Check the seal.</em></h1>
          </div>
          <div className="prose" style={{ alignSelf: "end" }}>
            <p className="mute">
              Every night at 04:00 ET the numbers ANGELUS will be graded on are fingerprinted and written to BellRegistry on Robinhood Chain.
              Pick a night: this page rebuilds the fingerprint from the published numbers, on your device, and compares it with the one on-chain.
            </p>
            <p className="note"><Link href="/ledger" className="u">Every lock and seal</Link> · <Link href="/docs#seal" className="u">How the seal works</Link></p>
          </div>
        </header>
      </SkyBand>
      <div className="wrap" style={{ paddingTop: 48 }}>
        {REGISTRY ? (
          <VerifyPanel seals={list} initial={session ?? null} contract={REGISTRY} explorer={EXPLORER} />
        ) : (
          <p className="mute">The contract is not live yet. Until it is, each night&apos;s locked numbers are published at <a className="u" href="/api/bell.json">/api/bell.json</a>.</p>
        )}
      </div>
    </>
  );
}
