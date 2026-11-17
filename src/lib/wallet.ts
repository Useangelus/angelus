import "server-only";
import { isAddress } from "viem";
import { callsList } from "./store";
import { scoreCalls, type ScoredCall } from "./season";

// One wallet's record from its signed calls. Shared by the profile page and its share card.

export interface WalletRecord {
  address: string;
  calls: ScoredCall[];
  settled: ScoredCall[];
  won: number;
  lost: number;
  pending: number;
  rate: number | null;
  streak: { current: number; kind: "won" | "lost" | null; best: number };
  byStock: { ticker: string; won: number; lost: number }[];
}

export async function walletRecord(address: string): Promise<WalletRecord | null> {
  if (!isAddress(address)) return null;
  const a = address.toLowerCase();
  const calls = await scoreCalls(await callsList({ address: a }));
  const settled = calls.filter((c) => c.outcome === "won" || c.outcome === "lost").sort((x, y) => y.session.localeCompare(x.session));
  const won = settled.filter((c) => c.outcome === "won").length;

  // Current streak counts back from the newest settled call; best is the longest run of right calls.
  const kind = (settled[0]?.outcome as "won" | "lost" | undefined) ?? null;
  let current = 0;
  for (const c of settled) { if (c.outcome === kind) current++; else break; }
  let best = 0, run = 0;
  for (const c of settled.slice().reverse()) { run = c.outcome === "won" ? run + 1 : 0; best = Math.max(best, run); }

  const map = new Map<string, { won: number; lost: number }>();
  for (const c of settled) {
    const s = map.get(c.ticker) ?? { won: 0, lost: 0 };
    if (c.outcome === "won") s.won++; else s.lost++;
    map.set(c.ticker, s);
  }

  return {
    address: a,
    calls,
    settled,
    won,
    lost: settled.length - won,
    pending: calls.filter((c) => c.outcome === "pending").length,
    rate: settled.length ? won / settled.length : null,
    streak: { current, kind, best },
    byStock: [...map.entries()].map(([ticker, s]) => ({ ticker, ...s })).sort((x, y) => y.won + y.lost - (x.won + x.lost)),
  };
}
