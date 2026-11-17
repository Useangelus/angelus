import * as THREE from "three";
import { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// Shared 3D parts, built from the same profiles as the website's Belfry and Mark3D.

export function bellGeometry(segments = 96): THREE.LatheGeometry {
  // A real bell section: crown, waist, sound bow, lip; outer face down, inner face back up.
  const outer: [number, number][] = [[0, 0], [10, 0], [17, -3], [20, -10], [21, -22], [22.5, -34], [25.5, -46], [31, -56], [36, -62], [37.5, -64.5]];
  const inner: [number, number][] = [[34, -64.5], [30, -60], [25, -52], [21.5, -42], [19.8, -30], [18.6, -18], [16, -8], [10, -4.5], [0, -4.5]];
  return new THREE.LatheGeometry([...outer, ...inner].map(([r, y]) => new THREE.Vector2(r, y)), segments);
}

export function archWindow(cx: number, bottom: number, w: number, h: number): THREE.Path {
  const r = w / 2;
  const p = new THREE.Path();
  p.moveTo(cx - r, bottom);
  p.lineTo(cx - r, bottom + h - r);
  p.absarc(cx, bottom + h - r, r, Math.PI, 0, true);
  p.lineTo(cx + r, bottom);
  p.lineTo(cx - r, bottom);
  return p;
}

/** The ANGELUS mark: the arch of a bell tower (master SVG, viewBox 256, centred). */
export function markShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-76, -92);
  s.lineTo(-76, 16);
  s.absarc(0, 16, 76, Math.PI, 0, true);
  s.lineTo(76, -92);
  s.lineTo(44, -92);
  s.lineTo(44, 16);
  s.absarc(0, 16, 44, 0, Math.PI, false);
  s.lineTo(-44, -92);
  s.lineTo(-76, -92);
  return s;
}

/** Studio reflections for the metal (the site uses the same RoomEnvironment). */
export function Studio({ intensity = 0.6 }: { intensity?: number }) {
  const { gl, scene } = useThree();
  const env = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const t = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return t;
  }, [gl]);
  useLayoutEffect(() => {
    scene.environment = env;
    scene.environmentIntensity = intensity;
  }, [scene, env, intensity]);
  return null;
}

export function Rig({ pos, look, fov = 34 }: { pos: [number, number, number]; look: [number, number, number]; fov?: number }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.set(...pos);
    camera.fov = fov;
    camera.near = 1;
    camera.far = 6000;
    camera.lookAt(...look);
    camera.updateProjectionMatrix();
  });
  return null;
}

// Seeded random, so every render of every frame is identical.
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A night sky in greys: deep at the top, a faint city glow at the horizon, a few hundred stars. */
export function skyTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 2048;
  c.height = 1200;
  const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0, "#030303");
  g.addColorStop(0.55, "#0d0d0d");
  g.addColorStop(0.85, "#1e1e1e");
  g.addColorStop(1, "#2a2a2a");
  x.fillStyle = g;
  x.fillRect(0, 0, c.width, c.height);
  const r = rng(11);
  for (let i = 0; i < 420; i++) {
    const sx = r() * c.width, sy = r() * c.height * 0.8;
    const s = r() < 0.06 ? 1.8 : 0.9;
    x.fillStyle = `rgba(255,255,255,${0.15 + r() * 0.55})`;
    x.beginPath();
    x.arc(sx, sy, s, 0, Math.PI * 2);
    x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Soft radial glow, for light falling through a window or onto a bell. */
export function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(256, 256, 0, 256, 256, 256);
  g.addColorStop(0, "rgba(255,255,255,0.55)");
  g.addColorStop(0.35, "rgba(255,255,255,0.16)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export interface BellProps {
  position: [number, number, number];
  angle: number; // swing, radians
  clapperLag: number; // clapper angle relative to the bell
  scale?: number;
  shine?: number; // 0..1 brightness of the metal
  /** Hang from a long iron rod out of the dark (a lone bell) instead of from a headstock on a beam. */
  hang?: boolean;
}

export function Bell({ position, angle, clapperLag, scale = 1, shine = 1, hang = false }: BellProps) {
  const geo = useMemo(() => bellGeometry(), []);
  const mats = useMemo(
    () => ({
      shell: (() => {
        const cast = castTexture();
        return new THREE.MeshPhysicalMaterial({ color: 0xd2d2d2, metalness: 1, roughness: 0.36, roughnessMap: cast, bumpMap: cast, bumpScale: 0.55, clearcoat: 0.2, clearcoatRoughness: 0.55 });
      })(),
      oak: new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.85 }),
      iron: new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.55, metalness: 0.8 }),
      clap: new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.5, metalness: 0.7 }),
    }),
    [],
  );
  mats.shell.color.setScalar(0.35 + 0.47 * shine);
  return (
    <group position={position} scale={scale} rotation={[0, 0, angle]}>
      {hang ? (
        <mesh position={[0, 300, 0]} material={mats.iron}>
          <cylinderGeometry args={[1.6, 1.6, 600, 10]} />
        </mesh>
      ) : (
        <mesh position={[0, 8, 0]} material={mats.oak}>
          <boxGeometry args={[46, 9, 12]} />
        </mesh>
      )}
      <mesh position={[0, 2, 0]} material={mats.iron}>
        <torusGeometry args={[6, 2.2, 12, 32]} />
      </mesh>
      <mesh geometry={geo} material={mats.shell} />
      <group position={[0, -4, 0]} rotation={[0, 0, clapperLag]}>
        <mesh position={[0, -23, 0]} material={mats.iron}>
          <cylinderGeometry args={[1.1, 1.1, 46, 8]} />
        </mesh>
        <mesh position={[0, -50, 0]} material={mats.clap}>
          <sphereGeometry args={[8.5, 32, 24]} />
        </mesh>
      </group>
    </group>
  );
}

