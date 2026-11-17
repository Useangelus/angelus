import "server-only";
import { LISTINGS, INDEX_TICKER, type ChainId } from "./registry";
import { official, hourly, tokenPairs, type Official } from "./sources";
import { nyTime, prevTradingDay, isTradingDay, LOCK_HOUR, closeMinutes } from "./clock";
import { chainQuote, estimate, beta, shrink, weights, bps, type Estimates, type ChainQuote } from "./agents";
import { kvGet, kvSet } from "./store";
import seed from "@/data/record.json";

export interface SessionRow {
  session: string;
  ticker: string;
  close: number;
  open: number;
  lock: Partial<Record<ChainId, number>>;
  indexMove: number | null;
  beta: number;
  k: number;
  est: Estimates;
  /** "replay": rebuilt from hourly history. "live": the number actually published and locked at 04:00 ET. */
  src?: "replay" | "live";
}

export interface RecordFile { updatedAt: number; rows: SessionRow[] }

/** What the lock cron stores each night, before the open is known. */
export type LockRow = Omit<SessionRow, "open" | "src"> & { at: number };
export type Locks = Record<string, LockRow[]>;

export type Scored = "close" | "raw" | "lauds" | "terce" | "compline" | "bell";
export const SCORED: Scored[] = ["bell", "lauds", "terce", "compline", "raw", "close"];

async function replayRecord(): Promise<RecordFile> {
  const stored = await kvGet<RecordFile>("record").catch(() => null);
  const s = seed as RecordFile;
  if (stored && stored.updatedAt >= (s.updatedAt ?? 0)) return stored;
  return s;
}

export async function getLocks(): Promise<Locks> {
  return (await kvGet<Locks>("locks").catch(() => null)) ?? {};
}

/** Replayed history, with every night that was locked live replacing its replay. */
export async function getRecord(): Promise<RecordFile> {
  const [replay, locks] = await Promise.all([replayRecord(), getLocks()]);
  const sessions = Object.keys(locks);
  if (!sessions.length) return { updatedAt: replay.updatedAt, rows: replay.rows.map((r) => ({ ...r, src: r.src ?? "replay" })) };
  const opens = new Map<string, number>();
  const offs = await Promise.all(LISTINGS.map((l) => official(l.ticker)));
  for (const o of offs) if (o) for (const d of o.days) opens.set(`${o.ticker}:${d.date}`, d.open);
  const live: SessionRow[] = [];
  for (const s of sessions) {
    for (const l of locks[s]) {
      const open = opens.get(`${l.ticker}:${s}`);
      if (open == null || +nyTime(s, 9, 30) > Date.now()) continue;
      const { at, ...rest } = l;
      void at;
      live.push({ ...rest, open, src: "live" });
    }
  }
  const liveSessions = new Set(live.map((r) => r.session));
  const rows = [...replay.rows.filter((r) => !liveSessions.has(r.session)).map((r) => ({ ...r, src: r.src ?? ("replay" as const) })), ...live]
    .sort((a, b) => a.session.localeCompare(b.session) || a.ticker.localeCompare(b.ticker));
  const lastLock = Math.max(0, ...sessions.flatMap((s) => locks[s].map((l) => l.at)));
  return { updatedAt: Math.max(replay.updatedAt, lastLock), rows };
}

export function errOf(row: SessionRow, who: Scored): number | null {
  if (who === "close") return bps(row.close, row.open);
  return bps(row.est[who], row.open);
}

/** Did the estimate point the right way from the close? Flat estimates count as misses. */
export function hitOf(row: SessionRow, who: Scored): boolean | null {
  const v = who === "close" ? null : row.est[who];
  if (v == null) return null;
  const a = Math.sign(row.open - row.close), e = Math.sign(v - row.close);
  if (a === 0) return null;
  return a === e;
}

export interface Summary { who: Scored; n: number; mae: number; median: number; hit: number | null }

export function summarize(rows: SessionRow[]): Summary[] {
  return SCORED.map((who) => {
    const errs = rows.map((r) => errOf(r, who)).filter((x): x is number => x != null).sort((a, b) => a - b);
    const hits = rows.map((r) => hitOf(r, who)).filter((x): x is boolean => x != null);
    return {
      who,
      n: errs.length,
      mae: errs.length ? errs.reduce((a, b) => a + b, 0) / errs.length : 0,
      median: errs.length ? errs[Math.floor(errs.length / 2)] : 0,
      hit: hits.length ? hits.filter(Boolean).length / hits.length : null,
    };
  });
}

/** Mean error per session (across tickers), oldest first. */
export function bySession(rows: SessionRow[], who: Scored): { session: string; err: number | null }[] {
  const days = [...new Set(rows.map((r) => r.session))].sort();
  return days.map((session) => {
    const e = rows.filter((r) => r.session === session).map((r) => errOf(r, who)).filter((x): x is number => x != null);
    return { session, err: e.length ? e.reduce((a, b) => a + b, 0) / e.length : null };
  });
}

export function sessionsOf(rows: SessionRow[]): string[] {
  return [...new Set(rows.map((r) => r.session))].sort();
}

/** Recent pooled error per agent, used to weight The Bell. */
export function recentErrors(rows: SessionRow[], before: string, sessions = 20) {
  const days = [...new Set(rows.filter((r) => r.session < before).map((r) => r.session))].sort().slice(-sessions);
  const set = new Set(days);
  const recent = rows.filter((r) => set.has(r.session));
  const mean = (who: "lauds" | "terce" | "compline") => {
    const e = recent.map((r) => errOf(r, who)).filter((x): x is number => x != null);
    return e.length >= 10 ? e.reduce((a, b) => a + b, 0) / e.length : null;
  };
  return { lauds: mean("lauds"), terce: mean("terce"), compline: mean("compline") };
}

