import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { BelfryScene } from "../three/BelfryScene";
import { mono } from "../fonts";
import { Label, Rise, Rule } from "../fx/Type";
import { inOut, out, ramp } from "../ease";
import { handheld } from "../three/parts";
import { CUE, DUR, s5Camera } from "../motion";

// 04:00 ET: the clock reaches the lock and every bell stops at once.
export const S5_FRAMES = DUR.s5;
export const LOCK_AT = CUE.lock; // frame of 04:00:00 within this scene

export function S5Lock() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Clock: 03:59:57 → 04:00:00, one second per second.
  const secs = Math.min(3, Math.floor((f + (fps * 3 - LOCK_AT)) / fps));
  const clockText = secs >= 3 ? "04:00:00" : `03:59:${String(57 + secs).padStart(2, "0")}`;
  const locked = f >= LOCK_AT;
  // The bells stop: a quick, heavy damping, the way a hand stops a bell.
  const swing = locked ? Math.exp(-(f - LOCK_AT) / 4) : 1;
  const t = (f + 300) / fps;
  const cam = s5Camera(f);
  // the camera is held until the lock, then goes still with the bells
  const hh = handheld(f / fps, locked ? Math.exp(-(f - LOCK_AT) / 6) * 0.8 : 0.8);
  const pos: [number, number, number] = [cam.pos[0] + hh[0], cam.pos[1] + hh[1], cam.pos[2] + hh[2]];
  const fadeIn = ramp(f, 0, 12);
  const fadeOut = 1 - ramp(f, 212, 230, 0, 1, inOut);
  const flash = locked ? Math.exp(-(f - LOCK_AT) / 5) : 0;
  return (
    <AbsoluteFill style={{ background: "#000", opacity: fadeIn * fadeOut }}>
      <AbsoluteFill style={{ opacity: 0.85 }}>
        <BelfryScene shot={{ t, swing, light: locked ? 0.72 : 0.9, pos, look: cam.look, fov: 34, focus: [0, -40, 0], focusRange: 520, bokeh: 1.6 }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 26%, rgba(0,0,0,0) 40%, rgba(0,0,0,0) 66%, rgba(0,0,0,0.85) 80%)" }} />
      <AbsoluteFill style={{ padding: "120px 140px" }}>
        <Label text="Pre-market begins on Wall Street" at={8} size={19} />
        <div style={{ marginTop: 24, fontFamily: mono, fontSize: 96, letterSpacing: "-0.02em", color: locked ? "#ffffff" : "#bdbdbd", opacity: ramp(f, 4, 22), textShadow: `0 0 ${40 * flash}px rgba(255,255,255,${0.6 * flash})` }}>
          {clockText}
          <span style={{ fontSize: 40, letterSpacing: "0.12em", marginLeft: 20, color: "#8a8a8a" }}>ET</span>
        </div>
        <div style={{ marginTop: 8 }}>
          <Rule at={LOCK_AT} dur={14} width={980} color="rgba(255,255,255,0.8)" />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 140px 96px" }}>
        <div>
          <Rise parts={[{ text: "The numbers are" }, { text: "locked.", italic: true }]} at={LOCK_AT + 10} size={84} outAt={204} />
        </div>
        <div style={{ marginTop: 22, opacity: ramp(f, LOCK_AT + 40, LOCK_AT + 60, 0, 1, out) }}>
          <Label text="Made from on-chain trading alone. Scored at the open." at={LOCK_AT + 40} size={19} color="#a8a8a8" outAt={200} speed={1.6} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
