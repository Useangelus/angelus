import type { ScoredCall } from "@/lib/season";
import { dayLabel } from "@/lib/clock";

// One signed call as a 16:9 image: who, which stock, which side of the Bell, and how it ended.

const ARCH = "M52 220V112A76 76 0 0 1 204 112V220H172V112A44 44 0 0 0 84 112V220Z";
const INK = "#0a0a0a", PAPER = "#f2f2f2", MUTE = "#9a9a9a", BRONZE = "#ffffff", UP = "#f2f2f2", DOWN = "#f2f2f2", RULE = "rgba(255,255,255,0.14)";
const DARK_TILE = new Set(["AMZN", "QQQ"]);

const money = (v: number | null) => (v == null ? "—" : "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const short = (a: string) => a.slice(0, 6) + "…" + a.slice(-4);

export default function CallCard({ c, name, k = 1 }: { c: ScoredCall; name: string; k?: number }) {
  const px = (n: number) => n * k;
  const sideColor = c.side === "over" ? UP : DOWN;
  const verdict = c.outcome === "won" ? { text: "Called it.", color: UP } : c.outcome === "lost" ? { text: "The bell disagreed.", color: DOWN } : c.outcome === "void" ? { text: "Dead heat. Void.", color: MUTE } : null;
  return (
    <div style={{ position: "relative", width: px(1600), height: px(900), display: "flex", flexDirection: "column", background: INK, color: PAPER, padding: `${px(64)}px ${px(80)}px`, fontFamily: "Newsreader" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "Plex", fontSize: px(20), letterSpacing: px(3), color: MUTE }}>
        <div style={{ display: "flex", alignItems: "center", gap: px(16) }}>
          <svg width={px(34)} height={px(34)} viewBox="0 0 256 256"><path d={ARCH} fill={BRONZE} /><circle cx="128" cy="150" r="24" fill={sideColor} /></svg>
          <span style={{ color: PAPER, letterSpacing: px(8) }}>ANGELUS</span>
        </div>
        <span style={{ display: "flex" }}>A SIGNED CALL ·&nbsp;<span style={{ letterSpacing: px(1) }}>{short(c.address)}</span></span>
      </div>

      <svg width={px(430)} height={px(430)} viewBox="0 0 256 256" style={{ position: "absolute", right: px(80), top: px(200) }}>
        <path d={ARCH} fill={BRONZE} opacity={0.9} />
        <circle cx="128" cy="150" r="24" fill={sideColor} />
      </svg>

      <div style={{ display: "flex", alignItems: "center", gap: px(48), marginTop: px(130) }}>
        <div style={{ width: px(200), height: px(200), borderRadius: px(30), background: DARK_TILE.has(c.ticker) ? "#000000" : "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://financialmodelingprep.com/image-stock/${c.ticker}.png`} width={px(150)} height={px(150)} style={{ objectFit: "contain" }} alt="" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: px(10) }}>
          <span style={{ fontFamily: "Plex", fontSize: px(22), letterSpacing: px(3), color: MUTE }}>{name.toUpperCase()} · BELL OF {dayLabel(c.session).toUpperCase()}</span>
          <span style={{ fontSize: px(110), lineHeight: 1, letterSpacing: px(-3), display: "flex" }}>
            {c.ticker}&nbsp;<span style={{ fontStyle: "italic", color: sideColor }}>{c.side}</span>
          </span>
          <span style={{ fontSize: px(44), color: MUTE, display: "flex" }}>the Bell at&nbsp;<span style={{ color: BRONZE }}>{money(c.ref)}</span></span>
        </div>
      </div>

      <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: `${px(1)}px solid ${RULE}`, paddingTop: px(26) }}>
        <span style={{ fontFamily: "Plex", fontSize: px(18), letterSpacing: px(2), color: MUTE }}>SIGNED BY WALLET · NO DEPOSIT · SETTLED BY THE OFFICIAL OPEN</span>
        {verdict ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: px(6) }}>
            <span style={{ fontFamily: "Plex", fontSize: px(18), letterSpacing: px(2), color: MUTE }}>OPENED {money(c.open)}</span>
            <span style={{ fontSize: px(52), color: verdict.color, fontStyle: "italic" }}>{verdict.text}</span>
          </div>
        ) : (
          <span style={{ fontSize: px(40), color: PAPER }}>Settles at 09:30 ET.</span>
        )}
      </div>
    </div>
  );
}
