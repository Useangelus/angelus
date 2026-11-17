import { AbsoluteFill, Sequence } from "remotion";
import { S1Close } from "./scenes/S1Close";
import { S2Asleep } from "./scenes/S2Asleep";
import { S3Belfry } from "./scenes/S3Belfry";
import { S4Agents } from "./scenes/S4Agents";
import { S5Lock } from "./scenes/S5Lock";
import { S6Open } from "./scenes/S6Open";
import { S7Mark } from "./scenes/S7Mark";
import { Breath, Grain, Vignette } from "./fx/Film";
import { DUR, START, TEASER_CUTS, TEASER_FRAMES, TOTAL } from "./motion";

export { TEASER_FRAMES };

// ANGELUS, introduced: one night of Wall Street, from the closing bell to the opening bell.
// Scene lengths and starts live in motion.ts, shared with the sound engine.
const SCENES = [
  { C: S1Close, k: "s1" },
  { C: S2Asleep, k: "s2" },
  { C: S3Belfry, k: "s3" },
  { C: S4Agents, k: "s4" },
  { C: S5Lock, k: "s5" },
  { C: S6Open, k: "s6" },
  { C: S7Mark, k: "s7" },
] as const;

export const INTRO_FRAMES = TOTAL;

/** The whole film without the final grade, so the teaser can borrow any stretch of it. */
export const Film: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    {SCENES.map(({ C, k }) => (
      <Sequence key={k} from={START[k]} durationInFrames={DUR[k]} name={k}>
        <C />
      </Sequence>
    ))}
  </AbsoluteFill>
);

/** Grain and lens falloff over everything, the same in every cut. */
export const Grade: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Breath>{children}</Breath>
    <Vignette />
    <Grain />
  </AbsoluteFill>
);

export const Intro: React.FC = () => (
  <Grade>
    <Film />
  </Grade>
);

export const Teaser: React.FC = () => {
  let at = 0;
  return (
    <Grade>
      {TEASER_CUTS.map(([from, n], i) => {
        const s = at;
        at += n;
        return (
          <Sequence key={i} from={s} durationInFrames={n} name={`cut ${i + 1}`}>
            <Sequence from={-from}>
              <Film />
            </Sequence>
          </Sequence>
        );
      })}
    </Grade>
  );
};
