import { Composition } from "remotion";
import { Intro, INTRO_FRAMES, Teaser, TEASER_FRAMES } from "./Intro";
import { FPS } from "./motion";

export const Root: React.FC = () => (
  <>
    <Composition id="Intro" component={Intro} durationInFrames={INTRO_FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition id="Teaser" component={Teaser} durationInFrames={TEASER_FRAMES} fps={FPS} width={1920} height={1080} />
  </>
);
