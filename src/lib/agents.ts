// The four agents of ANGELUS. Each one turns the same public evidence into a
// different estimate of the next official opening price. Pure math, no I/O.

import type { ChainId } from "./registry";

export type AgentId = "lauds" | "terce" | "compline" | "bell";

export interface AgentInfo {
  id: AgentId;
  name: string;
  hour: string;
  thesis: string;
  method: string;
}

export const AGENTS: AgentInfo[] = [
  {
    id: "lauds",
    name: "Lauds",
    hour: "the dawn office",
    thesis: "Every chain is a witness. Ask all of them.",
    method: "Takes the price of the same stock on Robinhood Chain, Solana (xStocks) and Ethereum (Ondo), sets aside any chain that is too shallow or drifts more than 1% from the others, weights the rest by the square root of their pool depth, and averages them.",
  },
  {
    id: "terce",
    name: "Terce",
    hour: "the third hour",
    thesis: "Most of a stock's night is the market's night.",
    method: "Splits the token's move since the close into a market part and a stock-specific part. The market part comes from the SPY token and the stock's 60-day beta; the stock-specific part is kept at half weight.",
  },
  {
    id: "compline",
    name: "Compline",
    hour: "the last office",
    thesis: "Night books misjudge the size of a move. Learn by how much.",
    method: "Takes the Robinhood Chain move since the close and scales it by a factor learned from this stock's own past nights: how much of the token's move the real open actually kept. Below 1, the night overshoots and is pulled back; above 1, it undershoots and is stretched.",
  },
  {
    id: "bell",
    name: "The Bell",
    hour: "the number we publish",
    thesis: "Trust each agent as much as it has earned.",
    method: "Blends Lauds, Terce and Compline, weighting each by the inverse square of its recent error against real opens. An agent that misses more is heard less.",
  },
];

export interface ChainQuote { chain: ChainId; price: number; liq: number; pools: number }

export interface Estimates {
  close: number;
  raw: number | null;
  lauds: number | null;
  terce: number | null;
  compline: number | null;
  bell: number | null;
}

export interface Params { beta: number; k: number; weights: Record<"lauds" | "terce" | "compline", number> }

export const DEFAULT_K = 0.85;

/** Liquidity-weighted price of one chain after dropping mispriced or stale pools. */
export function chainQuote(chain: ChainId, pools: { price: number; liq: number }[], close: number): ChainQuote | null {
  const ok = pools.filter((p) => p.liq >= 5000 && p.price > 0 && Math.abs(p.price / close - 1) < 0.3);
  if (!ok.length) return null;
  const sorted = ok.slice().sort((a, b) => a.price - b.price);
  const total = sorted.reduce((s, p) => s + p.liq, 0);
  let acc = 0, median = sorted[0].price;
  for (const p of sorted) { acc += p.liq; if (acc >= total / 2) { median = p.price; break; } }
  const kept = ok.filter((p) => Math.abs(p.price / median - 1) < 0.03);
  const liq = kept.reduce((s, p) => s + p.liq, 0);
  const price = kept.reduce((s, p) => s + p.price * p.liq, 0) / liq;
  return { chain, price, liq, pools: kept.length };
}

/**
 * Chains Lauds will listen to: deep enough, and within 1% of the reference chain.
 * The reference is the middle chain by price (one vote per chain, so one deep but stale
 * pool cannot outvote the others); with only two chains, Robinhood Chain is the reference.
 */
export function lausWitnesses(chains: ChainQuote[]): ChainQuote[] {
  if (chains.length <= 1) return chains;
  const deep = chains.filter((c) => c.liq >= 25000);
  const pool = deep.length ? deep : chains;
  let ref: number;
  if (pool.length >= 3) {
    const sorted = pool.map((c) => c.price).sort((a, b) => a - b);
    ref = sorted[Math.floor(sorted.length / 2)];
  } else {
    ref = (pool.find((c) => c.chain === "robinhood") ?? pool[0]).price;
  }
  return pool.filter((c) => Math.abs(c.price / ref - 1) <= 0.01);
}

