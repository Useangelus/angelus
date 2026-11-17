// Shared by the film (Remotion) and the sound engine (sound/*.mjs): the same numbers drive what you see
// and what you hear, so every visible bell stroke is heard on its frame.

export const FPS = 30;
export const OVERLAP = 10;

/** Scene lengths in frames, in order. */
export const DUR = { s1: 200, s2: 196, s3: 360, s4: 320, s5: 230, s6: 250, s7: 280 };
const ORDER = ["s1", "s2", "s3", "s4", "s5", "s6", "s7"] as const;
type Scene = keyof typeof DUR;
export const START = {} as Record<Scene, number>;
{
  let acc = 0;
  for (const k of ORDER) {
    START[k] = acc;
    acc += DUR[k] - OVERLAP;
  }
}
export const TOTAL = START.s7 + DUR.s7;

/** Cue frames inside each scene. */
export const CUE = {
  closeStrike: 34, // s1: the closing bell is struck
  reveal: 64, // s3: the belfry appears
  lock: 96, // s5: 04:00:00
  openStrike: 10, // s6: the opening bell
  recordCut: 112, // s6: cut to the record
  markRing: 70, // s7: the bell inside the mark rings, as the camera clears it
};

// One real night of the board (Mon Nov 16 -> Tue Nov 17, 2026): each stock's overnight move from the close.
export const NIGHT = [
  { ticker: "NVDA", gap: -0.0033 }, { ticker: "TSLA", gap: -0.0047 }, { ticker: "AAPL", gap: 0.0009 }, { ticker: "MSFT", gap: -0.0006 },
  { ticker: "AMZN", gap: -0.0014 }, { ticker: "META", gap: -0.0037 }, { ticker: "GOOGL", gap: -0.0013 }, { ticker: "AMD", gap: 0.0048 },
  { ticker: "PLTR", gap: -0.0018 }, { ticker: "COIN", gap: -0.0121 }, { ticker: "MSTR", gap: -0.0036 }, { ticker: "CRCL", gap: -0.0108 },
  { ticker: "NFLX", gap: 0.0024 }, { ticker: "AVGO", gap: -0.0006 }, { ticker: "SPY", gap: 0.0004 }, { ticker: "QQQ", gap: -0.0008 },
];

export const SX = 108;
export const SY = 150;

export function bellPosition(i: number): [number, number, number] {
  const cols = 8;
  const r = Math.floor(i / cols), c = i % cols;
  return [c * SX - ((cols - 1) * SX) / 2, SY / 2 - r * SY, 0];
}

export function bellParams(i: number) {
  const g = NIGHT[i].gap;
  return {
    amp: Math.min(0.42, Math.max(0.07, Math.abs(g) * 38)),
    bias: Math.sign(g) * Math.min(0.18, Math.abs(g) * 14),
    w: (Math.PI * 2) / (2.1 + (i % 5) * 0.13),
    ph: i * 1.7,
  };
}

/** How bell i hangs at time t (s): as far as its stock moved overnight, leaning the way it moved. */
export function swingOf(i: number, t: number, amount: number) {
  const { amp, bias, w, ph } = bellParams(i);
  return {
    angle: (bias + amp * Math.sin(w * t + ph)) * amount,
    clapperLag: -0.6 * amp * amount * Math.sin(w * t + ph - 0.8),
  };
}

/** Times (s) in [t0, t1) when bell i reaches the end of a swing: the moment a swinging bell sounds. */
export function strikeTimes(i: number, t0: number, t1: number) {
  const { w, ph } = bellParams(i);
  const out: { t: number; side: number }[] = [];
  let k = Math.ceil((w * t0 + ph - Math.PI / 2) / Math.PI);
  for (;;) {
    const t = (Math.PI / 2 + k * Math.PI - ph) / w;
    if (t >= t1) break;
    if (t >= t0) out.push({ t, side: k % 2 === 0 ? 1 : -1 });
    k++;
  }
  return out;
}

/** Each bell's pitch, as a ratio: a carillon tuned in fourths and fifths, low bells for the heavy movers. */
export function bellPitch(i: number) {
  const scale = [1, 1.125, 1.25, 1.5, 1.6875, 2, 2.25, 2.5];
  return scale[i % 8] * (i < 8 ? 1 : 0.75);
}

// Belfry camera in s3: from a close-up of CRCL (the night's biggest mover) out to the whole tower.
export const S3_WIDE: { pos: [number, number, number]; look: [number, number, number] } = { pos: [0, -60, 1010], look: [0, -18, 0] };
export const S3_HERO = 11;

