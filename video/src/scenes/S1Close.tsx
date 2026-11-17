import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { LoneBell } from "../three/SoloScenes";
import { handheld } from "../three/parts";
import { Label, Rise, Rule } from "../fx/Type";
import { inOut, ramp, settle } from "../ease";
import { CUE, DUR, loneSwing } from "../motion";

// 16:00 ET. Out of the dark, the lip of a bell, in macro. It is struck; the camera pulls back and the focus
// racks from the lip to the whole bell as it swings: the closing bell.
export const S1_FRAMES = DUR.s1;
const STRIKE = CUE.closeStrike;
type V3 = [number, number, number];

export function S1Close() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { angle, clapper } = loneSwing("s1", (f - STRIKE) / fps);
  const light = ramp(f, 0, 30);
  // camera: macro on the lip, then out to a medium shot after the strike
  const k = ramp(f, STRIKE - 2, STRIKE + 70, 0, 1, settle);
  const lip: V3 = [36, -32, 0];
  const macroPos: V3 = [70, -40, 92];
  const widePos: V3 = [24, 0, 430 - ramp(f, STRIKE, DUR.s1, 0, 70, inOut)];
  const hh = handheld(f / fps, 0.6 + 0.6 * k);
  const pos: V3 = [macroPos[0] + (widePos[0] - macroPos[0]) * k + hh[0], macroPos[1] + (widePos[1] - macroPos[1]) * k + hh[1], macroPos[2] + (widePos[2] - macroPos[2]) * k + hh[2]];
  const look: V3 = [lip[0] * (1 - k), lip[1] * (1 - k) - 8 * k, 0];
  // rack focus from the lip to the body of the bell
  const rack = ramp(f, STRIKE + 6, STRIKE + 46, 0, 1, inOut);
  const focus: V3 = [lip[0] * (1 - rack), lip[1] * (1 - rack) - 4 * rack, 0];
  const fadeOut = 1 - ramp(f, DUR.s1 - 20, DUR.s1, 0, 1, inOut);
  return (
    <AbsoluteFill style={{ background: "#000", opacity: fadeOut }}>
      <LoneBell angle={angle} clapperLag={clapper} light={light} pos={pos} look={look} t={f / fps} focus={focus} range={40 + 60 * rack} bokeh={5 - 2 * rack} />
      <AbsoluteFill style={{ padding: "120px 140px", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Label text="16:00:00 ET" at={STRIKE + 14} size={22} color="#bdbdbd" />
          <Rule at={STRIKE + 20} width={220} />
        </div>
        <div style={{ textAlign: "center" }}>
          <Rise parts={[{ text: "The" }, { text: "closing bell.", italic: true }]} at={STRIKE + 50} size={70} outAt={DUR.s1 - 32} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