/** Dressed stone for the tower wall: ashlar blocks of slightly different tone, darker mortar, fine grain. */
export function stoneTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const x = c.getContext("2d")!;
  const r = rng(29);
  x.fillStyle = "#5a5a5a";
  x.fillRect(0, 0, 1024, 1024);
  const bw = 256, bh = 128;
  for (let row = 0; row < 1024 / bh; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let col = -1; col < 1024 / bw + 1; col++) {
      const v = 78 + Math.floor(r() * 26);
      x.fillStyle = `rgb(${v},${v},${v})`;
      x.fillRect(col * bw + off + 3, row * bh + 3, bw - 6, bh - 6);
    }
  }
  const img = x.getImageData(0, 0, 1024, 1024);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 26;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / 520, 1 / 520); // extrude UVs are in world units: one 1024 px tile per 520 units
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Cast-metal surface: soft blotches from the mould and fine pitting, as a roughness and bump map. */
export function castTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const x = c.getContext("2d")!;
  const r = rng(53);
  x.fillStyle = "#7a7a7a";
  x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 140; i++) {
    const g = x.createRadialGradient(r() * 512, r() * 512, 0, r() * 512, r() * 512, 20 + r() * 70);
    const v = Math.floor(90 + r() * 70);
    g.addColorStop(0, `rgba(${v},${v},${v},0.35)`);
    g.addColorStop(1, `rgba(${v},${v},${v},0)`);
    x.fillStyle = g;
    x.fillRect(0, 0, 512, 512);
  }
  const img = x.getImageData(0, 0, 512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = r() < 0.02 ? -60 : (r() - 0.5) * 18;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 1);
  return t;
}

/** Camera held by a person: three slow incommensurate sines per axis, a few units at most. */
export function handheld(t: number, amp = 1): [number, number, number] {
  const s = (a: number, b: number, c: number) => Math.sin(t * a + b) * 0.6 + Math.sin(t * a * 2.37 + c) * 0.3 + Math.sin(t * a * 5.1 + b * 2) * 0.1;
  return [s(0.7, 0.3, 1.1) * 3.2 * amp, s(0.53, 2.1, 0.4) * 2.4 * amp, s(0.41, 1.3, 2.7) * 1.6 * amp];
}

/** Dust hanging in the air of the tower, drifting very slowly; brightest where light falls. */
export function Dust({ t, count = 420, opacity = 0.55, box = [1400, 900, 700], center = [0, 0, -100] }: { t: number; count?: number; opacity?: number; box?: [number, number, number]; center?: [number, number, number] }) {
  const { base, speed, sprite } = useMemo(() => {
    const r = rng(77);
    const base = new Float32Array(count * 3);
    const speed = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      base[i * 3] = (r() - 0.5) * box[0];
      base[i * 3 + 1] = (r() - 0.5) * box[1];
      base[i * 3 + 2] = (r() - 0.5) * box[2];
      speed[i * 3] = (r() - 0.5) * 6;
      speed[i * 3 + 1] = -1.5 - r() * 3;
      speed[i * 3 + 2] = (r() - 0.5) * 4;
    }
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d")!;
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return { base, speed, sprite: new THREE.CanvasTexture(c) };
  }, [count, box]);
  const pos = useMemo(() => new Float32Array(count * 3), [count]);
  for (let i = 0; i < count; i++) {
    for (let k = 0; k < 3; k++) {
      const half = box[k] / 2;
      let v = base[i * 3 + k] + speed[i * 3 + k] * t;
      v = ((((v + half) % box[k]) + box[k]) % box[k]) - half; // wrap inside the box
      pos[i * 3 + k] = v + center[k];
    }
  }
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} count={count} array={pos} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial map={sprite} size={1.8} sizeAttenuation transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}
