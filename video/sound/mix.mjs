// ANGELUS intro: the final sound mix, from real recordings only (CC0 / public domain, Wikimedia Commons).
// No stock music, no synthesis: every sound is a recorded bell or clock, cut, pitched or filtered.
//
//   node sound/engine.mjs && node sound/mix.mjs
//     -> out/mix-16.wav and out/angelus-intro.mp4 (film + sound, -16 LUFS)
//     -> out/angelus-teaser.mp4 (if out/teaser-hq.mp4 exists: the same mix, cut at the teaser's cuts)
//
// Every cue time comes from src/motion.ts, the same file that drives the picture.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as M from "../src/motion.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = join(ROOT, "audio-src");
const OUT = join(ROOT, "out");
const STEMS = join(OUT, "stems");
mkdirSync(OUT, { recursive: true });

const F = {
  closing: join(SRC, "20150323_SM_Glocke_5.ogg"), // Ludwigsglocke, St. Maximilian (CC0): the room of the 16:00 bell
  opening: join(SRC, "20150323_SM_Glocke_4.ogg"), // Maximiliansglocke (CC0): the room of the 09:30 bell, the lock thud
  hum: join(SRC, "20150323_SM_Glocke_6.ogg"), // Ottoglocke (CC0): slowed two octaves into the night's hum
  small: join(SRC, "Striking_a_bell_15cm_large.ogg"), // 15 cm bell (public domain): the mark
  tick: join(SRC, "Tick2.ogg"), // small clock (CC0): the last seconds before 04:00
  belfry: join(STEMS, "belfry.wav"), // engine.mjs: every visible belfry stroke
  lone: join(STEMS, "lone.wav"), // engine.mjs: the strokes of the lone bells
};
for (const [k, p] of Object.entries(F)) if (!existsSync(p)) throw new Error(`missing ${k}: ${p} (run sound/engine.mjs first?)`);

const ff = (args) => execFileSync("ffmpeg", ["-v", "warning", "-y", ...args], { stdio: ["ignore", "inherit", "inherit"] });
const sec = (scene, frame) => (M.START[scene] + frame) / M.FPS;
const T = {
  close: sec("s1", M.CUE.closeStrike),
  tickIn: sec("s5", 0),
  lock: sec("s5", M.CUE.lock),
  open: sec("s6", M.CUE.openStrike),
  mark: sec("s7", M.CUE.markRing),
  end: M.TOTAL / M.FPS,
};
console.log("cues (s):", Object.fromEntries(Object.entries(T).map(([k, v]) => [k, +v.toFixed(2)])));

// Strong strokes inside the church-bell peals, measured by hand (0.25 s RMS windows).
const ON = { closing: 0.7, opening: 7.15, thud: 10.4 };

const SR = 48000;
const ms = (s) => Math.round(s * 1000);
const prep = `aresample=${SR},aformat=sample_fmts=fltp:channel_layouts=stereo`;
const place = (s) => `adelay=${ms(s)}|${ms(s)}`;
const inputs = [];
const I = (file) => {
  inputs.push("-i", file);
  return `[${inputs.length / 2 - 1}:a]`;
};
const stems = [];
const labels = [];
const add = (label, chain) => {
  stems.push(`${chain}[${label}]`);
  labels.push(label);
};

// 1. The bells you see: belfry strokes and lone-bell strokes, rendered on their frames by engine.mjs, in a stone room.
// at 04:00 every bell is stopped by hand: the tower goes silent with them (a 60 ms damp, no ring-out)
add("belfry", `${I(F.belfry)}${prep},aecho=0.8:0.55:70|150|260:0.28|0.2|0.12,volume=1.5,afade=t=out:st=${T.lock.toFixed(3)}:d=0.06`);
add("lone", `${I(F.lone)}${prep},aecho=0.8:0.6:90|190|320:0.3|0.22|0.14,volume=1.6`);

// 2. The room of the big bells: the real church peals under the synced strokes, starting with them.
add("closeRoom", `${I(F.closing)}${prep},atrim=start=${ON.closing}:duration=8,asetpts=PTS-STARTPTS,lowpass=f=3200,afade=t=out:st=4.5:d=3.5,volume=0.75,${place(T.close)}`);
add("openRoom", `${I(F.opening)}${prep},atrim=start=${ON.opening}:duration=10,asetpts=PTS-STARTPTS,lowpass=f=3600,afade=t=out:st=6:d=4,volume=0.42,${place(T.open)}`);

// 3. The night's hum: the Ottoglocke slowed two octaves. It thins out in the last second before 04:00,
//    leaving the clock alone, and is cut dead at the lock. It comes back, quieter, after the opening bell.
const hum = (label, from, to, vol, fin, fout) =>
  add(label, `${I(F.hum)}${prep},asetrate=${SR / 4},aresample=${SR},lowpass=f=1400,highpass=f=38,aloop=loop=-1:size=${SR * 40},` +
    `atrim=duration=${(to - from).toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=${fin},afade=t=out:st=${(to - from - fout).toFixed(3)}:d=${fout},volume=${vol},${place(from)}`);
