export function money(v: number | null | undefined, dp?: number): string {
  if (v == null || !isFinite(v)) return "—";
  const d = dp ?? (v >= 1000 ? 2 : v >= 1 ? 2 : 4);
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function pct(v: number | null | undefined, dp = 2): string {
  if (v == null || !isFinite(v)) return "—";
  const s = (v * 100).toFixed(dp);
  return (v > 0 ? "+" : v < 0 ? "" : "±") + s + "%";
}

export function move(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null || b == null || !b) return null;
  return a / b - 1;
}

export function tone(v: number | null | undefined, eps = 0.00005): string {
  if (v == null) return "";
  return v > eps ? "up" : v < -eps ? "down" : "";
}

export function compact(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return "—";
  if (v >= 1e9) return "$" + (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(2) + "M";
  if (v >= 1e3) return "$" + (v / 1e3).toFixed(0) + "K";
  return "$" + v.toFixed(0);
}

export function bp(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return "—";
  return v >= 100 ? v.toFixed(0) : v.toFixed(1);
}

export function short(addr: string): string {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export function etTime(t: number): string {
  return new Date(t).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) + " ET";
}

export function etDay(t: number): string {
  return new Date(t).toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric" });
}

const DEX_NAMES: Record<string, string> = {
  uniswap: "Uniswap", raydium: "Raydium", orca: "Orca", meteora: "Meteora", aero: "Aerodrome", aerodrome: "Aerodrome",
  ramses: "Ramses", communityv3: "Community V3", pumpswap: "PumpSwap", lifinity: "Lifinity", fluxbeam: "FluxBeam",
  sushiswap: "SushiSwap", curve: "Curve", balancer: "Balancer", pancakeswap: "PancakeSwap", camelot: "Camelot",
};

/** A DEX id from DexScreener as people write it; unlisted venues (raw addresses) are shortened. */
export function dexName(id: string): string {
  if (/^0x[0-9a-f]{8,}$/i.test(id)) return `Pool ${short(id)}`;
  const known = DEX_NAMES[id.toLowerCase()];
  if (known) return known;
  return id.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
