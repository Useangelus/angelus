"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createWalletClient, custom, getAddress, type EIP1193Provider } from "viem";
import { callMessage } from "@/lib/callmsg";
import { clock, span, dayLabel } from "@/lib/clock";
import { money, pct, move, short } from "@/lib/format";
import { useClock } from "./useClock";
import { TickerCell } from "./BellGlyph";

interface Row { ticker: string; name: string; close: number; bell: number | null }
interface MyCall { ticker: string; session: string; side: "over" | "under"; ref: number; open: number | null; outcome: string }

const WC_PROJECT = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || "";

declare global {
  interface Window { ethereum?: EIP1193Provider }
}

export default function CallSheet({ rows, session }: { rows: Row[]; session: string }) {
  const now = useClock();
  const c = now ? clock(now) : null;
  const [address, setAddress] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string; share?: string } | null>(null);
  const [mine, setMine] = useState<MyCall[]>([]);
  const provider = useRef<EIP1193Provider | null>(null);
  const [hasInjected, setHasInjected] = useState(false);

  const load = useCallback(async (a: string) => {
    const r = await fetch(`/api/calls?address=${a}`, { cache: "no-store" });
    if (r.ok) setMine((await r.json()).calls);
  }, []);

  useEffect(() => {
    const eth = window.ethereum;
    if (!eth) return;
    eth.request({ method: "eth_accounts" }).then((acc) => {
      setHasInjected(true);
      const a = (acc as string[])[0];
      if (a) { provider.current = eth; setAddress(getAddress(a)); load(a); }
    }).catch(() => {});
  }, [load]);

  async function connectInjected() {
    setMsg(null);
    const eth = window.ethereum;
    if (!eth) return connectWalletConnect();
    try {
      const acc = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      provider.current = eth;
      const a = getAddress(acc[0]);
      setAddress(a);
      load(a);
    } catch {
      setMsg({ tone: "err", text: "Wallet connection was declined." });
    }
  }

  // Phones and browsers without a wallet extension: pair any mobile wallet by QR or deep link.
  async function connectWalletConnect() {
    setMsg(null);
    if (!WC_PROJECT) {
      setMsg({ tone: "err", text: "No browser wallet found. Open this page in a wallet's browser, or install one (MetaMask, Rabby, Coinbase Wallet)." });
      return;
    }
    try {
      const { EthereumProvider } = await import("@walletconnect/ethereum-provider");
      const wc = await EthereumProvider.init({
        projectId: WC_PROJECT,
        optionalChains: [1],
        showQrModal: true,
        metadata: { name: "ANGELUS", description: "Call the opening bell over or under the Bell.", url: window.location.origin, icons: [`${window.location.origin}/icon-192.png`] },
      });
      await wc.connect();
      const a = wc.accounts[0];
      if (!a) throw new Error("no account");
      provider.current = wc as unknown as EIP1193Provider;
      setAddress(getAddress(a));
      load(a);
    } catch {
      setMsg({ tone: "err", text: "WalletConnect was closed before a wallet connected." });
    }
  }

  function shareHref(t: string, side: string, ref: number, s: string, a: string) {
    const url = `${window.location.origin}/call?a=${a.toLowerCase()}&t=${t}&d=${s}`;
    const text = `I called ${t} ${side} the Bell (${money(ref)}) for the opening bell of ${dayLabel(s)}. Signed, no deposit, settled at 09:30 ET.`;
    return `https://x.com/intent/post?via=useangelus&text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  }

  async function call(row: Row, side: "over" | "under") {
    if (!address || !row.bell || !provider.current) return;
    setBusy(row.ticker + side);
    setMsg(null);
    try {
      const ref = Number(row.bell.toFixed(4));
      const wallet = createWalletClient({ transport: custom(provider.current) });
      const message = callMessage({ ticker: row.ticker, side, ref, session, address });
      const signature = await wallet.signMessage({ account: address as `0x${string}`, message });
      const r = await fetch("/api/calls", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address, ticker: row.ticker, side, ref, session, signature }) });
      const j = await r.json();
      if (!r.ok) setMsg({ tone: "err", text: j.error || "The call was not recorded." });
      else {
        setMsg({ tone: "ok", text: `Recorded: ${row.ticker} opens ${side} ${money(ref)}. The bell settles it at 09:30 ET.`, share: shareHref(row.ticker, side, ref, session, address) });
        load(address);
      }
    } catch {
      setMsg({ tone: "err", text: "Signature was cancelled." });
    } finally {
      setBusy(null);
    }
  }

  const open = c?.callsOpen && c.session === session;
  const called = new Set(mine.filter((m) => m.session === session).map((m) => m.ticker));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", padding: "18px 0", borderTop: "1px solid var(--rule-2)", borderBottom: "1px solid var(--rule)" }}>
        <span className="label">
          {c == null ? " " : open ? <>Calls for {dayLabel(session)} lock in <b style={{ color: "var(--ink)" }}>{span(c.lockAt - c.now)}</b></> :
            c.phase === "regular" ? <>Calls open at the closing bell, in {span(c.closeAt - c.now)}</> : <>Locked. Settles at the bell in {span(c.openAt - c.now)}</>}
        </span>
        {address ? (
          <a href={`/w/${address.toLowerCase()}`} className="label u" style={{ color: "var(--ink)" }} title="Your calls and record"><span className="dot" /> {short(address)}</a>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn" onClick={connectInjected}>Connect wallet</button>
            {hasInjected && WC_PROJECT && <button className="btn ghost" onClick={connectWalletConnect}>WalletConnect</button>}
          </div>
        )}
      </div>

      {msg && (
        <p role="status" style={{ margin: "16px 0 0", fontSize: 15, color: msg.tone === "ok" ? "var(--verd)" : "var(--down)", display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          {msg.text}
          {msg.share && <a className="btn ghost" style={{ padding: "7px 12px" }} href={msg.share} target="_blank" rel="noreferrer">Post on X</a>}
        </p>
      )}

      <div className="scroll-x" style={{ marginTop: 8 }}>
        <table className="ledger calls-sheet">
          <thead><tr><th>Stock</th><th className="hide-sm">Close</th><th>The Bell</th><th className="hide-sm">Gap</th><th style={{ textAlign: "right" }}>Call</th></tr></thead>
          <tbody>
            {rows.filter((r) => r.bell).map((r) => (
              <tr key={r.ticker}>
                <td><TickerCell ticker={r.ticker} name={r.name} gap={move(r.bell, r.close)} /></td>
                <td className="hide-sm">{money(r.close)}</td>
                <td className="bell">{money(r.bell)}</td>
                <td className="hide-sm">{pct(move(r.bell, r.close))}</td>
                <td>
                  {called.has(r.ticker) ? (
                    <span className="pill live">Called · {mine.find((m) => m.ticker === r.ticker && m.session === session)?.side}</span>
                  ) : (
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      <button className="btn ghost call-btn" style={{ padding: "8px 12px" }} disabled={!open || !address || !!busy} onClick={() => call(r, "over")}>{busy === r.ticker + "over" ? "Signing" : "Over"}</button>
                      <button className="btn ghost call-btn" style={{ padding: "8px 12px" }} disabled={!open || !address || !!busy} onClick={() => call(r, "under")}>{busy === r.ticker + "under" ? "Signing" : "Under"}</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {address && (
        <div style={{ marginTop: 48 }}>
          <p className="label" style={{ marginBottom: 12 }}>Your calls</p>
          {mine.length ? (
            <div className="scroll-x">
              <table className="ledger">
                <thead><tr><th>Session</th><th>Stock</th><th>Call</th><th className="hide-sm">Open</th><th>Result</th><th>Card</th></tr></thead>
                <tbody>
                  {mine.map((m) => (
                    <tr key={m.session + m.ticker}>
                      <td style={{ fontFamily: "var(--f-serif)", fontSize: 16 }}>{dayLabel(m.session)}</td>
                      <td>{m.ticker}</td>
                      <td>{m.side} {money(m.ref)}</td>
                      <td className="hide-sm">{money(m.open)}</td>
                      <td className={m.outcome === "won" ? "up" : m.outcome === "lost" ? "down" : "mute"}>{m.outcome}</td>
                      <td>
                        <a className="u" href={`/call?a=${address.toLowerCase()}&t=${m.ticker}&d=${m.session}`}>View</a>
                        {" · "}
                        <a className="u" href={shareHref(m.ticker, m.side, m.ref, m.session, address)} target="_blank" rel="noreferrer">Post</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="note">No calls from this wallet yet.</p>}
        </div>
      )}
    </div>
  );
}
