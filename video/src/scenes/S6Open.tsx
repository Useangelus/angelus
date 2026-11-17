import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { LoneBell } from "../three/SoloScenes";
import { mono, serif } from "../fonts";
import { Label, Rise } from "../fx/Type";
import { inOut, out, ramp } from "../ease";
import { RECORD } from "../data";
import { handheld } from "../three/parts";
import { CUE, DUR, loneSwing } from "../motion";
import { settle } from "../ease";

// 09:30 ET: the opening bell, then the record. Every miss, in public.
export const S6_FRAMES = DUR.s6;
export const OPEN_STRIKE = CUE.openStrike;
const CUT = CUE.recordCut;

const ROWS = [
  { name: "The Bell", v: RECORD.bell, strong: true },
  { name: "Raw chain price", v: RECORD.raw },
  { name: "No move (prior close)", v: RECORD.close },
];

export function S6Open() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { angle, clapper: clap } = loneSwing("s6", (f - OPEN_STRIKE) / fps);
  // the strike knocks the camera back from the lip of the bell to a low angle looking up
  const kb = ramp(f, OPEN_STRIKE, OPEN_STRIKE + 26, 0, 1, settle);
  const hh = handheld(f / fps, 1.2);
  const camPos: [number, number, number] = [-20 - 40 * kb + hh[0], -60 - 90 * kb + hh[1], 130 + 200 * kb - f * 0.4 + hh[2]];
  const lookAt: [number, number, number] = [30 * (1 - kb), -30 * (1 - kb) - 10 * kb, 0];
  const bellPart = 1 - ramp(f, CUT - 10, CUT + 4, 0, 1, inOut);
  const fadeIn = ramp(f, 0, 8);
  const fadeOut = 1 - ramp(f, DUR.s6 - 18, DUR.s6, 0, 1, inOut);
  const max = RECORD.close * 1.05;
  return (
    <AbsoluteFill style={{ background: "#000", opacity: fadeIn * fadeOut }}>
      {f < CUT + 6 && (
        <AbsoluteFill style={{ opacity: bellPart }}>
          {/* low angle, looking up at the bell as it swings hard */}
          <LoneBell angle={angle} clapperLag={clap} light={ramp(f, 0, 10)} pos={camPos} look={lookAt} t={f / fps} focus={[0, -10, 0]} range={90} bokeh={3.2} />
          <AbsoluteFill style={{ padding: "120px 140px", justifyContent: "space-between" }}>
            <Label text="09:30:00 ET" at={OPEN_STRIKE + 6} size={22} color="#d6d6d6" />
            <div style={{ textAlign: "right" }}>
              <Rise parts={[{ text: "The" }, { text: "opening bell.", italic: true }]} at={OPEN_STRIKE + 22} size={96} outAt={CUT - 16} />
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      {f >= CUT - 4 && (
        <AbsoluteFill style={{ padding: "150px 140px 0", opacity: ramp(f, CUT - 4, CUT + 8) }}>
          <Label text={`Average miss against the official open · ${RECORD.sessions} mornings`} at={CUT} size={19} speed={2} />
          <div style={{ marginTop: 30 }}>
            <Rise parts={[{ text: "Every estimate is graded" }]} at={CUT + 4} size={84} stagger={3} />
          </div>
          <div>
            <Rise parts={[{ text: "against the open." }, { text: "In public.", italic: true }]} at={CUT + 14} size={84} stagger={3} />
          </div>
          <div style={{ marginTop: 70, display: "flex", flexDirection: "column", gap: 30, width: 1640 }}>
            {ROWS.map((r, i) => {
              const p = ramp(f, CUT + 40 + i * 8, CUT + 86 + i * 8, 0, 1, out);
              const val = interpolate(p, [0, 1], [0, r.v]);
              return (
                <div key={r.name} style={{ display: "grid", gridTemplateColumns: "340px 1fr 170px", alignItems: "center", gap: 28, opacity: ramp(f, CUT + 36 + i * 8, CUT + 50 + i * 8) }}>
                  <span style={{ fontFamily: serif, fontSize: 32, color: r.strong ? "#ffffff" : "#9a9a9a", fontStyle: r.strong ? "italic" : "normal" }}>{r.name}</span>
                  <div style={{ height: r.strong ? 10 : 6, background: "rgba(255,255,255,0.08)" }}>
                    <div style={{ height: "100%", width: `${(val / max) * 100}%`, background: r.strong ? "#ffffff" : "rgba(255,255,255,0.45)" }} />
                  </div>
                  <span style={{ fontFamily: mono, fontSize: 30, textAlign: "right", color: r.strong ? "#fff" : "#9a9a9a" }}>
                    {val.toFixed(1)}
                    <span style={{ fontSize: 18, marginLeft: 8, color: "#7a7a7a" }}>bp</span>
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 34 }}>
            <Label text="Lower is better. Every number on the record, every morning." at={CUT + 100} size={17} color="#8a8a8a" speed={2.2} />
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}
