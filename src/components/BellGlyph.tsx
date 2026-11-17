import Link from "next/link";
import StockLogo from "./StockLogo";

// The ANGELUS mark (master SVG, viewBox 256) used as a data glyph: the arch stays put and
// the bell (the dot) swings inside it from the crown of the inner arch, the way the stock
// moved overnight; its colour says up or down.

const ARCH = "M52 220V112A76 76 0 0 1 204 112V220H172V112A44 44 0 0 0 84 112V220Z";

export default function BellGlyph({ gap, size = 22, still = false }: { gap: number | null; size?: number; still?: boolean }) {
  // A rise swings the bell to the right, a fall to the left. Square-root scale so small
  // nights still show; capped at 12° so the bell never touches the arch.
  const deg = gap == null ? 0 : -Math.sign(gap) * Math.min(12, Math.sqrt(Math.abs(gap) * 100) * 6);
  // Black and white: a filled bell for a rise, a hollow one for a fall, faint when unknown.
  const down = gap != null && gap < -0.00005;
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" aria-hidden style={{ flex: "none", overflow: "visible" }}>
      <path d={ARCH} fill="var(--ink)" />
      <circle cx="128" cy="150" r={down ? 20 : 24} fill={down ? "none" : gap == null ? "var(--faint)" : "var(--ink)"} stroke="var(--ink)" strokeWidth={down ? 8 : 0} transform={`rotate(${still ? 0 : deg} 128 68)`} />
    </svg>
  );
}

/** Ticker cell for ledgers: the company's logo, the ticker, the company. */
export function TickerCell({ ticker, name, gap, href }: { ticker: string; name: string; gap: number | null; href?: string }) {
  const inner = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
      <StockLogo ticker={ticker} gap={gap} />
      <span>{ticker}<small>{name}</small></span>
    </span>
  );
  return href ? <Link href={href} className="tk">{inner}</Link> : <span className="tk">{inner}</span>;
}