export function shrinkHistory(rows: SessionRow[], ticker: string, before: string) {
  return rows
    .filter((r) => r.ticker === ticker && r.session < before && r.est.raw != null)
    .sort((a, b) => a.session.localeCompare(b.session))
    .map((r) => ({ tokenMove: r.est.raw! / r.close - 1, openMove: r.open / r.close - 1 }));
}

/** Last traded price at `sec` (close of the last finished hourly candle), if the pool traded since `since`. */
function priceAt(candles: number[][], sec: number, since: number): number | null {
  let last: number[] | null = null;
  for (const c of candles) {
    if (c[0] + 3600 > sec) break;
    last = c;
  }
  if (!last) return null;
  // The pool must have history on both sides of the close, or its price says nothing about tonight.
  if (candles[0][0] > since || sec - (last[0] + 3600) > 4 * 86400) return null;
  return last[4];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Hourly candles, kept in the store for six hours so an interrupted rebuild can resume. */
async function cachedHourly(chain: ChainId, pool: string): Promise<number[][]> {
  const key = `candles-${chain}-${pool.slice(0, 18)}`;
  const hit = await kvGet<{ at: number; c: number[][] }>(key).catch(() => null);
  if (hit && Date.now() - hit.at < 6 * 3600000 && hit.c.length) return hit.c;
  const c = await hourly(chain, pool);
  await sleep(2300);
  if (c.length) await kvSet(key, { at: Date.now(), c }).catch(() => {});
  return c;
}

/** Rebuild the full track record from public data. Slow (GeckoTerminal rate limits). */
export async function buildRecord(log: (s: string) => void = () => {}): Promise<RecordFile> {
  const offs = new Map<string, Official>();
  for (const l of LISTINGS) {
    const o = await official(l.ticker, "1y", 0);
    if (o) offs.set(l.ticker, o);
  }
  const idx = offs.get(INDEX_TICKER);
  const candles = new Map<string, number[][]>();
  const liq = new Map<string, number>();
  for (const l of LISTINGS) {
    for (const [chain, v] of Object.entries(l.venues) as [ChainId, { token: string; pool: string }][]) {
      const pairs = await tokenPairs(chain, v.token, 0);
      const close = offs.get(l.ticker)?.days.at(-1)?.close ?? 0;
      const q = close ? chainQuote(chain, pairs, close) : null;
      liq.set(`${l.ticker}:${chain}`, q?.liq ?? 0);
      // Chains too shallow for Lauds to hear are not worth a history request.
      if (chain !== "robinhood" && (q?.liq ?? 0) < 25000) { log(`${l.ticker} ${chain}: skipped (shallow)`); continue; }
      const c = await cachedHourly(chain, v.pool);
      candles.set(`${l.ticker}:${chain}`, c);
      log(`${l.ticker} ${chain}: ${c.length} candles`);
    }
  }

  const sessions = new Set<string>();
  for (const o of offs.values()) for (const d of o.days) if (isTradingDay(d.date)) sessions.add(d.date);
  const ordered = [...sessions].sort();
  const rows: SessionRow[] = [];
  for (const session of ordered) {
    const lockSec = +nyTime(session, LOCK_HOUR) / 1000;
    if (lockSec * 1000 > Date.now()) continue;
    const refDay = prevTradingDay(session);
    const closeSec = +nyTime(refDay, 0, closeMinutes(refDay)) / 1000;
    const errs = recentErrors(rows, session);
    const w = weights(errs);
    const idxBar = idx?.days.find((d) => d.date === refDay);
    const idxLock = priceAt(candles.get(`${INDEX_TICKER}:robinhood`) ?? [], lockSec, closeSec);
    const indexMove = idxBar && idxLock ? idxLock / idxBar.close - 1 : null;
    for (const l of LISTINGS) {
      const o = offs.get(l.ticker);
      const ref = o?.days.find((d) => d.date === refDay);
      const bar = o?.days.find((d) => d.date === session);
      if (!o || !ref || !bar) continue;
      const lock: Partial<Record<ChainId, number>> = {};
      const quotes: ChainQuote[] = [];
      for (const chain of Object.keys(l.venues) as ChainId[]) {
        const p = priceAt(candles.get(`${l.ticker}:${chain}`) ?? [], lockSec, closeSec);
        if (p == null || Math.abs(p / ref.close - 1) > 0.3) continue;
        lock[chain] = p;
        quotes.push({ chain, price: p, liq: liq.get(`${l.ticker}:${chain}`) || 1, pools: 1 });
      }
      if (!quotes.length) continue;
      const b = idx ? beta(o.days, idx.days, session) : 1;
      const k = shrink(shrinkHistory(rows, l.ticker, session));
      const est = estimate(ref.close, quotes, l.ticker === INDEX_TICKER ? (lock.robinhood ? lock.robinhood / ref.close - 1 : null) : indexMove, { beta: l.ticker === INDEX_TICKER ? 1 : b, k, weights: w });
      rows.push({ session, ticker: l.ticker, close: ref.close, open: bar.open, lock, indexMove, beta: b, k, est });
    }
  }
  return { updatedAt: Date.now(), rows };
}

export async function refreshRecord(log?: (s: string) => void): Promise<RecordFile> {
  const r = await buildRecord(log);
  await kvSet("record", r);
  return r;
}