hum("humA", 5.2, T.lock, 0.2, 4.5, 1.1);
hum("humB", T.open + 1.2, T.end, 0.14, 5, 3.5);

// 4. 03:59:57: a small clock, close, louder as the lock nears; stops with it.
add("tick", `${I(F.tick)}${prep},atrim=start=2:duration=${(T.lock - T.tickIn + 0.01).toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=1.6,volume=5.5,${place(T.tickIn)}`);

// 5. 04:00:00: the first instant of a great bell, choked by a hand: a heavy, muffled thud.
add("thud", `${I(F.opening)}${prep},atrim=start=${ON.thud}:duration=1.4,asetpts=PTS-STARTPTS,lowpass=f=260,afade=t=out:st=0.12:d=1.2,volume=2.4,${place(T.lock)}`);

// 6. The mark: the small bell, struck once as the camera clears it, ringing out under the name.
add("mark", `${I(F.small)}${prep},atrim=start=0:duration=${(T.end - T.mark).toFixed(3)},asetpts=PTS-STARTPTS,aecho=0.8:0.5:120|260:0.25|0.15,afade=t=out:st=${(T.end - T.mark - 2.5).toFixed(3)}:d=2.5,volume=0.85,${place(T.mark)}`);

const graph = stems.join(";") + `;${labels.map((l) => `[${l}]`).join("")}amix=inputs=${labels.length}:normalize=0:duration=longest,apad=whole_dur=${T.end},alimiter=limit=0.89:level=0,aresample=${SR}[mix]`;
writeFileSync(join(OUT, "graph.txt"), graph.split(";").join(";\n"));

// The length is cut on the output side: an atrim after amix misreads the delayed timestamps.
const wav = join(OUT, "mix.wav");
ff([...inputs, "-filter_complex", graph, "-map", "[mix]", "-t", T.end.toFixed(3), "-ar", String(SR), "-c:a", "pcm_s24le", wav]);

// Loudness: measure, then one static gain to -16 LUFS and a brick-wall limiter (no auto-level).
const meas = spawnSync("ffmpeg", ["-hide_banner", "-i", wav, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" }).stderr;
const integrated = Number([...meas.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].at(-1)[1]);
const gain = (-16 - integrated).toFixed(2);
const wav16 = join(OUT, "mix-16.wav");
ff(["-i", wav, "-af", `volume=${gain}dB,alimiter=limit=0.84:level=0:attack=2:release=60`, "-c:a", "pcm_s24le", wav16]);
console.log(`loudness ${integrated} LUFS -> -16 (gain ${gain} dB)`);

const mux = (video, audio, out) => ff(["-i", video, "-i", audio, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-af", "apad", "-c:a", "aac", "-b:a", "320k", "-shortest", "-movflags", "+faststart", out]);

const film = join(OUT, "video-hq.mp4");
if (existsSync(film)) {
  mux(film, wav16, join(OUT, "angelus-intro.mp4"));
  console.log("wrote out/angelus-intro.mp4");
}

// Teaser: the same mix, cut at the teaser's cuts, with 12 ms fades at each join so no cut clicks.
const teaserVideo = join(OUT, "teaser-hq.mp4");
if (existsSync(teaserVideo)) {
  const parts = M.TEASER_CUTS.map(([from, n], i) => {
    const s = (from / M.FPS).toFixed(4), d = (n / M.FPS).toFixed(4);
    return `[0:a]atrim=start=${s}:duration=${d},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.012,afade=t=out:st=${(n / M.FPS - 0.012).toFixed(4)}:d=0.012[p${i}]`;
  });
  const tail = (M.TEASER_FRAMES / M.FPS - 2.2).toFixed(3);
  const g = parts.join(";") + `;${M.TEASER_CUTS.map((_, i) => `[p${i}]`).join("")}concat=n=${M.TEASER_CUTS.length}:v=0:a=1,afade=t=out:st=${tail}:d=2.2[t]`;
  const twav = join(OUT, "teaser.wav");
  const raw = join(OUT, "teaser-raw.wav");
  ff(["-i", wav16, "-filter_complex", g, "-map", "[t]", "-c:a", "pcm_s24le", raw]);
  // the cut has its own loudness: bring it to -16 LUFS as well
  const tm = spawnSync("ffmpeg", ["-hide_banner", "-i", raw, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const ti = Number([...tm.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].at(-1)[1]);
  ff(["-i", raw, "-af", `volume=${(-16 - ti).toFixed(2)}dB,alimiter=limit=0.84:level=0:attack=2:release=60`, "-c:a", "pcm_s24le", twav]);
  mux(teaserVideo, twav, join(OUT, "angelus-teaser.mp4"));
  console.log("wrote out/angelus-teaser.mp4");
}
