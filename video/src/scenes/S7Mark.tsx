import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { MarkScene } from "../three/SoloScenes";
import { mono, serif } from "../fonts";
import { Rise } from "../fx/Type";
import { inOut, out, ramp } from "../ease";
import { CUE, DUR } from "../motion";

// The mark. It opens on the bell alone, in macro, filling the frame; the camera pulls back and the arch of the
// tower closes around it as a light travels across. The bell rings once. Then the name.
export const S7_FRAMES = DUR.s7;
export const MARK_RING = CUE.markRing;
type V3 = [number, number, number];

const BALL: V3 = [0, -16, 0]; // the bell inside the mark, in world space

export function S7Mark() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = Math.max(0, (f - MARK_RING) / fps);
  const swing = f >= MARK_RING ? 0.3 * Math.exp(-t / 1.5) * Math.sin(t * 4.1) : 0;
  // hold the macro on the bell, then a long, even pull-back
  const k = ramp(f, 34, 190, 0, 1, inOut);
  const yaw = -0.38 * (1 - k);
  const pos: V3 = [14 * (1 - k), -12 * (1 - k) + 8 * k, 92 + (1100 - 92) * k];
  const look: V3 = [0, BALL[1] * (1 - k) + 4 * k, 0];
  // focus stays on the bell, then opens up to hold the whole arch
  const rack = ramp(f, 110, 180, 0, 1, inOut);
  const focus: V3 = [0, BALL[1] * (1 - rack) + 20 * rack, 0];
  const fadeIn = ramp(f, 0, 16);
  const fadeOut = 1 - ramp(f, DUR.s7 - 22, DUR.s7, 0, 1, inOut);
  const word = ramp(f, 158, 198, 0, 1, out);
  return (
    <AbsoluteFill style={{ background: "#000", opacity: fadeIn * fadeOut }}>
      <AbsoluteFill style={{ transform: `translateY(${-96 * k}px)` }}>
        <MarkScene yaw={yaw} swing={swing} light={ramp(f, 0, 36)} sweep={ramp(f, 30, 170, 0, 1, inOut)} pos={pos} look={look} focus={focus} bokeh={5 - 3.5 * rack} />
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 170 }}>
        <div style={{ fontFamily: serif, fontWeight: 500, fontSize: 62, letterSpacing: `${0.32 + (1 - word) * 0.25}em`, paddingLeft: "0.32em", color: "#f2f2f2", opacity: word }}>ANGELUS</div>
        <div style={{ marginTop: 22 }}>
          <Rise parts={[{ text: "The stock market's" }, { text: "night, priced.", italic: true }]} at={190} size={40} stagger={3} weight={300} color="#bdbdbd" tracking={0} />
        </div>
        <div style={{ marginTop: 44, fontFamily: mono, fontSize: 20, letterSpacing: "0.2em", color: "#8f8f8f", opacity: ramp(f, 222, 242) }}>@USEANGELUS</div>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "flex-end", padding: "0 60px 44px" }}>
        <span style={{ fontFamily: mono, fontSize: 13, letterSpacing: "0.16em", color: "#5f5f5f", opacity: ramp(f, 230, 250) }}>ESTIMATES, NOT ADVICE.</span>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
