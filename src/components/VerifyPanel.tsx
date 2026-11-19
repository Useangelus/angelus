"use client";

import { useEffect, useMemo, useState } from "react";
import { digestFrom, type PublishedStock } from "@/lib/digest";

export interface PublicSeal { session: string; digest: string; tx: string | null; at: number; stocks: PublishedStock[] }

type Chain = { state: "idle" | "loading" | "done" | "error"; digest?: string; sealedAt?: number; count?: number; error?: string };

const fmtUtc = (t: number) => new Date(t).toISOString().replace("T", " ").slice(0, 16) + " UTC";
const fmtEt = (t: number) => new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(t) + " ET";
const day = (s: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date(`${s}T12:00:00Z`));

/**
 * Three steps, done in front of the visitor: the numbers ANGELUS published, their digest computed here in the
 * browser, and the digest Robinhood Chain holds for that night. If the last two agree, the numbers were sealed
 * before the open and nobody has touched them since.
 */
export default function VerifyPanel({ seals, initial, contract, explorer }: { seals: PublicSeal[]; initial: string | null; contract: string; explorer: string }) {
  const [session, setSession] = useState(initial && seals.some((s) => s.session === initial) ? initial : seals[0]?.session ?? "");
  const seal = seals.find((s) => s.session === session);
  const local = useMemo(() => (seal ? digestFrom(seal.session, seal.stocks) : ""), [seal]);
  const [chain, setChain] = useState<Chain>({ state: "loading" });

  useEffect(() => {
    if (!session) return;
    let alive = true;
    fetch(`/api/verify?session=${session}`)
      .then(async (r) => {
        const j = await r.json();
        if (!alive) return;
        if (!r.ok) return setChain({ state: "error", error: j.error ?? "no answer" });
        setChain(j.onchain ? { state: "done", digest: j.onchain.digest, sealedAt: j.onchain.sealedAt, count: j.onchain.count } : { state: "error", error: "nothing sealed on-chain for this night" });
      })
      .catch(() => alive && setChain({ state: "error", error: "Robinhood Chain did not answer" }));
    const url = new URL(location.href);
    url.searchParams.set("session", session);
    history.replaceState(null, "", url);
    return () => { alive = false; };
  }, [session]);

  if (!seals.length) return <p className="mute">No night has been sealed yet. The first seal is written at the next 04:00 ET lock.</p>;

  const match = chain.state === "done" && chain.digest?.toLowerCase() === local.toLowerCase();
  const openUtc = new Date(`${session}T13:30:00Z`).getTime(); // the contract's deadline: never later than the 09:30 ET open
  const intime = chain.sealedAt != null && chain.sealedAt < openUtc;
  const cast = `cast call ${contract} "sealOf(uint32)((bytes32,uint64,uint16))" ${session.replaceAll("-", "")} --rpc-url https://rpc.mainnet.chain.robinhood.com`;

  return (
    <div className="verify">
      <div className="v-pick">
        <label className="label" htmlFor="v-session">Night</label>
        <select id="v-session" value={session} onChange={(e) => { setChain({ state: "loading" }); setSession(e.target.value); }}>
          {seals.map((s) => (
            <option key={s.session} value={s.session}>{day(s.session)}</option>
          ))}
        </select>
        {seal?.tx ? <a className="label u" href={`${explorer}/tx/${seal.tx}`} target="_blank" rel="noreferrer">Seal transaction ↗</a> : null}
      </div>

      <ol className="v-steps">
        <li>
          <div className="v-n">01</div>
          <div>
            <h3>The numbers ANGELUS published</h3>
            <p className="note">Each stock&apos;s prior close and its Bell, in dollars with 6 decimals, exactly as they were sent to the contract at the lock.</p>
            <div className="scroll-x">
              <table className="ledger v-table">
                <thead><tr><th>Stock</th><th>Prior close</th><th>The Bell</th></tr></thead>
                <tbody>
                  {seal?.stocks.map((s) => (
                    <tr key={s.ticker}><td className="tk">{s.ticker}</td><td className="num">{s.close}</td><td className="num bell">{s.bell}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </li>
        <li>
          <div className="v-n">02</div>
          <div>
            <h3>Their digest, computed in your browser</h3>
            <p className="note">keccak256(abi.encode(session, tickers, closes, bells)). This runs on your device; nothing is taken from ANGELUS but the numbers above.</p>
            <code className="v-hash">{local}</code>
          </div>
        </li>
        <li>
          <div className="v-n">03</div>
          <div>
            <h3>What Robinhood Chain holds for this night</h3>
            <p className="note">BellRegistry.sealOf({session.replaceAll("-", "")}), read from the chain now.</p>
            <code className="v-hash">{chain.state === "loading" ? "reading the chain…" : chain.state === "done" ? chain.digest : chain.error}</code>
            {chain.state === "done" ? (
              <p className="note" style={{ marginTop: 10 }}>
                Sealed {fmtEt(chain.sealedAt!)} ({fmtUtc(chain.sealedAt!)}), {chain.count} stocks. The contract refuses any seal after 13:30 UTC on the session day.
              </p>
            ) : null}
          </div>
        </li>
      </ol>

      <div className={`v-verdict ${chain.state === "done" ? (match && intime ? "ok" : "bad") : ""}`} role="status">
        {chain.state === "loading" || chain.state === "idle" ? (
          <span>Checking…</span>
        ) : chain.state === "error" ? (
          <span>Could not read the chain: {chain.error}. Try again, or run the command below yourself.</span>
        ) : match && intime ? (
          <>
            <b>Match.</b> <span>These are the numbers sealed for {day(session)}, before Wall Street opened. Nobody, ANGELUS included, can change them now.</span>
          </>
        ) : (
          <>
            <b>No match.</b> <span>The published numbers do not produce the digest on-chain{!intime && match ? " (or the seal came after the open)" : ""}. Please tell us.</span>
          </>
        )}
      </div>

      <details className="v-self">
        <summary className="label u">Check it without ANGELUS</summary>
        <p className="note">Step 03 is read through this site. To leave us out of it entirely, ask the chain yourself with Foundry, or open the contract on Blockscout and call sealOf with {session.replaceAll("-", "")}:</p>
        <code className="v-hash" style={{ whiteSpace: "pre-wrap" }}>{cast}</code>
        <p className="note"><a className="u" href={`${explorer}/address/${contract}?tab=read_contract`} target="_blank" rel="noreferrer">BellRegistry on Blockscout ↗</a></p>
      </details>
    </div>
  );
}
