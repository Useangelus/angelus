import { ImageResponse } from "next/og";
import { walletRecord } from "@/lib/wallet";
import { cardFonts } from "@/lib/ogfont";
import { short } from "@/lib/format";

// A wallet's record as a 16:9 card for X: right/wrong, hit rate, streaks, and the stocks it calls most.

export const alt = "ANGELUS: one wallet's record against the opening bell";
export const size = { width: 1600, height: 900 };
export const contentType = "image/png";
export const revalidate = 300;

const ARCH = "M52 220V112A76 76 0 0 1 204 112V220H172V112A44 44 0 0 0 84 112V220Z";
const INK = "#0a0a0a", PAPER = "#f2f2f2", MUTE = "#9a9a9a", RULE = "rgba(255,255,255,0.14)";
const DARK_TILE = new Set(["AMZN", "QQQ"]);

export default async function Image({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const r = await walletRecord(address);
  const fonts = await cardFonts();
  const won = r?.won ?? 0, lost = r?.lost ?? 0, pending = r?.pending ?? 0;
  const top = (r?.byStock ?? []).slice(0, 6);
  const stat = (label: string, value: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontFamily: "Plex", fontSize: 18, letterSpacing: 2, color: MUTE }}>{label}</span>
      <span style={{ fontFamily: "Plex", fontSize: 52, letterSpacing: -2 }}>{value}</span>
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width: 1600, height: 900, display: "flex", flexDirection: "column", background: INK, color: PAPER, padding: "64px 80px", fontFamily: "Newsreader", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "Plex", fontSize: 20, letterSpacing: 3, color: MUTE }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <svg width={34} height={34} viewBox="0 0 256 256"><path d={ARCH} fill={PAPER} /><circle cx="128" cy="150" r="24" fill={PAPER} /></svg>
            <span style={{ color: PAPER, letterSpacing: 8 }}>ANGELUS</span>
          </div>
          <span style={{ display: "flex" }}>CALLS OF&nbsp;<span style={{ letterSpacing: 1 }}>{r ? short(r.address) : ""}</span></span>
        </div>

        <svg width={400} height={400} viewBox="0 0 256 256" style={{ position: "absolute", right: 80, top: 190 }}>
          <path d={ARCH} fill={PAPER} opacity={0.12} />
          <circle cx="128" cy="150" r="24" fill={PAPER} opacity={0.5} />
        </svg>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 70 }}>
          {r && r.settled.length ? (
            <div style={{ display: "flex", fontSize: 120, lineHeight: 1, letterSpacing: -4 }}>
              {won} right,&nbsp;<span style={{ fontStyle: "italic", color: MUTE }}>{lost} wrong.</span>
            </div>
          ) : (
            <div style={{ display: "flex", fontSize: 104, lineHeight: 1, letterSpacing: -3 }}>
              {pending ? `${pending} ${pending === 1 ? "call" : "calls"} waiting for the bell.` : "No calls yet."}
            </div>
          )}
          <span style={{ fontSize: 36, color: MUTE, marginTop: 18 }}>against the official opening bell, signed by wallet.</span>
        </div>

        <div style={{ display: "flex", gap: 72, marginTop: 64 }}>
          {stat("HIT RATE", r?.rate != null ? `${Math.round(r.rate * 100)}%` : "—")}
          {stat("SETTLED", String(r?.settled.length ?? 0))}
          {stat("BEST STREAK", r?.streak.best ? String(r.streak.best) : "—")}
          {stat("WAITING", String(pending))}
        </div>

        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${RULE}`, paddingTop: 24 }}>
          <div style={{ display: "flex", gap: 14 }}>
            {top.map((s) => (
              <div key={s.ticker} style={{ width: 64, height: 64, borderRadius: 12, background: DARK_TILE.has(s.ticker) ? "#000000" : "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${RULE}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://financialmodelingprep.com/image-stock/${s.ticker}.png`} width={46} height={46} style={{ objectFit: "contain" }} alt="" />
              </div>
            ))}
          </div>
          <span style={{ fontFamily: "Plex", fontSize: 18, letterSpacing: 2, color: MUTE }}>OVER OR UNDER THE BELL · CALLS LOCK AT 04:00 ET</span>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
