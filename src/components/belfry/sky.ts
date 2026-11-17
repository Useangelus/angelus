// The sky over the belfry, keyed to the wall clock in New York.
// Minutes since midnight ET → [zenith, horizon] colours, plus how dark it is (0 day … 1 night).

type Key = [number, string, string, number];

const KEYS: Key[] = [
  [0, "#04060c", "#0b111f", 1],
  [240, "#070b18", "#18203a", 0.95], // 04:00, the lock: first blue
  [360, "#151b36", "#4f425a", 0.75],
  [420, "#2a3a62", "#b9876e", 0.5], // dawn
  [510, "#6f93b8", "#e5c7a2", 0.15],
  [570, "#9ab9d3", "#ece2cc", 0], // 09:30, the bell
  [900, "#a5c0d6", "#efe7d4", 0],
  [960, "#5d6c8c", "#d79a5e", 0.2], // 16:00, the close: dusk
  [1050, "#232842", "#7a4b48", 0.55],
  [1140, "#0c1122", "#27243a", 0.85],
  [1260, "#05080f", "#0e1424", 1],
  [1440, "#04060c", "#0b111f", 1],
];

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: string, b: string, t: number): string {
  const x = hex(a), y = hex(b);
  const r = x.map((v, i) => Math.round(v + (y[i] - v) * t));
  return `rgb(${r[0]},${r[1]},${r[2]})`;
}

export interface Sky { top: string; bottom: string; dark: number }

export function skyAt(minutes: number): Sky {
  const m = ((minutes % 1440) + 1440) % 1440;
  for (let i = 0; i < KEYS.length - 1; i++) {
    const [a, at, ab, ad] = KEYS[i];
    const [b, bt, bb, bd] = KEYS[i + 1];
    if (m >= a && m <= b) {
      const t = (m - a) / (b - a);
      const e = t * t * (3 - 2 * t);
      return { top: mix(at, bt, e), bottom: mix(ab, bb, e), dark: ad + (bd - ad) * e };
    }
  }
  return { top: KEYS[0][1], bottom: KEYS[0][2], dark: 1 };
}

export function nyMinutes(t: number): number {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "numeric", hourCycle: "h23" })
    .formatToParts(new Date(t));
  const h = Number(p.find((x) => x.type === "hour")?.value ?? 0);
  const mi = Number(p.find((x) => x.type === "minute")?.value ?? 0);
  return h * 60 + mi;
}

/** The same sky in black and white: luminance only; on light pages, lifted toward white. */
export function mono(c: string, light: boolean): string {
  const m = c.startsWith("#") ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : c.match(/\d+/g)!.map(Number);
  let y = Math.round(0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]);
  if (light) y = Math.round(y + (244 - y) * 0.78);
  return `rgb(${y},${y},${y})`;
}

/** Paint the sky (gradient + stars that fade with daylight) into a canvas. */
export function paintSky(ctx: CanvasRenderingContext2D, w: number, h: number, sky: Sky, seed = 7, light = false) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, mono(sky.top, light));
  g.addColorStop(1, mono(sky.bottom, light));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  if (sky.dark < 0.3 || light) return;
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const n = Math.round((w * h) / 2500);
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = rnd() * h * 0.85, r = rnd() * rnd() * 1.4 + 0.35;
    ctx.globalAlpha = (sky.dark - 0.3) * (0.4 + rnd() * 0.6);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
