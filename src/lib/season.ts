import "server-only";
import { callsList, type CallRow } from "./store";
import { getBoard } from "./live";
import { seasonOf } from "./callmsg";

export type Outcome = "won" | "lost" | "void" | "pending";
export interface ScoredCall extends CallRow { open: number | null; outcome: Outcome }

export async function scoreCalls(calls: CallRow[]): Promise<ScoredCall[]> {
  const b = await getBoard();
  const opens = new Map<string, number>();
  for (const r of b.rows) for (const d of r.days) opens.set(`${r.ticker}:${d.date}`, d.open);
  return calls.map((c) => {
    const open = opens.get(`${c.ticker}:${c.session}`) ?? null;
    const ref = Number(c.ref);
    let outcome: Outcome = "pending";
    if (open != null) outcome = open === ref ? "void" : (open > ref) === (c.side === "over") ? "won" : "lost";
    return { ...c, ref, open, outcome };
  });
}

export interface Standing { address: string; won: number; lost: number; pending: number; rate: number | null }

export async function season(month: string) {
  const all = await callsList({ since: `${month}-01` });
  const calls = await scoreCalls(all.filter((c) => seasonOf(c.session) === month));
  const by = new Map<string, Standing>();
  for (const c of calls) {
    const s = by.get(c.address) ?? { address: c.address, won: 0, lost: 0, pending: 0, rate: null };
    if (c.outcome === "won") s.won++;
    else if (c.outcome === "lost") s.lost++;
    else if (c.outcome === "pending") s.pending++;
    by.set(c.address, s);
  }
  const table = [...by.values()].map((s) => ({ ...s, rate: s.won + s.lost ? s.won / (s.won + s.lost) : null }))
    .sort((a, b) => b.won - a.won || (b.rate ?? 0) - (a.rate ?? 0) || a.lost - b.lost);
  const settled = calls.filter((c) => c.outcome === "won" || c.outcome === "lost");
  return { month, calls, table, total: calls.length, crowdRate: settled.length ? settled.filter((c) => c.outcome === "won").length / settled.length : null };
}
