import "server-only";
import { unstable_cache } from "next/cache";
import { LISTINGS, type ChainId } from "./registry";
import { hourly } from "./sources";
import { closeMinutes, nyTime, prevTradingDay } from "./clock";
import { getRecord, sessionsOf } from "./record";
import { HISTORY, covers, framesOf } from "./frames";
import { kvGet, kvSet } from "./store";

// A night, hour by hour, for the replay: from the closing bell to the opening bell, how far each stock's token
// stood from its official close. Hourly history comes from GeckoTerminal (the deepest pool per chain, Robinhood
// Chain first), the close, the Bell and the open from the public record.

export interface ReplayStock { ticker: string; name: string; close: number; bell: number | null; open: number; chain: ChainId; pools: { chain: ChainId; pool: string }[]; gaps: (number | null)[] }
export interface Replay { session: string; prevDay: string; start: number; lock: number; end: number; hours: number[]; stocks: ReplayStock[]; live: boolean }

const ORDER: ChainId[] = ["robinhood", "ethereum", "solana"];

// One pool's candles serve every night in the window, so each answer is kept for an hour on its own. An empty
// answer (rate-limited, or no history) is not kept: the next visit asks again only for what is still missing.
const pooled = unstable_cache(
  async (chain: ChainId, pool: string) => {
    const got = await hourly(chain, pool, 3600, HISTORY);
    if (!got.length) throw new Error("no candles");
    return got;
  },
  ["replay-candles-v1"],
  { revalidate: 3600 },
);
const candlesOf = (chain: ChainId, pool: string) => pooled(chain, pool).catch(() => [] as number[][]);
// The cron's slow path, kept the same way, so a run cut short by rate limits leaves its answers for the next run.
const pooledSlow = unstable_cache(
  async (chain: ChainId, pool: string) => {
    const got = await hourly(chain, pool, 0, HISTORY);
    if (!got.length) throw new Error("no candles");
    return got;
  },
  ["replay-candles-slow-v1"],
  { revalidate: 3600 },
);

// Finished nights are stored for good (key replay-<session>, listed in replay-index), written by
// /api/cron/replay after the open. A stored night never touches GeckoTerminal again.
const INDEX = "replay-index";
const keyOf = (session: string) => `replay-${session}`;
export const storedNights = async () => (await kvGet<string[]>(INDEX)) ?? [];

/** Nights that can be replayed: every stored night, plus graded nights recent enough to still have hourly candles. */
export async function replayable(): Promise<string[]> {
  const [rec, stored] = await Promise.all([getRecord(), storedNights()]);
  const since = Date.now() - (HISTORY - 24) * 3600_000;
  const recent = sessionsOf(rec.rows).filter((s) => +nyTime(prevTradingDay(s), 16) > since);
  return [...new Set([...stored, ...recent])].sort().reverse();
}

type Candles = (chain: ChainId, pool: string) => Promise<number[][]>;
const filled = (n: Replay) => n.stocks.filter((s) => s.gaps.some((g) => g != null)).length;

async function build(session: string, get: Candles = candlesOf, together = 4): Promise<Replay | null> {
  const rec = await getRecord();
  const rows = rec.rows.filter((r) => r.session === session);
  if (!rows.length) return null;
  const prevDay = prevTradingDay(session);
  const cm = closeMinutes(prevDay);
  const start = +nyTime(prevDay, Math.floor(cm / 60), cm % 60);
  const lock = +nyTime(session, 4);
  const end = +nyTime(session, 9, 30);
  const hours: number[] = [];
  for (let t = start; t <= end; t += 1800_000) hours.push(t); // a frame every half hour, the last at 09:30
  if (hours[hours.length - 1] !== end) hours.push(end);

  // GeckoTerminal answers about thirty requests a minute: ask four at a time, and if a chain has no history for
  // the night, try the next one.
  const one = async (l: (typeof LISTINGS)[number]): Promise<ReplayStock | null> => {
      const row = rows.find((r) => r.ticker === l.ticker);
      if (!row) return null;
      let chain: ChainId = ORDER.find((c) => l.venues[c]?.pool) ?? "robinhood";
      let candles: number[][] = [];
      const pools = ORDER.flatMap((c) => (l.venues[c]?.pool ? [{ chain: c, pool: l.venues[c]!.pool }] : []));
      for (const { chain: c, pool } of pools) {
        const got = await get(c, pool);
        if (covers(got, start, end)) { chain = c; candles = got; break; }
      }
      const gaps = framesOf(candles, hours, row.close);
      return { ticker: l.ticker, name: l.name, close: row.close, bell: row.est.bell, open: row.open, chain, pools, gaps };
  };
  const stocks: (ReplayStock | null)[] = [];
  for (let i = 0; i < LISTINGS.length; i += together) stocks.push(...(await Promise.all(LISTINGS.slice(i, i + together).map(one))));
  // A stock with no history here is still listed: the visitor's browser asks GeckoTerminal for it directly.
  const list = stocks.filter((s): s is ReplayStock => s != null);
  return { session, prevDay, start, lock, end, hours, stocks: list, live: rows[0].src === "live" };
}

// A past night never changes, so a finished build is kept for an hour. One with stocks missing (GeckoTerminal
// rate-limited it) is served once but not kept, so the next visitor gets a fresh try.
class Partial { constructor(readonly night: Replay | null) {} }
const kept = unstable_cache(
  async (session: string) => {
    const night = await build(session);
    const full = night != null && filled(night) >= night.stocks.length - 1;
    if (!full) throw new Partial(night);
    return night;
  },
  ["replay-night-v3"],
  { revalidate: 3600 },
);

export async function nightOf(session: string): Promise<Replay | null> {
  const stored = await kvGet<Replay>(keyOf(session));
  if (stored) return stored;
  try {
    return await kept(session);
  } catch (e) {
    if (e instanceof Partial) return e.night;
    throw e;
  }
}

/**
 * Stores every graded night in the candle window that is not stored yet. Run after the open by the cron.
 * Each pool is asked once, one at a time, waiting out rate limits (the slow path of hourly()); every night is then
 * built from the same candles. A night is stored only when every stock has history, so a bad run just tries again.
 */
export async function storeNights(budgetMs = 240_000): Promise<{ stored: string[]; incomplete: { session: string; filled: number; of: number }[] }> {
  const t0 = Date.now();
  const have = new Set(await storedNights());
  const rec = await getRecord();
  const since = Date.now() - (HISTORY - 24) * 3600_000;
  const todo = sessionsOf(rec.rows).filter((s) => +nyTime(prevTradingDay(s), 16) > since && +nyTime(s, 9, 30) < Date.now() && !have.has(s));
  const memo = new Map<string, Promise<number[][]>>();
  const patient: Candles = (chain, pool) => {
    const k = `${chain}:${pool}`;
    if (!memo.has(k)) memo.set(k, Date.now() - t0 > budgetMs ? Promise.resolve([]) : pooledSlow(chain, pool).catch(() => [] as number[][]));
    return memo.get(k)!;
  };
  const stored: string[] = [];
  const incomplete: { session: string; filled: number; of: number }[] = [];
  for (const session of todo) {
    const night = await build(session, patient, 1);
    if (!night) continue;
    if (filled(night) === night.stocks.length) {
      await kvSet(keyOf(session), night);
      have.add(session);
      stored.push(session);
    } else incomplete.push({ session, filled: filled(night), of: night.stocks.length });
  }
  if (stored.length) await kvSet(INDEX, [...have].sort());
  return { stored, incomplete };
}

