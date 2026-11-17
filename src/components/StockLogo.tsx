"use client";

import { useState } from "react";
import BellGlyph from "./BellGlyph";

// The company's own logo, in full colour (the one exception to the black-and-white palette), on a small white tile,
// with a dot in the corner that says how the stock moved overnight.
// Falls back to the ANGELUS mark if the image cannot load.

// Logos drawn in white for dark backgrounds get a dark tile instead.
const DARK_TILE = new Set(["AMZN", "QQQ"]);

export default function StockLogo({ ticker, gap, size = 30 }: { ticker: string; gap: number | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  // Black and white: filled dot = rose overnight, hollow dot = fell.
  const down = gap != null && gap < -0.00005;
  return (
    <span style={{ position: "relative", width: size, height: size, flex: "none", display: "inline-block" }}>
      {failed ? (
        <BellGlyph gap={gap} size={size} />
      ) : (
        <span style={{ width: size, height: size, borderRadius: 6, background: DARK_TILE.has(ticker) ? "var(--tile-dark)" : "var(--tile)", display: "grid", placeItems: "center", overflow: "hidden", boxShadow: "inset 0 0 0 1px var(--rule-2)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://financialmodelingprep.com/image-stock/${ticker}.png`}
            alt=""
            width={size - 8}
            height={size - 8}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            style={{ width: size - 8, height: size - 8, objectFit: "contain" }}
          />
        </span>
      )}
      {!failed && (
        <span
          aria-hidden
          style={{
            position: "absolute", right: -3, bottom: -3, width: 9, height: 9, borderRadius: "50%",
            background: down ? "var(--bg)" : gap == null ? "var(--faint)" : "var(--ink)",
            border: down ? "1.5px solid var(--ink)" : "none",
            boxShadow: "0 0 0 2px var(--bg)",
          }}
        />
      )}
    </span>
  );
}
