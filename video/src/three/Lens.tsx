import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { continueRender, delayRender, getInputProps, useCurrentFrame } from "remotion";
import { EffectComposer, Bloom, DepthOfField, ToneMapping } from "@react-three/postprocessing";
import { KernelSize, ToneMappingMode } from "postprocessing";

/**
 * Remotion advances the scene once per frame, sometimes before the effect composer has finished mounting,
 * which leaves a black frame. This renders again after mount and holds the capture until it has.
 */
function Settle() {
  const frame = useCurrentFrame();
  const advance = useThree((s) => s.advance);
  useEffect(() => {
    const h = delayRender("post-processing pass");
    let n = 0;
    const tick = () => {
      advance(performance.now());
      if (++n < 2) requestAnimationFrame(tick);
      else continueRender(h);
    };
    requestAnimationFrame(tick);
  }, [frame, advance]);
  return null;
}

/** The lens: shallow depth of field focused on a world point (animate it for a rack focus), and a soft bloom on bright metal. */
export function Lens({ focus, range = 120, bokeh = 3, bloom = 0.35 }: { focus: [number, number, number]; range?: number; bokeh?: number; bloom?: number }) {
  const fx = String((getInputProps() as { fx?: string }).fx ?? "all");
  return (
    <>
      <EffectComposer multisampling={0}>
        {fx === "all" || fx === "dof" ? <DepthOfField target={focus} worldFocusRange={range} bokehScale={bokeh} /> : <></>}
        {fx === "all" || fx === "bloom" ? <Bloom intensity={bloom} luminanceThreshold={0.9} luminanceSmoothing={0.12} mipmapBlur kernelSize={KernelSize.LARGE} /> : <></>}
        {/* the composer replaces the renderer's tone mapping, so it is applied here, last */}
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
      <Settle />
    </>
  );
}
