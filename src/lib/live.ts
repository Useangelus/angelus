import "server-only";
import { cache } from "react";
import { LISTINGS, INDEX_TICKER, listing, type ChainId } from "./registry";
import { fetchPairs, official, HOLD_MS, type Pair, type Official } from "./sources";
import { kvGet, kvSet } from "./store";
import { clock, type ClockState } from "./clock";
import { chainQuote, estimate, beta, shrink, weights, type ChainQuote, type Estimates, type Params } from "./agents";
import { getRecord, recentErrors, shrinkHistory, type RecordFile } from "./record";

export interface LiveRow {
  ticker: string;
  name: string;
  close: number;
  refDay: string;
  chains: ChainQuote[];
  pairs: Pair[];
  est: Estimates;
  params: Params;
  /** Official open of the session, once it has rung. */
  open: number | null;
  /** Latest official trade (regular hours). */
  last: number | null;
  days: Official["days"];
}

export interface Board {
  clock: ClockState;
  rows: LiveRow[];
  record: RecordFile;
  updatedAt: number;
}

type PairSnap = { at: number; pairs: Record<string, Pair[]> };
const SNAP_EVERY_MS = 10 * 60_000;
let snapSavedAt = 0;

/**
 * Pools for every listing. A venue DexScreener refused is filled from the last full snapshot
 * (stored, under HOLD_MS old), so a rate limit on a cold server still prices every bell.
 */
async function allPairs(): Promise<Pair[][]> {
  const jobs = LISTINGS.map((l) => (Object.entries(l.venues) as [ChainId, { token: string }][]).map(([chain, v]) => ({ chain, token: v.token, key: `${chain}:${v.token.toLowerCase()}` })));
  const res = await Promise.all(jobs.map((js) => Promise.all(js.map((j) => fetchPairs(j.chain, j.token)))));
  const now = Date.now();
  if (res.flat().some((r) => !r.ok)) {
    const snap = await kvGet<PairSnap>("pairs").catch(() => null);
    if (snap && now - snap.at < HOLD_MS) {
      return jobs.map((js, i) => js.flatMap((j, n) => (res[i][n].ok ? res[i][n].pairs : snap.pairs[j.key] ?? [])));
    }
  } else if (now - snapSavedAt > SNAP_EVERY_MS) {
    snapSavedAt = now;
    const pairs: Record<string, Pair[]> = {};
    jobs.forEach((js, i) => js.forEach((j, n) => { pairs[j.key] = res[i][n].pairs; }));
    await kvSet("pairs", { at: now, pairs } satisfies PairSnap).catch(() => {});
  }
  return res.map((r) => r.flatMap((x) => x.pairs));
}

export const getBoard = cache(async (): Promise<Board> => {
  const c = clock();
  const [record, offs, pairs] = await Promise.all([
    getRecord(),
    Promise.all(LISTINGS.map((l) => official(l.ticker))),
    allPairs(),
  ]);
  const byTicker = new Map(LISTINGS.map((l, i) => [l.ticker, { o: offs[i], p: pairs[i] }]));
  const idx = byTicker.get(INDEX_TICKER);
  const w = weights(recentErrors(record.rows, c.session));

  const refClose = (o: Official | null) => o?.days.find((d) => d.date === c.refDay)?.close ?? o?.days.filter((d) => d.date < c.session).at(-1)?.close ?? null;
  const idxClose = refClose(idx?.o ?? null);
  const idxRh = idx && idxClose ? chainQuote("robinhood", idx.p.filter((p) => p.chain === "robinhood"), idxClose) : null;
  const indexMove = idxRh && idxClose ? idxRh.price / idxClose - 1 : null;

  const rows: LiveRow[] = [];
  for (const l of LISTINGS) {
    const { o, p } = byTicker.get(l.ticker)!;
    const close = refClose(o);
    if (!o || !close) continue;
    const chains = (Object.keys(l.venues) as ChainId[])
      .map((ch) => chainQuote(ch, p.filter((x) => x.chain === ch), close))
      .filter((q): q is ChainQuote => q != null);
    const b = l.ticker === INDEX_TICKER ? 1 : idx?.o ? beta(o.days, idx.o.days, c.session) : 1;
    const k = shrink(shrinkHistory(record.rows, l.ticker, c.session));
    const params: Params = { beta: b, k, weights: w };
    const im = l.ticker === INDEX_TICKER ? (idxRh ? idxRh.price / close - 1 : null) : indexMove;
    const settled = record.rows.find((r) => r.ticker === l.ticker && r.session === c.session);
    const est = c.phase === "regular" && settled ? settled.est : estimate(close, chains, im, params);
    const openBar = o.days.find((d) => d.date === c.session);
    rows.push({
      ticker: l.ticker, name: l.name, close, refDay: c.refDay, chains, pairs: p, est, params,
      open: c.phase === "regular" ? openBar?.open ?? null : null,
      last: c.phase === "regular" ? o.last : null,
      days: o.days,
    });
  }
  return { clock: c, rows, record, updatedAt: Date.now() };
});

export async function getRow(ticker: string): Promise<{ board: Board; row: LiveRow } | null> {
  if (!listing(ticker)) return null;
  const board = await getBoard();
  const row = board.rows.find((r) => r.ticker === ticker.toUpperCase());
  return row ? { board, row } : null;
}

/** Client-safe snapshot (no raw pair lists or daily history). */
export function lite(b: Board) {
  return {
    clock: b.clock,
    updatedAt: b.updatedAt,
    rows: b.rows.map((r) => ({ ticker: r.ticker, name: r.name, close: r.close, bell: r.est.bell, raw: r.est.raw, open: r.open, last: r.last })),
  };
}
export type Lite = ReturnType<typeof lite>;
