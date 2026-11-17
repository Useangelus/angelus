import { Easing, interpolate } from "remotion";

// One motion language for the whole film: long, soft decelerations; nothing bounces.
export const out = Easing.bezier(0.16, 1, 0.3, 1);
export const inOut = Easing.bezier(0.65, 0, 0.35, 1);
export const settle = Easing.bezier(0.22, 1, 0.36, 1);

export const ramp = (f: number, a: number, b: number, from = 0, to = 1, easing = out) =>
  interpolate(f, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });

/** 0 → 1 → 0 envelope: in over [a,b], hold, out over [c,d]. */
export const env = (f: number, a: number, b: number, c: number, d: number) =>
  Math.min(ramp(f, a, b), 1 - ramp(f, c, d, 0, 1, inOut));
