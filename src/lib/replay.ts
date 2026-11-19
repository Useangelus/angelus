import "server-only";
import { unstable_cache } from "next/cache";
import { LISTINGS, type ChainId } from "./registry";
import { hourly } from "./sources";
import { closeMinutes, nyTime, prevTradingDay } from "./clock";
import { getRecord, sessionsOf } from "./record";
import { HISTORY, covers, framesOf } from "./frames";

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

/** Nights that can be replayed: graded, and recent enough to still have hourly candles. */
export async function replayable(): Promise<string[]> {
  const rec = await getRecord();
  const since = Date.now() - (HISTORY - 24) * 3600_000;
  return sessionsOf(rec.rows).filter((s) => +nyTime(prevTradingDay(s), 16) > since).reverse();
}

async function build(session: string): Promise<Replay | null> {
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
        const got = await candlesOf(c, pool);
        if (covers(got, start, end)) { chain = c; candles = got; break; }
      }
      const gaps = framesOf(candles, hours, row.close);
      return { ticker: l.ticker, name: l.name, close: row.close, bell: row.est.bell, open: row.open, chain, pools, gaps };
  };
  const stocks: (ReplayStock | null)[] = [];
  for (let i = 0; i < LISTINGS.length; i += 4) stocks.push(...(await Promise.all(LISTINGS.slice(i, i + 4).map(one))));
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
    const full = night != null && night.stocks.filter((s) => s.gaps.some((g) => g != null)).length >= night.stocks.length - 1;
    if (!full) throw new Partial(night);
    return night;
  },
  ["replay-night-v3"],
  { revalidate: 3600 },
);

export async function nightOf(session: string): Promise<Replay | null> {
  try {
    return await kept(session);
  } catch (e) {
    if (e instanceof Partial) return e.night;
    throw e;
  }
}
