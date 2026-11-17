import "server-only";

// Fonts for generated images. ImageResponse needs TTF/OTF bytes, so ask Google Fonts for
// a subset limited to the characters on the card; it returns a TrueType file for that request.

async function load(css: string): Promise<ArrayBuffer | null> {
  try {
    const r = await fetch(css, { next: { revalidate: 86400 } });
    if (!r.ok) return null;
    const m = (await r.text()).match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
    if (!m) return null;
    const f = await fetch(m[1], { next: { revalidate: 86400 } });
    return f.ok ? f.arrayBuffer() : null;
  } catch {
    return null;
  }
}

const LATIN = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]_abcdefghijklmnopqrstuvwxyz{|}·—–→…×";

export async function cardFonts(text = "") {
  const t = encodeURIComponent(Array.from(new Set(LATIN + text)).join(""));
  const [serif, serifIt, mono] = await Promise.all([
    load(`https://fonts.googleapis.com/css2?family=Newsreader:wght@300&text=${t}`),
    load(`https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@1,300&text=${t}`),
    load(`https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400&text=${t}`),
  ]);
  const fonts: { name: string; data: ArrayBuffer; weight: 300 | 400; style: "normal" | "italic" }[] = [];
  if (serif) fonts.push({ name: "Newsreader", data: serif, weight: 300, style: "normal" });
  if (serifIt) fonts.push({ name: "Newsreader", data: serifIt, weight: 300, style: "italic" });
  if (mono) fonts.push({ name: "Plex", data: mono, weight: 400, style: "normal" });
  return fonts;
}
