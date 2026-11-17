import "server-only";
import { createPublicClient, createWalletClient, defineChain, encodeAbiParameters, http, keccak256, stringToHex, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { kvGet, kvSet } from "./store";
import type { LockRow } from "./record";

// The nightly seal: each session's locked Bell, written to BellRegistry on Robinhood Chain before the open.
// Off until NEXT_PUBLIC_BELL_REGISTRY (contract) and KEEPER_PRIVATE_KEY (its keeper) are set.

export const robinhood = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [process.env.ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com"] } },
  blockExplorers: { default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" } },
});

export const REGISTRY = (process.env.NEXT_PUBLIC_BELL_REGISTRY || "") as `0x${string}` | "";
export const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL || robinhood.blockExplorers.default.url;
export const txUrl = (tx: string) => `${EXPLORER}/tx/${tx}`;
export const addressUrl = (a: string) => `${EXPLORER}/address/${a}`;

const ABI = [
  {
    type: "function",
    name: "seal",
    stateMutability: "nonpayable",
    inputs: [
      { name: "session", type: "uint32" },
      { name: "tickers", type: "bytes8[]" },
      { name: "closes", type: "uint64[]" },
      { name: "bells", type: "uint64[]" },
    ],
    outputs: [{ name: "digest", type: "bytes32" }],
  },
  {
    type: "function",
    name: "sealOf",
    stateMutability: "view",
    inputs: [{ name: "session", type: "uint32" }],
    outputs: [{ name: "", type: "tuple", components: [{ name: "digest", type: "bytes32" }, { name: "sealedAt", type: "uint64" }, { name: "count", type: "uint16" }] }],
  },
] as const;

export interface SealArgs {
  session: number; // yyyymmdd
  tickers: Hex[]; // bytes8, ascending
  closes: bigint[]; // 6 decimals
  bells: bigint[]; // 6 decimals
}

export interface SealRecord {
  session: string; // yyyy-mm-dd
  digest: Hex;
  /** Null when an earlier run sealed it but did not record the hash; the BellSealed event has it. */
  tx: Hex | null;
  at: number;
  contract: string;
  stocks: { ticker: string; close: string; bell: string }[];
}

const micro = (x: number) => BigInt(Math.round(x * 1e6));
const usd = (v: bigint) => (Number(v) / 1e6).toFixed(6);

/** The exact numbers the contract receives: tickers ascending as bytes8, prices in micro-dollars. */
export function sealArgs(session: string, rows: LockRow[]): SealArgs | null {
  const usable = rows.filter((r) => r.est.bell != null && r.close > 0).sort((a, b) => (a.ticker < b.ticker ? -1 : a.ticker > b.ticker ? 1 : 0));
  if (!usable.length) return null;
  return {
    session: Number(session.replaceAll("-", "")),
    tickers: usable.map((r) => stringToHex(r.ticker, { size: 8 })),
    closes: usable.map((r) => micro(r.close)),
    bells: usable.map((r) => micro(r.est.bell!)),
  };
}

/** The digest the contract stores: keccak256(abi.encode(session, tickers, closes, bells)). Anyone can recompute it. */
export function digestOf(a: SealArgs): Hex {
  return keccak256(
    encodeAbiParameters(
      [{ type: "uint32" }, { type: "bytes8[]" }, { type: "uint64[]" }, { type: "uint64[]" }],
      [a.session, a.tickers, a.closes, a.bells],
    ),
  );
}

export function sealingEnabled(): boolean {
  return !!REGISTRY && /^0x[0-9a-fA-F]{64}$/.test(process.env.KEEPER_PRIVATE_KEY || "");
}

export async function getSeals(): Promise<Record<string, SealRecord>> {
  return (await kvGet<Record<string, SealRecord>>("seals").catch(() => null)) ?? {};
}

/**
 * Seal one session on-chain and remember the transaction. Safe to call again: a session already
 * sealed (here or on-chain) is not sent twice.
 */
export async function sealSession(session: string, rows: LockRow[]): Promise<SealRecord | { skipped: string }> {
  if (!sealingEnabled()) return { skipped: "sealing is off (no contract or keeper key)" };
  const seals = await getSeals();
  if (seals[session]) return seals[session];
  const args = sealArgs(session, rows);
  if (!args) return { skipped: "nothing to seal" };

  const account = privateKeyToAccount(process.env.KEEPER_PRIVATE_KEY as Hex);
  const transport = http(robinhood.rpcUrls.default.http[0], { timeout: 20_000 });
  const pub = createPublicClient({ chain: robinhood, transport });
  const wallet = createWalletClient({ chain: robinhood, transport, account });
  const address = REGISTRY as `0x${string}`;
  const digest = digestOf(args);

  // Already on-chain (e.g. an earlier run sent it but did not get to save the receipt)?
  const existing = await pub.readContract({ address, abi: ABI, functionName: "sealOf", args: [args.session] });
  let tx: Hex | null;
  if (existing.digest !== `0x${"0".repeat(64)}`) {
    if (existing.digest !== digest) return { skipped: `session already sealed on-chain with a different digest ${existing.digest}` };
    tx = null; // sealed earlier; the transaction hash is in the BellSealed event
  } else {
    const { request } = await pub.simulateContract({ address, abi: ABI, functionName: "seal", args: [args.session, args.tickers, args.closes, args.bells], account });
    tx = await wallet.writeContract(request);
    const receipt = await pub.waitForTransactionReceipt({ hash: tx, timeout: 60_000 });
    if (receipt.status !== "success") throw new Error(`seal transaction reverted: ${tx}`);
  }

  const rec: SealRecord = {
    session,
    digest,
    tx,
    at: Date.now(),
    contract: address,
    stocks: args.tickers.map((_, i) => ({ ticker: rows.find((r) => stringToHex(r.ticker, { size: 8 }) === args.tickers[i])!.ticker, close: usd(args.closes[i]), bell: usd(args.bells[i]) })),
  };
  await kvSet("seals", { ...seals, [session]: rec });
  return rec;
}
