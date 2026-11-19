import Link from "next/link";
import Social from "./Social";
import FootStatus from "./FootStatus";
import { EXPLORER, REGISTRY, getSeals } from "@/lib/seal";

export default async function Footer() {
  const seals = await getSeals().catch(() => ({}));
  const last = Object.values(seals).sort((a, b) => b.session.localeCompare(a.session))[0];
  return (
    <footer className="foot">
      <div className="wrap">
        <FootStatus seal={last ? { session: last.session, tx: last.tx, at: last.at } : null} contract={REGISTRY} explorer={EXPLORER} />
        <div className="foot-grid">
          <div>
            <p style={{ color: "var(--ink)", fontSize: 22, lineHeight: 1.3, maxWidth: "18em" }}>
              Wall Street sleeps sixteen hours a day. Its stocks trade through all of them, on-chain.
            </p>
            <p>ANGELUS publishes what those hours say about the next opening bell, seals it before the open, and grades itself every morning.</p>
            <div style={{ marginTop: 18 }}><Social size={17} labels /></div>
          </div>
          <div>
            <p className="label" style={{ marginBottom: 14 }}>The night</p>
            <ul>
              <li><Link href="/board">Tonight&apos;s board</Link></li>
              <li><Link href="/edition">Tonight&apos;s edition</Link></li>
              <li><Link href="/watch">Night Watch</Link></li>
              <li><Link href="/flow">Flow</Link></li>
              <li><Link href="/calls">Calls &amp; season</Link></li>
              <li><Link href="/token">$ANGELUS</Link></li>
              <li><a href="/calendar.ics">Add to calendar</a></li>
            </ul>
          </div>
          <div>
            <p className="label" style={{ marginBottom: 14 }}>The proof</p>
            <ul>
              <li><Link href="/record">Track record</Link></li>
              <li><Link href="/verify">Verify a seal</Link></li>
              <li><Link href="/ledger">The ledger</Link></li>
              <li><Link href="/replay">Replay a night</Link></li>
              <li><Link href="/docs">Method</Link></li>
              <li><Link href="/docs#open-data">Open data</Link></li>
            </ul>
          </div>
          <div>
            <p className="label" style={{ marginBottom: 14 }}>Sources</p>
            <ul>
              <li><a href="https://dexscreener.com/robinhood" target="_blank" rel="noreferrer">Pools · DexScreener</a></li>
              <li><a href="https://www.geckoterminal.com/robinhood/pools" target="_blank" rel="noreferrer">History · GeckoTerminal</a></li>
              <li><span className="mute">Official prices · consolidated tape</span></li>
              <li><span className="mute">Issuers · Robinhood, xStocks, Ondo</span></li>
            </ul>
          </div>
        </div>
        <div className="foot-word" aria-hidden>ANGELUS</div>
        <div className="colophon">
          <span className="label">Built on Robinhood Chain · times in New York (ET)</span>
          <span className="label">Estimates, not advice. Not affiliated with Robinhood, Nasdaq or NYSE. <Link href="/terms" className="u">Terms</Link></span>
        </div>
      </div>
    </footer>
  );
}
