import Link from "next/link";
import Social from "./Social";

export default function Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <p style={{ color: "var(--ink)", fontSize: 22, lineHeight: 1.3, maxWidth: "18em" }}>
              Wall Street sleeps sixteen hours a day. Its stocks trade through all of them, on-chain.
            </p>
            <p>ANGELUS publishes what those hours say about the next opening bell, and grades itself every morning.</p>
          </div>
          <div>
            <p className="label" style={{ marginBottom: 14 }}>Read</p>
            <ul>
              <li><Link href="/board">Tonight&apos;s board</Link></li>
              <li><Link href="/edition">Tonight&apos;s edition</Link></li>
              <li><Link href="/record">Track record</Link></li>
              <li><Link href="/calls">Calls &amp; season</Link></li>
              <li><Link href="/watch">Night Watch</Link></li>
              <li><Link href="/flow">Flow</Link></li>
              <li><Link href="/docs">Method</Link></li>
              <li><Link href="/docs#open-data">Open data</Link></li>
              <li><Link href="/docs#seal">Contract</Link></li>
              <li><Link href="/terms">Terms</Link></li>
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
        <div className="colophon">
          <span className="label" style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>Built on Robinhood Chain · times in New York (ET) <Social size={15} /></span>
          <span className="label">Estimates, not advice. Not affiliated with Robinhood, Nasdaq or NYSE. <Link href="/terms" className="u">Terms</Link></span>
        </div>
      </div>
    </footer>
  );
}
