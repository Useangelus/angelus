"use client";

import Link from "next/link";
import SkyBand from "@/components/belfry/SkyBand";
import BellGlyph from "@/components/BellGlyph";

// A page failed to render (a price source down, a storage hiccup). Keep the masthead and footer,
// say so plainly, and offer a retry: most of these pass within a minute.
export default function PageError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error ? String((error as Error & { digest?: string }).digest ?? "") : "";
  return (
    <SkyBand tall>
      <title>Something slipped · ANGELUS</title>
      <div className="wrap" style={{ paddingBottom: 120, display: "flex", flexDirection: "column", gap: 22, alignItems: "flex-start" }}>
        <BellGlyph gap={null} size={56} still />
        <p className="label">A rope slipped{digest ? ` · ref ${digest}` : ""}</p>
        <h1 className="h2">This bell <em>did not ring.</em></h1>
        <p className="lede">Something went wrong while drawing this page, usually a price source that did not answer in time. Try again in a moment.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="button" className="btn" onClick={() => retry()}>Try again <span className="arr">↻</span></button>
          <Link href="/" className="btn ghost">Back to the belfry</Link>
        </div>
      </div>
    </SkyBand>
  );
}
