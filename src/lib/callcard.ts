import "server-only";
import { isAddress } from "viem";
import { callsList } from "./store";
import { scoreCalls, type ScoredCall } from "./season";
import { listing } from "./registry";

/** Look up one stored call. Share links carry only who, what and when; the rest comes from the store. */
export async function findCall(a: string | null, t: string | null, d: string | null): Promise<(ScoredCall & { name: string }) | null> {
  if (!a || !t || !d || !isAddress(a) || !listing(t) || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const rows = await callsList({ address: a.toLowerCase(), session: d }).catch(() => []);
  const row = rows.find((r) => r.ticker === t.toUpperCase());
  if (!row) return null;
  const [scored] = await scoreCalls([row]);
  return { ...scored, name: listing(t)!.name };
}

export function callQuery(c: { address: string; ticker: string; session: string }): string {
  return `a=${c.address}&t=${c.ticker}&d=${c.session}`;
}
