"use client";

// Last resort: the root layout itself failed. This renders its own document without the site's
// stylesheet, so it carries its own few styles and reads the visitor's saved theme (light by default).

const ARCH = "M52 220V112A76 76 0 0 1 204 112V220H172V112A44 44 0 0 0 84 112V220Z";

export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  let dark = false;
  try {
    dark = typeof window !== "undefined" && localStorage.getItem("angelus-theme") === "dark";
  } catch {}
  const ink = dark ? "#f2f2f2" : "#0a0a0a";
  const bg = dark ? "#0a0a0a" : "#ffffff";
  const mute = dark ? "#9a9a9a" : "#5e5e5e";
  return (
    <html lang="en">
      <body suppressHydrationWarning style={{ margin: 0, background: bg, color: ink, fontFamily: "Georgia, 'Times New Roman', serif", minHeight: "100vh", display: "flex", alignItems: "center" }}>
        <title>Something slipped · ANGELUS</title>
        <main style={{ padding: "48px 24px", maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
          <svg width={44} height={44} viewBox="0 0 256 256" aria-hidden="true">
            <path d={ARCH} fill={ink} />
            <circle cx="128" cy="150" r="24" fill={ink} />
          </svg>
          <p style={{ margin: 0, fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: mute }}>ANGELUS · a rope slipped</p>
          <h1 style={{ margin: 0, fontWeight: 400, fontSize: "clamp(36px, 7vw, 56px)", lineHeight: 1.05, letterSpacing: "-0.02em" }}>
            The tower <em>went quiet.</em>
          </h1>
          <p style={{ margin: 0, fontSize: 19, lineHeight: 1.5, color: mute }}>Something went wrong while loading ANGELUS. Try again in a moment.</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="button" onClick={() => retry()} style={{ font: "500 12px ui-monospace, Menlo, Consolas, monospace", letterSpacing: "0.1em", textTransform: "uppercase", padding: "14px 18px", background: ink, color: bg, border: `1px solid ${ink}`, cursor: "pointer" }}>
              Try again
            </button>
            {/* A plain link on purpose: the router may be what failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ font: "500 12px ui-monospace, Menlo, Consolas, monospace", letterSpacing: "0.1em", textTransform: "uppercase", padding: "14px 18px", color: ink, border: `1px solid ${mute}`, textDecoration: "none" }}>
              Back to the belfry
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