// ---- cameras shared with the sound engine (so a bell on the left of the frame is heard on the left)

type V3 = [number, number, number];
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** cubic-bezier(0.22, 1, 0.36, 1), the film's "settle" curve */
export function settleEase(x: number) {
  x = clamp01(x);
  // solve bezier x(t) = x with a few Newton steps
  const p1x = 0.22, p1y = 1, p2x = 0.36, p2y = 1;
  const bx = (t: number) => 3 * (1 - t) ** 2 * t * p1x + 3 * (1 - t) * t ** 2 * p2x + t ** 3;
  const by = (t: number) => 3 * (1 - t) ** 2 * t * p1y + 3 * (1 - t) * t ** 2 * p2y + t ** 3;
  let t = x;
  for (let k = 0; k < 8; k++) {
    const d = (bx(t + 1e-4) - bx(t - 1e-4)) / 2e-4;
    if (Math.abs(d) < 1e-6) break;
    t = clamp01(t - (bx(t) - x) / d);
  }
  return by(t);
}
const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/** s3: from a close-up of the hero bell out to the whole tower. f = frame inside the scene. */
export function s3Camera(f: number) {
  const b = bellPosition(S3_HERO);
  const k = settleEase((f - CUE.reveal) / (300 - CUE.reveal));
  const close: V3 = [b[0] + 30, b[1] - 40, 150];
  const lookClose: V3 = [b[0], b[1] - 36, 0];
  return { pos: lerp3(close, S3_WIDE.pos, k), look: lerp3(lookClose, S3_WIDE.look, k), k };
}

/** s5: a slow drift across the tower toward the lock. */
export function s5Camera(f: number) {
  const x = f / DUR.s5;
  const k = x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
  return { pos: [-120 + 100 * k, -70 + 20 * k, 1220 - 110 * k] as V3, look: [0, -36, 0] as V3 };
}

/** Screen position (0..1920, 0..1080) and distance of a world point for a camera, fov in degrees. */
export function project(p: V3, pos: V3, look: V3, fov = 34) {
  const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a: V3): V3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const fwd = norm(sub(look, pos));
  const right = norm(cross(fwd, [0, 1, 0]));
  const up = cross(right, fwd);
  const d = sub(p, pos);
  const z = dot(d, fwd);
  const tanH = Math.tan(((fov * Math.PI) / 180) / 2);
  const aspect = 1920 / 1080;
  const nx = dot(d, right) / (z * tanH * aspect);
  const ny = dot(d, up) / (z * tanH);
  return { x: ((nx + 1) / 2) * 1920, y: ((1 - ny) / 2) * 1080, dist: Math.hypot(...d), inFront: z > 0 };
}

// ---- the lone bells (s1 closing, s6 opening): a damped swing after one strike
export const LONE = {
  s1: { amp: 0.36, decay: 2.6, period: 2.5, sign: 1 },
  s6: { amp: -0.5, decay: 2.0, period: 2.2, sign: -1 },
};
export function loneSwing(which: "s1" | "s6", t: number) {
  const L = LONE[which];
  if (t < 0) return { angle: 0, clapper: 0 };
  const angle = L.amp * Math.exp(-t / L.decay) * Math.sin((t * Math.PI * 2) / L.period);
  const clapper = -L.amp * 0.9 * Math.exp(-t / (L.decay * 0.55)) * Math.sin((t * Math.PI * 2) / L.period - 0.9);
  return { angle, clapper };
}
/** Strokes of a lone bell: the strike, then each end of a swing while it still has energy. */
export function loneStrikes(which: "s1" | "s6", tMax: number) {
  const L = LONE[which];
  const out = [{ t: 0, gain: 1 }];
  for (let k = 0; ; k++) {
    const t = L.period / 4 + (k * L.period) / 2;
    if (t > tMax) break;
    const g = Math.exp(-t / L.decay);
    if (g < 0.12) break;
    out.push({ t, gain: g });
  }
  return out;
}

// ---- the 15-second teaser: hard cuts through the film, in order. [film frame from, length]
export const TEASER_CUTS: [number, number][] = [
  [START.s1 + 14, 50], // the lip of the bell, the strike
  [START.s2 + 76, 70], // Wall Street is asleep.
  [START.s3 + 4, 44], // Its stocks are not.
  [START.s3 + 254, 70], // the belfry, all sixteen swinging
  [START.s5 + 70, 74], // 03:59:59 -> 04:00:00, the bells stop
  [START.s7 + 128, 152], // the mark, the name
];
export const TEASER_FRAMES = TEASER_CUTS.reduce((a, [, n]) => a + n, 0);
