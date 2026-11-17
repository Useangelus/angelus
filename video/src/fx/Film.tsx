import { AbsoluteFill, useCurrentFrame } from "remotion";

/** Fine monochrome film grain: a new seed every frame, so it lives instead of sitting on top like a texture. */
export function Grain({ amount = 0.085 }: { amount?: number }) {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "overlay", opacity: amount }}>
      <svg width="1920" height="1080" viewBox="0 0 1920 1080">
        <filter id={`g${f}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.92" numOctaves="2" seed={f % 97} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="1920" height="1080" filter={`url(#g${f})`} />
      </svg>
    </AbsoluteFill>
  );
}

/** Lens falloff toward the corners. */
export function Vignette({ strength = 0.55 }: { strength?: number }) {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        background: `radial-gradient(ellipse 75% 70% at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,${strength}) 100%)`,
      }}
    />
  );
}

/** A slow, barely visible exposure breath, like a real sensor in low light. */
export function Breath({ children }: { children: React.ReactNode }) {
  const f = useCurrentFrame();
  const b = 1 + Math.sin(f / 37) * 0.012 + Math.sin(f / 11.3) * 0.006;
  return <AbsoluteFill style={{ filter: `brightness(${b})` }}>{children}</AbsoluteFill>;
}
