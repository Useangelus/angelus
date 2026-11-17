import { ImageResponse } from "next/og";
import { getRow } from "@/lib/live";
import { listing } from "@/lib/registry";
import { dayLabel } from "@/lib/clock";
import { cardFonts } from "@/lib/ogfont";

// The share card for one stock page: its logo (in colour), tonight's Bell and the gap.
// 16:9 so it fills an X post.

export const alt = "ANGELUS: tonight's Bell for one stock";
export const size = { width: 1600, height: 900 };
export const contentType = "image/png";
export const revalidate = 300;

const ARCH = "M52 220V112A76 76 0 0 1 204 112V220H172V112A44 44 0 0 0 84 112V220Z";
const INK = "#0a0a0a", PAPER = "#f2f2f2", MUTE = "#9a9a9a", RULE = "rgba(255,255,255,0.14)";
const DARK_TILE = new Set(["AMZN", "QQQ"]);
const money = (v: number | null) => (v == null ? "—" : "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

export default async function Image({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const l = listing(ticker);
  const data = await getRow(ticker);
  const fonts = await cardFonts();
  const row = data?.row;
  const gap = row?.est.bell != null ? row.est.bell / row.close - 1 : null;
  const down = gap != null && gap < 0;
  const day = data?.board.clock.phase === "regular";
  const t = l?.ticker ?? ticker.toUpperCase();

  return new ImageResponse(
    (
      <div style={{ width: 1600, height: 900, display: "flex", flexDirection: "column", background: INK, color: PAPER, padding: "64px 80px", fontFamily: "Newsreader", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "Plex", fontSize: 20, letterSpacing: 3, color: MUTE }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <svg width={34} height={34} viewBox="0 0 256 256"><path d={ARCH} fill={PAPER} /><circle cx="128" cy="150" r="24" fill={PAPER} /></svg>
            <span style={{ color: PAPER, letterSpacing: 8 }}>ANGELUS</span>
          </div>
          <span>{data ? (day ? "THE BELL SAID THIS MORNING" : `THE BELL FOR ${dayLabel(data.board.clock.session).toUpperCase()}`) : "THE BELL"}</span>
        </div>

        <svg width={430} height={430} viewBox="0 0 256 256" style={{ position: "absolute", right: 80, top: 210 }}>
          <path d={ARCH} fill={PAPER} opacity={0.12} />
          <circle cx="128" cy="150" r="24" fill={down ? "none" : PAPER} stroke={PAPER} strokeWidth={down ? 8 : 0} opacity={0.5} />
        </svg>

        <div style={{ display: "flex", alignItems: "center", gap: 48, marginTop: 110 }}>
          <div style={{ width: 200, height: 200, borderRadius: 30, background: DARK_TILE.has(t) ? "#000000" : "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${RULE}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://financialmodelingprep.com/image-stock/${t}.png`} width={150} height={150} style={{ objectFit: "contain" }} alt="" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontFamily: "Plex", fontSize: 24, letterSpacing: 3, color: MUTE }}>{(l?.name ?? "").toUpperCase()}</span>
            <span style={{ fontSize: 132, lineHeight: 1, letterSpacing: -3 }}>{t}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 32, marginTop: 56 }}>
          <span style={{ fontFamily: "Plex", fontSize: 96, letterSpacing: -4 }}>{money(row?.est.bell ?? null)}</span>
          <span style={{ fontFamily: "Plex", fontSize: 40, color: MUTE }}>
            {gap == null ? "" : `${gap > 0 ? "+" : ""}${(gap * 100).toFixed(2)}% vs close ${money(row?.close ?? null)}`}
          </span>
        </div>

        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", borderTop: `1px solid ${RULE}`, paddingTop: 24, fontFamily: "Plex", fontSize: 18, letterSpacing: 2, color: MUTE }}>
          <span>WALL STREET IS ASLEEP. ITS STOCKS ARE NOT.</span>
          <span>OPENING BELL 09:30 ET</span>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
