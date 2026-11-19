import "server-only";
import type { ChainId } from "./registry";
import { ny } from "./clock";

const UA = { "user-agent": "Mozilla/5.0 (compatible; angelus/1.0)" };

export interface Pair {
  chain: ChainId;
  dex: string;
  pair: string;
  quote: string;
  price: number;
  liq: number;
  vol24: number;
  buys: { h1: number; h6: number; h24: number };
  sells: { h1: number; h6: number; h24: number };
  change: { h1: number; h6: number; h24: number };
}

interface DsPair {
  chainId: string; dexId: string; pairAddress: string;
  baseToken: { address: string; symbol: string };
  quoteToken: { symbol: string };
  priceUsd?: string;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  txns?: Record<string, { buys: number; sells: number }>;
  priceChange?: Record<string, number>;
}

export interface PairsResult {
  /** True when the list is real: fetched just now, or the last good list from under HOLD_MS ago. */
  ok: boolean;
  /** True only when the list came from DexScreener on this call. */
  fresh: boolean;
  pairs: Pair[];
}

/** How long a last good answer may stand in for a failed one (rate limit, timeout). */
export const HOLD_MS = 30 * 60_000;
const lastGood = new Map<string, { at: number; pairs: Pair[] }>();

/**
 * Every pool trading one token on one chain. When DexScreener refuses or times out, the last good
 * answer this server saw (under HOLD_MS old) stands in, so one bad minute never blanks or skews a bell.
 */
export async function fetchPairs(chain: ChainId, token: string, revalidate = 60): Promise<PairsResult> {
  const key = `${chain}:${token.toLowerCase()}`;
  try {
    const r = await fetch(`https://api.dexscreener.com/token-pairs/v1/${chain}/${token}`, { next: { revalidate }, headers: UA, signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`dexscreener ${r.status}`);
    const pairs = parsePairs(chain, token, (await r.json()) as DsPair[]);
    lastGood.set(key, { at: Date.now(), pairs });
    return { ok: true, fresh: true, pairs };
  } catch {
    const g = lastGood.get(key);
    if (g && Date.now() - g.at < HOLD_MS) return { ok: true, fresh: false, pairs: g.pairs };
    return { ok: false, fresh: false, pairs: [] };
  }
}

export async function tokenPairs(chain: ChainId, token: string, revalidate = 60): Promise<Pair[]> {
  return (await fetchPairs(chain, token, revalidate)).pairs;
}

function parsePairs(chain: ChainId, token: string, j: DsPair[]): Pair[] {
  return j
      .filter((p) => p.baseToken.address.toLowerCase() === token.toLowerCase() && p.priceUsd)
      .map((p) => ({
        chain, dex: p.dexId, pair: p.pairAddress, quote: p.quoteToken.symbol,
        price: Number(p.priceUsd), liq: p.liquidity?.usd ?? 0, vol24: p.volume?.h24 ?? 0,
        buys: { h1: p.txns?.h1?.buys ?? 0, h6: p.txns?.h6?.buys ?? 0, h24: p.txns?.h24?.buys ?? 0 },
        sells: { h1: p.txns?.h1?.sells ?? 0, h6: p.txns?.h6?.sells ?? 0, h24: p.txns?.h24?.sells ?? 0 },
        change: { h1: p.priceChange?.h1 ?? 0, h6: p.priceChange?.h6 ?? 0, h24: p.priceChange?.h24 ?? 0 },
      }));
}

export interface DayBar { date: string; open: number; high: number; low: number; close: number }
export interface Official {
  ticker: string;
  days: DayBar[];
  last: number;
  marketTime: number;
}

/** Official exchange prices (daily bars) from the consolidated tape. */
export async function official(ticker: string, range = "6mo", revalidate = 300): Promise<Official | null> {
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${range}&interval=1d`, { next: { revalidate }, headers: UA, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const res = (await r.json()).chart?.result?.[0];
    if (!res?.timestamp) return null;
    const q = res.indicators.quote[0];
    const days: DayBar[] = [];
    res.timestamp.forEach((ts: number, i: number) => {
      if (q.open[i] == null || q.close[i] == null) return;
      days.push({ date: ny(ts * 1000).date, open: q.open[i], high: q.high[i], low: q.low[i], close: q.close[i] });
    });
    return { ticker, days, last: res.meta.regularMarketPrice, marketTime: res.meta.regularMarketTime * 1000 };
  } catch {
    return null;
  }
}

/** Hourly candles [startSec, open, high, low, close, vol], oldest first. */
export async function hourly(chain: ChainId, pool: string, revalidate = 0, limit = 1000): Promise<number[][]> {
  const net = chain === "robinhood" ? "robinhood" : chain === "solana" ? "solana" : "eth";
  for (let attempt = 0; attempt < (revalidate ? 1 : 8); attempt++) {
    // Page renders (revalidate > 0) wait at most 6 s; the slow record rebuild waits longer.
    const init: RequestInit = revalidate ? { next: { revalidate }, signal: AbortSignal.timeout(6000) } : { cache: "no-store", signal: AbortSignal.timeout(60000) };
    try {
      const r = await fetch(`https://api.geckoterminal.com/api/v2/networks/${net}/pools/${pool}/ohlcv/hour?limit=${limit}&currency=usd&token=base`, { ...init, headers: { accept: "application/json", ...UA } });
      if (r.status === 429) {
        if (revalidate) return []; // a page render never waits out a rate limit
        await new Promise((s) => setTimeout(s, 15000));
        continue;
      }
      if (!r.ok) return [];
      const j = await r.json();
      const list: number[][] = j?.data?.attributes?.ohlcv_list ?? [];
      return list.slice().sort((a, b) => a[0] - b[0]);
    } catch {
      // Timed out or offline: the page shows its "history is busy" note instead of waiting.
      if (revalidate) return [];
    }
  }
  return [];
}
