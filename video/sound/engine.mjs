// The bell engine: renders every bell stroke you see in the film as audio, on its frame, from one real
// recording (a 15 cm bell, public domain), pitched per bell, panned to where the bell sits in the frame.
//
//   node sound/engine.mjs   -> out/stems/belfry.wav, out/stems/lone.wav (48 kHz stereo, float)

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as M from "../src/motion.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(ROOT, "out", "stems");
mkdirSync(OUT, { recursive: true });
const SR = 48000;
const LEN = Math.ceil((M.TOTAL / M.FPS) * SR) + SR;

/** Decode a recording to interleaved stereo float32 at 48 kHz. */
function decode(file) {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "2", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(String(r.stderr));
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.byteLength / 4);
}

/** Add a sample into a stereo bus at time t (s), resampled by `rate`, with gain and equal-power pan (-1..1). */
function place(bus, src, t, { rate = 1, gain = 1, pan = 0, maxSec = 6, fadeSec = 1.2 }) {
  const start = Math.round(t * SR);
  const frames = src.length / 2;
  const n = Math.min(Math.floor((frames - 2) / rate), Math.round(maxSec * SR));
  const fadeN = Math.round(fadeSec * SR);
  const a = ((pan + 1) / 2) * (Math.PI / 2);
  const gl = Math.cos(a) * gain, gr = Math.sin(a) * gain;
  for (let i = 0; i < n; i++) {
    const o = start + i;
    if (o < 0) continue;
    if (o >= bus.length / 2) break;
    const p = i * rate;
    const k = Math.floor(p), fr = p - k;
    const l = src[k * 2] * (1 - fr) + src[(k + 1) * 2] * fr;
    const r = src[k * 2 + 1] * (1 - fr) + src[(k + 1) * 2 + 1] * fr;
    const env = i > n - fadeN ? (n - i) / fadeN : 1;
    bus[o * 2] += l * gl * env;
    bus[o * 2 + 1] += r * gr * env;
  }
}

function writeWav(file, bus) {
  const data = Buffer.from(bus.buffer, bus.byteOffset, bus.byteLength);
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34);
  h.write("data", 36); h.writeUInt32LE(data.length, 40);
  writeFileSync(file, Buffer.concat([h, data]));
}

const small = decode(join(ROOT, "audio-src", "Striking_a_bell_15cm_large.ogg"));
const sec = (scene, frame) => (M.START[scene] + frame) / M.FPS;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// ---------------------------------------------------------------- the belfry (s3, s5)
const belfry = new Float32Array(LEN * 2);
let count = 0;
const maxAmp = Math.max(...M.NIGHT.map((_, i) => M.bellParams(i).amp));

function ringBelfry(scene, fromFrame, toFrame, tOffsetFrames, cameraAt, level) {
  for (let i = 0; i < M.NIGHT.length; i++) {
    const t0 = (fromFrame + tOffsetFrames) / M.FPS, t1 = (toFrame + tOffsetFrames) / M.FPS;
    for (const { t } of M.strikeTimes(i, t0, t1)) {
      const frame = t * M.FPS - tOffsetFrames; // frame inside the scene
      const cam = cameraAt(frame);
      const p = M.bellPosition(i);
      const pr = M.project([p[0], p[1] - 35, 0], cam.pos, cam.look);
      if (!pr.inFront) continue;
      const onScreen = pr.x > -200 && pr.x < 2120 && pr.y > -200 && pr.y < 1280 ? 1 : 0.35;
      const near = clamp(420 / pr.dist, 0.25, 1.6);
      const mover = Math.sqrt(M.bellParams(i).amp / maxAmp);
      const gain = level(frame) * near * onScreen * (0.22 + 0.5 * mover);
      if (gain < 0.01) continue;
      const pan = clamp((pr.x / 1920) * 2 - 1, -0.85, 0.85);
      // the 15 cm bell, pitched down into a tower bell: lower for the heavy movers of the bottom row
      place(belfry, small, sec(scene, frame), { rate: M.bellPitch(i) * 0.4, gain, pan, maxSec: 5, fadeSec: 1.5 });
      count++;
    }
  }
}

// s3: from the moment the tower appears until the scene fades
ringBelfry("s3", M.CUE.reveal - 4, M.DUR.s3 - 10, 40, (f) => M.s3Camera(f), (f) => clamp((f - (M.CUE.reveal - 4)) / 30, 0, 1));
// s5: the bells swing until 04:00, and not one stroke after
ringBelfry("s5", 0, M.CUE.lock, 300, (f) => M.s5Camera(f), (f) => clamp(f / 14, 0, 1) * 0.85);

// ---------------------------------------------------------------- the lone bells (s1 closing, s6 opening)
const lone = new Float32Array(LEN * 2);
for (const [which, scene, cue, rate, gain] of [
  ["s1", "s1", M.CUE.closeStrike, 0.34, 1.0],
  ["s6", "s6", M.CUE.openStrike, 0.27, 1.15],
]) {
  for (const s of M.loneStrikes(which, 7)) {
    // the swing carries the bell left and right of the frame centre; the sound follows a little
    const side = Math.sin((s.t * Math.PI * 2) / M.LONE[which].period) * M.LONE[which].sign;
    place(lone, small, sec(scene, cue) + s.t, { rate, gain: gain * s.gain, pan: clamp(side * 0.25, -0.3, 0.3), maxSec: 9, fadeSec: 3 });
  }
}

writeWav(join(OUT, "belfry.wav"), belfry);
writeWav(join(OUT, "lone.wav"), lone);
console.log(`belfry strokes: ${count}; stems in ${OUT}`);
