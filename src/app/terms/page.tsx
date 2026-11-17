import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import Link from "next/link";
import SkyBand from "@/components/belfry/SkyBand";

export const metadata: Metadata = pageMeta({ title: "Terms", description: "What ANGELUS is, what it is not, and the rules for using it.", path: "/terms" });

const UPDATED = "November 18, 2026";

const SECTIONS: { h: string; p: React.ReactNode[] }[] = [
  {
    h: "What ANGELUS is",
    p: [
      "ANGELUS publishes estimates of the next official opening price of a set of US stocks, made from the prices of tokens that track those stocks on public blockchains while the exchange is closed. It also keeps a public record of how far those estimates missed, and runs a free prediction game called Calls.",
      "Everything on the site is published for information and entertainment.",
    ],
  },
  {
    h: "Not investment advice",
    p: [
      "Nothing on ANGELUS is investment, financial, legal or tax advice, a recommendation to buy or sell anything, or an offer of any security, token or financial product. The Bell is a model output. It can be wrong, sometimes by a lot, and past accuracy says nothing certain about future accuracy.",
      "Do your own research and, if you need advice, ask a licensed professional. You alone are responsible for any decision you make.",
    ],
  },
  {
    h: "Data and its limits",
    p: [
      "Pool prices come from DexScreener, hourly history from GeckoTerminal, official daily open and close prices from a public market-data feed, and company logos from Financial Modeling Prep. These sources can be late, incomplete or wrong, and ANGELUS may filter, delay or omit data it judges unreliable.",
      "The bells' sound, off unless you turn it on, is a public-domain recording of a 15 cm bell from Wikimedia Commons.",
      "Tokenized stocks are issued by third parties (Robinhood, xStocks, Ondo and others). A token's price is not the stock's price, a token can trade at a premium or discount, and some tokens may not be available where you live.",
    ],
  },
  {
    h: "Calls",
    p: [
      "Calls are free. You sign a plain text message with your wallet; no transaction is sent, no gas is paid and nothing is deposited. ANGELUS never asks for a private key or seed phrase, and never asks you to approve a token or move funds to take part.",
      "A call is settled by the official opening price of the session it names. Calls are recorded once and cannot be edited. Season tables are kept for the record and for fun. There are no prizes, rewards or payouts for calls.",
      "We may remove calls that look automated, abusive or made to game the table.",
    ],
  },
  {
    h: "Your wallet address",
    p: [
      "When you make a call, your public wallet address, the call and your signature are stored and shown publicly (in the season table and on your profile page). Do not make calls from an address you want to keep private.",
      "ANGELUS does not use tracking cookies. Page views are counted with Vercel Web Analytics, which sets no cookies and stores no personal data. Your dark or light choice and your sound setting are stored in your own browser.",
    ],
  },
  {
    h: "The $ANGELUS token",
    p: [
      "The $ANGELUS token, if and when launched, is a community token. It is not a share, gives no claim on revenue or assets, and does not change any number, weight or score on the site. Only the contract address published on the token page is ours.",
    ],
  },
  {
    h: "Trademarks",
    p: [
      "Company names, tickers and logos belong to their owners and are shown only to identify the stock each row refers to. ANGELUS is independent and is not affiliated with, endorsed by or sponsored by Robinhood, Nasdaq, NYSE, any listed company, or any token issuer.",
    ],
  },
  {
    h: "No warranty",
    p: [
      "The site is provided as is, without warranty of any kind. To the fullest extent the law allows, ANGELUS is not liable for any loss arising from using the site, relying on its numbers, or being unable to use it.",
    ],
  },
  {
    h: "Changes",
    p: [
      <>These terms can change. The date at the top says when they last did. The method behind every number is on the <Link href="/docs" className="u">Method</Link> page.</>,
    ],
  },
];

export default function Terms() {
  return (
    <>
      <SkyBand>
        <header className="wrap grid-2" style={{ paddingBottom: 40 }}>
          <div>
            <p className="label" style={{ marginBottom: 18 }}>Terms · updated {UPDATED}</p>
            <h1 className="h2">Read this <em>before the bell.</em></h1>
          </div>
          <p className="lede" style={{ alignSelf: "end", margin: 0 }}>The short version: ANGELUS publishes estimates, not advice. Calls are free, public and signed, never paid.</p>
        </header>
      </SkyBand>
      <div className="wrap">
        <div style={{ borderTop: "1px solid var(--rule-2)" }}>
          {SECTIONS.map((s, i) => (
            <section key={s.h} className="doc-row" style={{ display: "grid", gridTemplateColumns: "minmax(160px, 260px) minmax(0, 1fr)", gap: 28, padding: "28px 0", borderBottom: "1px solid var(--rule)" }}>
              <h2 className="h3" style={{ fontSize: 24 }}><span className="label" style={{ display: "block", marginBottom: 8 }}>{String(i + 1).padStart(2, "0")}</span>{s.h}</h2>
              <div className="prose">{s.p.map((t, j) => <p key={j}>{t}</p>)}</div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
