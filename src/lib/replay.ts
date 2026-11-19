import "server-only";
import { LISTINGS, type ChainId } from "./registry";
import { hourly } from "./sources";
import { closeMinutes, nyTime, prevTradingDay } from "./clock";
import { getRecord, sessionsOf } from "./record";

// A night, hour by hour, for the replay: from the closing bell to the opening bell, how far each stock's token
// stood from its official close. Hourly history comes from GeckoTerminal (the deepest pool per chain, Robinhood
// Chain first), the close, the Bell and the open from the public record.

export interface ReplayStock { ticker: string; name: string; close: number; bell: number | null; open: number; chain: ChainId; gaps: (number | null)[] }
export interface Replay { session: string; prevDay: string; start: number; lock: number; end: number; hours: number[]; stocks: ReplayStock[]; live: boolean }

const HISTORY = 400; // hours of candles asked for: a little over two weeks
const ORDER: ChainId[] = ["robinhood", "ethereum", "solana"];

/** Nights that can be replayed: graded, and recent enough to still have hourly candles. */
export async function replayable(): Promise<string[]> {
  const rec = await getRecord();
  const since = Date.now() - (HISTORY - 24) * 3600_000;
  return sessionsOf(rec.rows).filter((s) => +nyTime(prevTradingDay(s), 16) > since).reverse();
}

export async function nightOf(session: string): Promise<Replay | null> {
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
      for (const c of ORDER) {
        const pool = l.venues[c]?.pool;
        if (!pool) continue;
        const got = await hourly(c, pool, 3600, HISTORY);
        if (got.some((k) => k[0] * 1000 >= start - 6 * 3600_000 && k[0] * 1000 <= end)) { chain = c; candles = got; break; }
      }
      // the price at each frame: the last hourly close at or before it, carried forward through quiet hours
      let k = 0, last: number | null = null;
      const gaps = hours.map((t) => {
        while (k < candles.length && candles[k][0] * 1000 + 3600_000 <= t) { last = candles[k][4]; k++; }
        return last == null ? null : last / row.close - 1;
      });
      return { ticker: l.ticker, name: l.name, close: row.close, bell: row.est.bell, open: row.open, chain, gaps };
  };
  const stocks: (ReplayStock | null)[] = [];
  for (let i = 0; i < LISTINGS.length; i += 4) stocks.push(...(await Promise.all(LISTINGS.slice(i, i + 4).map(one))));
  const list = stocks.filter((s): s is ReplayStock => s != null);
  if (!list.some((s) => s.gaps.some((g) => g != null))) return null;
  return { session, prevDay, start, lock, end, hours, stocks: list, live: rows[0].src === "live" };
}
