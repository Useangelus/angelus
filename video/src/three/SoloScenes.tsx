import * as THREE from "three";
import { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { Bell, Dust, Rig, Studio, glowTexture, markShape } from "./parts";
import { Lens } from "./Lens";

const GL = { antialias: false, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace } as const;
type V3 = [number, number, number];

/** One bell alone in the dark, hanging from an iron rod, lit by a narrow shaft from above. */
export function LoneBell({ angle, clapperLag, light, pos, look, t, focus, range = 70, bokeh = 4 }: { angle: number; clapperLag: number; light: number; pos: V3; look: V3; t: number; focus?: V3; range?: number; bokeh?: number }) {
  const glow = useMemo(() => glowTexture(), []);
  return (
    <ThreeCanvas width={1920} height={1080} gl={GL} style={{ background: "#000" }}>
      <color attach="background" args={["#000000"]} />
      <Studio intensity={0.35 * light} />
      <Rig pos={pos} look={look} fov={30} />
      <spotLight position={[0, 420, 140]} angle={0.32} penumbra={0.85} intensity={9 * light} decay={0} distance={0} />
      <directionalLight position={[-260, 60, 300]} intensity={0.55 * light} />
      <directionalLight position={[300, 140, -260]} intensity={0.9 * light} color={0xcfcfcf} />
      <mesh position={[0, -10, -260]}>
        <planeGeometry args={[900, 900]} />
        <meshBasicMaterial map={glow} transparent opacity={0.18 * light} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* dust caught in the shaft of light */}
      <Dust t={t} count={70} opacity={0.4 * light} box={[260, 520, 300]} center={[0, 60, 40]} />
      <Bell position={[0, 30, 0]} angle={angle} clapperLag={clapperLag} hang />
      <Lens focus={focus ?? [0, -5, 0]} range={range} bokeh={bokeh} bloom={0.4} />
    </ThreeCanvas>
  );
}

/** The ANGELUS mark in silver: the arch, with the bell hanging free inside it. */
export function MarkScene({ yaw, swing, light, sweep, pos, look, focus, bokeh = 3 }: { yaw: number; swing: number; light: number; sweep: number; pos: V3; look: V3; focus: V3; bokeh?: number }) {
  const geo = useMemo(
    () => new THREE.ExtrudeGeometry(markShape(), { depth: 30, bevelEnabled: true, bevelThickness: 3, bevelSize: 2.6, bevelSegments: 6, curveSegments: 96 }).translate(0, 0, -15),
    [],
  );
  const mats = useMemo(
    () => ({
      silver: new THREE.MeshPhysicalMaterial({ color: 0xb9b9b9, metalness: 1, roughness: 0.24, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
      ball: new THREE.MeshPhysicalMaterial({ color: 0xc4c4c4, metalness: 1, roughness: 0.26, clearcoat: 0.4 }),
    }),
    [],
  );
  // A key light that travels across the face of the mark, catching the bevel as it passes.
  const sx = -520 + sweep * 1040;
  return (
    <ThreeCanvas width={1920} height={1080} gl={GL} style={{ background: "#000" }}>
      <color attach="background" args={["#000000"]} />
      <Studio intensity={0.34 * light} />
      <Rig pos={pos} look={look} fov={26} />
      <pointLight position={[sx, 160, 260]} intensity={38000 * light} decay={2} distance={0} />
      <directionalLight position={[0, 300, 400]} intensity={0.9 * light} />
      <directionalLight position={[200, 100, -300]} intensity={1.1 * light} color={0xdedede} />
      <group rotation={[0, yaw, 0]} position={[0, 6, 0]}>
        <mesh geometry={geo} material={mats.silver} />
        <group position={[0, 60, 0]} rotation={[0, 0, swing]}>
          <mesh position={[0, -82, 0]} material={mats.ball}>
            <sphereGeometry args={[24, 96, 64]} />
          </mesh>
        </group>
      </group>
      <Lens focus={focus} range={60} bokeh={bokeh} bloom={0.35} />
    </ThreeCanvas>
  );
}
