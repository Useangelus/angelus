import type { Edition } from "@/lib/edition";
import { dayLabel } from "@/lib/clock";

// The nightly edition as a 16:9 image (rendered by ImageResponse / Satori).
// Base size 1600×900; `k` scales every dimension (k=2 for the 3200×1800 post file).

const ARCH = "M52 220V112A76 76 0 0 1 204 112V220H172V112A44 44 0 0 0 84 112V220Z";
const DARK_TILE = new Set(["AMZN", "QQQ"]);
const INK = "#0a0a0a", PAPER = "#f2f2f2", MUTE = "#9a9a9a", FAINT = "#5e5e5e", BRONZE = "#ffffff", UP = "#f2f2f2", DOWN = "#f2f2f2", RULE = "rgba(255,255,255,0.14)";

function fmt(v: number | null, dp = 2) {
  return v == null ? "—" : "$" + v.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}
function pct(v: number | null) {
  return v == null ? "—" : `${v > 0 ? "+" : ""}${(v * 100).toFixed(2)}%`;
}

export default function EditionCard({ e, k = 1 }: { e: Edition; k?: number }) {
  const px = (n: number) => n * k;
  const tone = (g: number | null) => (g == null ? FAINT : g > 0.00005 ? UP : g < -0.00005 ? DOWN : MUTE);
  const l = e.loudest;
  return (
    <div style={{ width: px(1600), height: px(900), display: "flex", flexDirection: "column", background: INK, color: PAPER, padding: `${px(64)}px ${px(80)}px`, fontFamily: "Newsreader" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "Plex", fontSize: px(20), letterSpacing: px(3), color: MUTE }}>
        <div style={{ display: "flex", alignItems: "center", gap: px(16) }}>
          <svg width={px(34)} height={px(34)} viewBox="0 0 256 256"><path d={ARCH} fill={BRONZE} /><circle cx="128" cy="150" r="24" fill={UP} /></svg>
          <span style={{ color: PAPER, letterSpacing: px(8) }}>ANGELUS</span>
        </div>
        <span>EDITION No. {e.no} · {dayLabel(e.session).toUpperCase()}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginTop: px(44) }}>
        <div style={{ fontSize: px(76), lineHeight: 1, letterSpacing: px(-2), display: "flex" }}>
          The night of {dayLabel(e.night)},&nbsp;<span style={{ fontStyle: "italic", color: BRONZE }}>in {e.rows.length} bells.</span>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", marginTop: px(54), rowGap: px(40) }}>
        {e.rows.map((r) => (
          <div key={r.ticker} style={{ width: px(180), display: "flex", flexDirection: "column", alignItems: "center", gap: px(10) }}>
            <div style={{ position: "relative", width: px(84), height: px(84), display: "flex" }}>
              <div style={{ width: px(84), height: px(84), borderRadius: px(14), background: DARK_TILE.has(r.ticker) ? "#000000" : "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", border: `${px(1)}px solid ${RULE}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://financialmodelingprep.com/image-stock/${r.ticker}.png`} width={px(62)} height={px(62)} style={{ objectFit: "contain" }} alt="" />
              </div>
              {(r.gap ?? 0) < -0.00005
                ? <div style={{ position: "absolute", right: px(-6), bottom: px(-6), width: px(22), height: px(22), borderRadius: px(11), background: INK, border: `${px(3)}px solid ${PAPER}`, boxShadow: `0 0 0 ${px(3)}px ${INK}` }} />
                : <div style={{ position: "absolute", right: px(-6), bottom: px(-6), width: px(22), height: px(22), borderRadius: px(11), background: r.gap == null ? FAINT : PAPER, border: `${px(4)}px solid ${INK}` }} />}
            </div>
            <span style={{ fontSize: px(28) }}>{r.ticker}</span>
            <span style={{ fontFamily: "Plex", fontSize: px(19), color: tone(r.gap) }}>{pct(r.gap)}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: `${px(1)}px solid ${RULE}`, paddingTop: px(26), gap: px(40) }}>
        <div style={{ display: "flex", flexDirection: "column", gap: px(6) }}>
          <span style={{ fontFamily: "Plex", fontSize: px(16), letterSpacing: px(2), color: MUTE }}>LOUDEST BELL</span>
          <span style={{ fontSize: px(36), display: "flex" }}>
            {l ? <>{l.ticker}&nbsp;<span style={{ color: tone(l.gap) }}>{pct(l.gap)}</span>&nbsp;<span style={{ color: MUTE }}>· the Bell {fmt(l.bell)}</span></> : "—"}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: px(6), maxWidth: px(640) }}>
          <span style={{ fontFamily: "Plex", fontSize: px(16), letterSpacing: px(2), color: MUTE }}>
            {e.result ? "THIS MORNING, SCORED" : e.last ? `LAST MORNING · ${dayLabel(e.last.session).toUpperCase()}` : "OPENING BELL"}
          </span>
          <span style={{ fontSize: px(30), textAlign: "right" }}>
            {e.result
              ? `The Bell missed the open by ${e.result.bell.toFixed(0)} bp. Chain alone: ${e.result.raw.toFixed(0)} bp.`
              : e.last
                ? `The Bell missed by ${e.last.bell.toFixed(0)} bp. Chain alone: ${e.last.raw.toFixed(0)} bp.`
                : `${dayLabel(e.session)}, 09:30 ET.`}
          </span>
        </div>
      </div>
    </div>
  );
}
