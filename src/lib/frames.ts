// Shared by the server build of a replay and by the browser, which fills in any stock the server could not
// get history for (GeckoTerminal rate-limits shared server addresses, never a visitor's own).

export type Net = "robinhood" | "solana" | "ethereum";

export const HISTORY = 400; // hours of candles asked for: a little over two weeks

export const candleUrl = (chain: Net, pool: string) =>
  `https://api.geckoterminal.com/api/v2/networks/${chain === "ethereum" ? "eth" : chain}/pools/${pool}/ohlcv/hour?limit=${HISTORY}&currency=usd&token=base`;

/** Whether a pool's candles reach into the night at all. */
export const covers = (candles: number[][], start: number, end: number) =>
  candles.some((k) => k[0] * 1000 >= start - 6 * 3600_000 && k[0] * 1000 <= end);

/** The gap from the close at each frame: the last hourly close at or before it, carried through quiet hours. */
export function framesOf(candles: number[][], hours: number[], close: number): (number | null)[] {
  const sorted = candles.slice().sort((a, b) => a[0] - b[0]);
  let k = 0, last: number | null = null;
  return hours.map((t) => {
    while (k < sorted.length && sorted[k][0] * 1000 + 3600_000 <= t) { last = sorted[k][4]; k++; }
    return last == null ? null : last / close - 1;
  });
}
