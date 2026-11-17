import { ImageResponse } from "next/og";

export const alt = "ANGELUS: Wall Street is asleep. Its stocks are not.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0a0a0a", color: "#f2f2f2", padding: 72, fontFamily: "Georgia, serif" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 10, color: "#9a9a9a" }}>ANGELUS</div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 84, lineHeight: 1.0, letterSpacing: -2 }}>
            <div style={{ display: "flex" }}>Wall Street is&nbsp;<span style={{ color: "#ffffff", fontStyle: "italic" }}>asleep.</span></div>
            <div style={{ display: "flex" }}>Its stocks are not.</div>
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#9a9a9a" }}>The next opening bell, priced on Robinhood Chain.</div>
        </div>
        <svg width="300" height="300" viewBox="0 0 256 256" style={{ alignSelf: "center" }}>
          <path d="M52 220V112A76 76 0 0 1 204 112V220H172V112A44 44 0 0 0 84 112V220Z" fill="#f2f2f2" />
          <circle cx="128" cy="150" r="24" fill="#f2f2f2" />
        </svg>
      </div>
    ),
    size,
  );
}
