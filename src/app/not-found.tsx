import Link from "next/link";
import SkyBand from "@/components/belfry/SkyBand";
import BellGlyph from "@/components/BellGlyph";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Not found", robots: { index: false } };

export default function NotFound() {
  return (
    <SkyBand tall>
      <div className="wrap" style={{ paddingBottom: 120, display: "flex", flexDirection: "column", gap: 22, alignItems: "flex-start" }}>
        <BellGlyph gap={null} size={56} still />
        <p className="label">404 · no bell hangs here</p>
        <h1 className="h2">This bay of the tower <em>is empty.</em></h1>
        <p className="lede">The page you asked for does not exist. The bells are where they always are.</p>
        <Link href="/" className="btn">Back to the belfry <span className="arr">→</span></Link>
      </div>
    </SkyBand>
  );
}
