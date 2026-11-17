import * as THREE from "three";
import { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { NIGHT, SX, SY, bellPosition, swingOf } from "../motion";
import { Bell, Dust, Rig, Studio, archWindow, glowTexture, skyTexture, stoneTexture } from "./parts";
import { Lens } from "./Lens";

export { bellPosition, swingOf };

/** A soft shaft of moonlight: brightest at the window, fading as it reaches into the room. */
function shaftTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 512;
  const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, "rgba(255,255,255,0.0)");
  g.addColorStop(0.08, "rgba(255,255,255,0.55)");
  g.addColorStop(0.5, "rgba(255,255,255,0.2)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 512);
  const h = x.createLinearGradient(0, 0, 64, 0);
  h.addColorStop(0, "rgba(0,0,0,1)");
  h.addColorStop(0.25, "rgba(0,0,0,0)");
  h.addColorStop(0.75, "rgba(0,0,0,0)");
  h.addColorStop(1, "rgba(0,0,0,1)");
  x.globalCompositeOperation = "destination-out";
  x.fillStyle = h;
  x.fillRect(0, 0, 64, 512);
  return new THREE.CanvasTexture(c);
}

function Tower({ light }: { light: number }) {
  const { wall, sky, glow, stone, shaft } = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-2400, -1400);
    shape.lineTo(2400, -1400);
    shape.lineTo(2400, 1600);
    shape.lineTo(-2400, 1600);
    shape.lineTo(-2400, -1400);
    for (const cx of [-520, 0, 520]) shape.holes.push(archWindow(cx, -260, 300, 640));
    return {
      wall: new THREE.ExtrudeGeometry(shape, { depth: 60, bevelEnabled: false, curveSegments: 64 }),
      sky: skyTexture(),
      glow: glowTexture(),
      stone: stoneTexture(),
      shaft: shaftTexture(),
    };
  }, []);
  return (
    <group>
      <mesh position={[0, 200, -700]}>
        <planeGeometry args={[4400, 2600]} />
        <meshBasicMaterial map={sky} color={new THREE.Color().setScalar(0.55 + 0.45 * light)} />
      </mesh>
      {[-520, 0, 520].map((cx) => (
        <group key={cx}>
          <mesh position={[cx, 120, -690]}>
            <planeGeometry args={[1100, 1100]} />
            <meshBasicMaterial map={glow} transparent opacity={0.42 * light} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          {/* moonlight falling through the window, down and toward the camera */}
          <mesh position={[cx + 40, -40, -120]} rotation={[-1.05, 0, 0.08]}>
            <planeGeometry args={[300, 900]} />
            <meshBasicMaterial map={shaft} transparent opacity={0.11 * light} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      <mesh geometry={wall} position={[0, 0, -420]}>
        <meshStandardMaterial map={stone} color={0x4a4a4a} roughness={0.96} />
      </mesh>
    </group>
  );
}

export interface BelfryShot {
  t: number; // seconds of swinging
  swing: number; // 0 = still, 1 = full
  light: number; // 0..1 scene brightness
  pos: [number, number, number];
  look: [number, number, number];
  fov?: number;
  only?: number; // light just one bell (index), others in shadow
  focus?: [number, number, number]; // world point in focus
  focusRange?: number;
  bokeh?: number;
}

export function BelfryScene({ shot }: { shot: BelfryShot }) {
  const { t, swing, light, pos, look, fov, only, focus, focusRange, bokeh } = shot;
  return (
    <ThreeCanvas width={1920} height={1080} gl={{ antialias: false, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace }} style={{ background: "#000" }}>
      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 900, 2400]} />
      <Studio intensity={0.55 * light} />
      <Rig pos={pos} look={look} fov={fov} />
      <hemisphereLight args={[0x9a9a9a, 0x101010, 0.55 * light]} />
      <directionalLight position={[-300, 220, 520]} intensity={2.3 * light} />
      <directionalLight position={[240, 320, -600]} intensity={1.3 * light} color={0xbdbdbd} />
      <Tower light={light} />
      <Dust t={t} count={160} opacity={0.32 * light} />
      <group>
        {NIGHT.map((_, i) => {
          const p = bellPosition(i);
          const { angle, clapperLag } = swingOf(i, t, swing);
          const lit = only == null || only === i;
          return <Bell key={i} position={p} angle={angle} clapperLag={clapperLag} shine={lit ? 1 : 0.18} />;
        })}
        {[0, 1].map((r) => (
          <mesh key={r} position={[0, SY / 2 - r * SY + 19, 0]}>
            <boxGeometry args={[7 * SX + SX * 1.4, 14, 22]} />
            <meshStandardMaterial color={0x1c1c1c} roughness={0.85} />
          </mesh>
        ))}
      </group>
      <Lens focus={focus ?? [look[0], look[1], 0]} range={focusRange ?? 260} bokeh={bokeh ?? 2.5} />
    </ThreeCanvas>
  );
}
