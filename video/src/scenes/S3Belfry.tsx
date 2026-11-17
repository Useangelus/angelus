import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { BelfryScene, bellPosition } from "../three/BelfryScene";
import { handheld } from "../three/parts";
import { project } from "../three/project";
import { serif } from "../fonts";
import { Label, Rise } from "../fx/Type";
import { inOut, ramp } from "../ease";
import { CUE, DUR, NIGHT, S3_HERO, S3_WIDE, s3Camera } from "../motion";

// "Its stocks are not." Then the belfry: from one bell, close and in focus, out to all sixteen swinging in the tower.
export const S3_FRAMES = DUR.s3;
const REVEAL = CUE.reveal;

export function S3Belfry() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cam = s3Camera(f);
  const hh = handheld(f / fps, 1 - 0.6 * cam.k);
  const pos: [number, number, number] = [cam.pos[0] + hh[0], cam.pos[1] + hh[1], cam.pos[2] + hh[2]];
  const hero = bellPosition(S3_HERO);
  // focus holds the hero bell, then racks out to the whole grid as the camera settles
  const rack = ramp(f, 160, 260, 0, 1, inOut);
  const focus: [number, number, number] = [hero[0] * (1 - rack), (hero[1] - 36) * (1 - rack) - 18 * rack, 0];
  const t = (f + 40) / fps;
  const scene = ramp(f, REVEAL - 6, REVEAL + 40);
  const tagsIn = ramp(f, 292, 322);
  const fadeIn = ramp(f, 0, 10);
  const fadeOut = 1 - ramp(f, DUR.s3 - 18, DUR.s3, 0, 1, inOut);
  return (
    <AbsoluteFill style={{ background: "#000", opacity: fadeIn * fadeOut }}>
      <AbsoluteFill style={{ opacity: scene }}>
        <BelfryScene shot={{ t, swing: 1, light: 0.35 + 0.65 * ramp(f, REVEAL, REVEAL + 90), pos, look: cam.look, fov: 34, focus, focusRange: 90 + 400 * rack, bokeh: 4 - 2.5 * rack }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: tagsIn }}>
        {NIGHT.map(({ ticker }, i) => {
          const p = bellPosition(i);
          const [x, y] = project([p[0], p[1] - 82, 0], S3_WIDE.pos, S3_WIDE.look);
          return (
            <span key={ticker} style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, 0)", fontFamily: serif, fontSize: 21, letterSpacing: "0.06em", color: "#e6e6e6", textShadow: "0 2px 10px rgba(0,0,0,0.9)" }}>
              {ticker}
            </span>
          );
        })}
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: 1 - scene * 0.999 }}>
        <Rise parts={[{ text: "Its stocks" }, { text: "are not.", italic: true }]} at={6} size={150} outAt={50} />
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 140px 80px" }}>
        <Label text="16 stocks · 3 chains · trading all night" at={300} size={19} color="#a8a8a8" outAt={DUR.s3 - 24} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