export function estimate(close: number, chains: ChainQuote[], indexMove: number | null, p: Params): Estimates {
  const rh = chains.find((c) => c.chain === "robinhood");
  const raw = rh ? rh.price : null;
  let lauds: number | null = null;
  const witnesses = lausWitnesses(chains);
  if (witnesses.length) {
    const w = witnesses.map((c) => Math.sqrt(c.liq));
    const W = w.reduce((s, x) => s + x, 0);
    lauds = witnesses.reduce((s, c, i) => s + c.price * w[i], 0) / W;
  }
  let terce: number | null = null;
  let compline: number | null = null;
  if (raw != null) {
    const r = raw / close - 1;
    const m = indexMove ?? 0;
    terce = close * (1 + p.beta * m + 0.5 * (r - p.beta * m));
    compline = close * (1 + p.k * r);
  }
  const parts: [number | null, number][] = [[lauds, p.weights.lauds], [terce, p.weights.terce], [compline, p.weights.compline]];
  const live = parts.filter(([v]) => v != null) as [number, number][];
  const W = live.reduce((s, [, w]) => s + w, 0);
  const bell = live.length && W > 0 ? live.reduce((s, [v, w]) => s + v * w, 0) / W : null;
  return { close, raw, lauds, terce, compline, bell };
}

/** Daily-return beta against the index over the last `n` shared days before `before`. */
export function beta(stock: { date: string; close: number }[], index: { date: string; close: number }[], before: string, n = 60): number {
  const idx = new Map(index.map((d) => [d.date, d.close]));
  const s = stock.filter((d) => d.date < before && idx.has(d.date));
  const xs: number[] = [], ys: number[] = [];
  for (let i = 1; i < s.length; i++) {
    const a = idx.get(s[i - 1].date)!, b = idx.get(s[i].date)!;
    xs.push(b / a - 1);
    ys.push(s[i].close / s[i - 1].close - 1);
  }
  const X = xs.slice(-n), Y = ys.slice(-n);
  if (X.length < 20) return 1;
  const mx = X.reduce((a, b) => a + b, 0) / X.length, my = Y.reduce((a, b) => a + b, 0) / Y.length;
  let cov = 0, v = 0;
  for (let i = 0; i < X.length; i++) { cov += (X[i] - mx) * (Y[i] - my); v += (X[i] - mx) ** 2; }
  return v > 0 ? Math.min(3, Math.max(0, cov / v)) : 1;
}

/** How much of the overnight token move the real open kept, from past nights. */
export function shrink(history: { tokenMove: number; openMove: number }[]): number {
  const h = history.filter((x) => Math.abs(x.tokenMove) > 0.0005).slice(-30);
  if (h.length < 5) return DEFAULT_K;
  const sxy = h.reduce((s, x) => s + x.tokenMove * x.openMove, 0);
  const sxx = h.reduce((s, x) => s + x.tokenMove ** 2, 0);
  return sxx > 0 ? Math.min(1.5, Math.max(0, sxy / sxx)) : DEFAULT_K;
}

/** Inverse-square-error weights. */
export function weights(err: Record<"lauds" | "terce" | "compline", number | null>): Params["weights"] {
  const w = (e: number | null) => (e == null ? 1 : 1 / Math.max(e, 1) ** 2);
  const raw = { lauds: w(err.lauds), terce: w(err.terce), compline: w(err.compline) };
  const s = raw.lauds + raw.terce + raw.compline;
  return { lauds: raw.lauds / s, terce: raw.terce / s, compline: raw.compline / s };
}

/** Error in basis points of the real open. */
export function bps(est: number | null, actual: number): number | null {
  return est == null ? null : Math.abs(est / actual - 1) * 10000;
}
