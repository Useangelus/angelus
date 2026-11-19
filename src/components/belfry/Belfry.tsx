"use client";

import { useEffect, useRef, useState } from "react";
import BellGlyph from "../BellGlyph";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { clock } from "@/lib/clock";
import { skyAt, nyMinutes, paintSky, mono } from "./sky";
import styles from "./belfry.module.css";
import { ring as ringSound } from "@/lib/sound";

/** A clicked bell sounds as hard as its stock moved overnight (only when the visitor has turned sound on). */
const strike = (i: number, gap: number | null) => void ringSound(i, 0.35 + Math.min(0.65, Math.abs(gap ?? 0) * 60));

// The belfry: one cast bell per stock (silver or black, by theme), hung in rows from beams inside a tower
// whose windows are the ANGELUS arch. A bell swings as far as its stock has moved from
// the last close; it leans the way the stock moved. At the 04:00 ET lock the bells stop.

export interface BellDatum { ticker: string; gap: number | null }

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const SPACING_X = 108;
const SPACING_Y = 150;

function bellGeometry(segments = 72): THREE.LatheGeometry {
  // A real bell section: crown, waist, sound bow, lip; outer face down, inner face back up.
  const outer: [number, number][] = [[0, 0], [10, 0], [17, -3], [20, -10], [21, -22], [22.5, -34], [25.5, -46], [31, -56], [36, -62], [37.5, -64.5]];
  const inner: [number, number][] = [[34, -64.5], [30, -60], [25, -52], [21.5, -42], [19.8, -30], [18.6, -18], [16, -8], [10, -4.5], [0, -4.5]];
  const pts = [...outer, ...inner].map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pts, segments);
}

function archWindow(cx: number, bottom: number, w: number, h: number): THREE.Path {
  const r = w / 2;
  const p = new THREE.Path();
  p.moveTo(cx - r, bottom);
  p.lineTo(cx - r, bottom + h - r);
  p.absarc(cx, bottom + h - r, r, Math.PI, 0, true);
  p.lineTo(cx + r, bottom);
  p.lineTo(cx - r, bottom);
  return p;
}

export default function Belfry({
  bells,
  selected,
  onSelect,
  focusY = 0.5,
  fill = 0.9,
  showLabels = true,
  driver,
}: {
  /** Replay: when set, the bells, the sky and the lock follow this instead of the wall clock (read every frame). */
  driver?: React.MutableRefObject<{ gaps: (number | null)[]; at: number; swinging: boolean } | null>;
  /** Share of the frame height the bells may take. */
  fill?: number;
  showLabels?: boolean;
  bells: BellDatum[];
  selected: string | null;
  onSelect: (ticker: string) => void;
  /** Where the bells sit vertically in the frame (0 top … 1 bottom). */
  focusY?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef<(HTMLButtonElement | null)[]>([]);
  const selRef = useRef(selected);
  const pickRef = useRef(onSelect);
  const ringRef = useRef<(i: number) => void>(() => {});
  useEffect(() => {
    selRef.current = selected;
    pickRef.current = onSelect;
  }, [selected, onSelect]);

  const [gl] = useState(hasWebGL);

  useEffect(() => {
    const el = host.current;
    if (!el || !gl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    // Light mode for modest devices: coarser bells and ~30 fps. Sharpness is never given up: most phones report
    // 4 GB or 4 cores, and drawing them at 1x without anti-aliasing on a 3x screen made the bells look jagged.
    const nav = navigator as Navigator & { deviceMemory?: number };
    const weak = (nav.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: weak ? "low-power" : "high-performance" });
    } catch {
      return;
    }
    // at least 2x on phones (the canvas is small, so this stays cheap), at most 2x anywhere
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, weak && !coarse ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.prepend(renderer.domElement);
    renderer.domElement.className = styles.canvas;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.55;

    const camera = new THREE.PerspectiveCamera(34, 1, 10, 4000);

    // ---- sky behind the windows
    const skyCanvas = document.createElement("canvas");
    skyCanvas.width = 2048; skyCanvas.height = 1228;
    const skyCtx = skyCanvas.getContext("2d")!;
    const skyTex = new THREE.CanvasTexture(skyCanvas);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    const skyMesh = new THREE.Mesh(new THREE.PlaneGeometry(4000, 2400), new THREE.MeshBasicMaterial({ map: skyTex }));
    skyMesh.position.set(0, 200, -700);
    scene.add(skyMesh);

    // ---- the tower wall, pierced by arched windows (the ANGELUS arch)
    const wallShape = new THREE.Shape();
    wallShape.moveTo(-2000, -1200); wallShape.lineTo(2000, -1200); wallShape.lineTo(2000, 1400); wallShape.lineTo(-2000, 1400); wallShape.lineTo(-2000, -1200);
    for (const cx of [-520, 0, 520]) wallShape.holes.push(archWindow(cx, -260, 300, 640));
    const wallGeo = new THREE.ExtrudeGeometry(wallShape, { depth: 60, bevelEnabled: false, curveSegments: 48 });
    const stone = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.95, metalness: 0 });
    const wall = new THREE.Mesh(wallGeo, stone);
    wall.position.z = -420;
    scene.add(wall);

    // ---- lights
    const hemi = new THREE.HemisphereLight(0x9a9a9a, 0x141414, 0.6);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-300, 200, 500);
    scene.add(key);
    const back = new THREE.DirectionalLight(0xbdbdbd, 1.2);
    back.position.set(200, 300, -600);
    scene.add(back);

    // ---- bells
    const bellGeo = bellGeometry(weak ? 40 : 72);
    const crownGeo = new THREE.TorusGeometry(6, 2.2, 12, 32);
    const yokeGeo = new THREE.BoxGeometry(46, 9, 12);
    const rodGeo = new THREE.CylinderGeometry(1.1, 1.1, 46, 8);
    const clapGeo = new THREE.SphereGeometry(8.5, 32, 24);
    const oak = new THREE.MeshStandardMaterial({ color: 0x2a1e14, roughness: 0.85 });
    const iron = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.6, metalness: 0.8 });
    const patina = new THREE.MeshPhysicalMaterial({ color: 0x4f8d78, metalness: 0.35, roughness: 0.6 });

    interface Bell { pivot: THREE.Group; clapper: THREE.Group; shell: THREE.Mesh; mat: THREE.MeshPhysicalMaterial; amp: number; bias: number; w: number; phase: number; ring: number }
    const items: Bell[] = [];
    const rig = new THREE.Group();
    scene.add(rig);
    const beams: THREE.Mesh[] = [];

    bells.forEach((b, i) => {
      const mat = new THREE.MeshPhysicalMaterial({ color: 0xcfcfcf, metalness: 1, roughness: 0.36, clearcoat: 0.2, clearcoatRoughness: 0.6, emissive: 0x000000 });
      const pivot = new THREE.Group();
      const yoke = new THREE.Mesh(yokeGeo, oak); yoke.position.y = 8; pivot.add(yoke);
      const crown = new THREE.Mesh(crownGeo, iron); crown.position.y = 2; pivot.add(crown);
      const shell = new THREE.Mesh(bellGeo, mat); shell.userData.index = i; pivot.add(shell);
      const clapper = new THREE.Group(); clapper.position.y = -4;
      const rod = new THREE.Mesh(rodGeo, iron); rod.position.y = -23; clapper.add(rod);
      const ball = new THREE.Mesh(clapGeo, patina); ball.position.y = -50; clapper.add(ball);
      pivot.add(clapper);
      rig.add(pivot);
      const g = b.gap ?? 0;
      items.push({
        pivot, clapper, shell, mat,
        amp: b.gap == null ? 0 : Math.min(0.5, Math.max(0.035, Math.abs(g) * 16)),
        bias: Math.sign(g) * Math.min(0.22, Math.abs(g) * 7),
        w: (Math.PI * 2) / (2.1 + (i % 5) * 0.13),
        phase: i * 1.7,
        ring: -1e9,
      });
    });

    ringRef.current = (i: number) => { if (items[i]) items[i].ring = performance.now(); };

    // ---- layout: 8 × 2 on wide screens, 4 × 4 on tall ones
    let cols = 8, W = 1, Hh = 1;
    function layout() {
      W = el!.clientWidth; Hh = el!.clientHeight;
      renderer.setSize(W, Hh, false);
      camera.aspect = W / Hh;
      cols = Math.min(W / Hh >= 1.15 ? 8 : 4, items.length);
      const rows = Math.ceil(items.length / cols);
      beams.forEach((m) => { rig.remove(m); m.geometry.dispose(); });
      beams.length = 0;
      const rowY = cols <= 4 ? 182 : SPACING_Y; // taller rows on phones so labels clear the next beam
      const gridW = (cols - 1) * SPACING_X, gridH = (rows - 1) * rowY;
      items.forEach((it, i) => {
        const r = Math.floor(i / cols), c = i % cols;
        it.pivot.position.set(c * SPACING_X - gridW / 2, gridH / 2 - r * rowY, 0);
      });
      for (let r = 0; r < rows; r++) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(gridW + SPACING_X * 1.4, 14, 22), oak);
        beam.position.set(0, gridH / 2 - r * rowY + 19, 0);
        rig.add(beam);
        beams.push(beam);
      }
      // Fit the grid (bells hang ~75 below their beam) into the frame with a margin.
      const vfov = THREE.MathUtils.degToRad(camera.fov);
      const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
      const needW = gridW + SPACING_X * 1.1, needH = gridH + 150;
      const dist = Math.max((needW / 2) / (Math.tan(hfov / 2) * Math.min(1, fill + 0.3)), (needH / 2) / (Math.tan(vfov / 2) * fill)) * 1.08;
      const visH = 2 * dist * Math.tan(vfov / 2);
      const centreY = -30; // middle of the bells, between beams and mouths
      const shift = (focusY - 0.5) * visH; // move the grid up when focusY < 0.5
      camera.position.set(0, centreY + shift - 60, dist);
      camera.lookAt(0, centreY + shift, 0);
      camera.updateProjectionMatrix();
      baseCam.copy(camera.position);
      baseLook.set(0, centreY + shift, 0);
    }
    const baseCam = new THREE.Vector3();
    const baseLook = new THREE.Vector3();

    // ---- sky refresh (once a minute is plenty)
    // Black and white only. Dark pages: silver bells, black clappers, dark stone.
    // Light pages: black iron bells, white clappers, pale stone, pale sky.
    let light = document.documentElement.dataset.theme !== "dark";
    function applyTheme() {
      light = document.documentElement.dataset.theme !== "dark";
      const bell = light ? 0x161616 : 0xcfcfcf;
      items.forEach((it) => { it.mat.color.setHex(bell); it.mat.metalness = light ? 0.75 : 1; it.mat.roughness = light ? 0.3 : 0.36; });
      patina.color.setHex(light ? 0xf2f2f2 : 0x111111);
      oak.color.setHex(light ? 0x2a2a2a : 0x1a1a1a);
      iron.color.setHex(light ? 0x3a3a3a : 0x2b2b2b);
      renderer.setClearColor(light ? 0xf2f2f2 : 0x000000);
      skyMinute = -1;
    }
    const themeWatch = new MutationObserver(applyTheme);
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    let skyMinute = -1;
    function refreshSky(now: number) {
      const m = nyMinutes(now);
      // a replay races through the night: repaint the sky every ten minutes of it, not every frame
      const step = driver?.current ? 10 : 1;
      const dm = Math.abs(m - skyMinute);
      if (skyMinute >= 0 && Math.min(dm, 1440 - dm) < step) return;
      skyMinute = m;
      const s = skyAt(m);
      paintSky(skyCtx, 2048, 1228, s, 7, light);
      skyTex.needsUpdate = true;
      key.intensity = 1.5 + (1 - s.dark) * 1.4;
      key.color.set(0xffffff);
      back.color.set(mono(s.bottom, light));
      back.intensity = 0.6 + (1 - s.dark) * 1.4;
      hemi.color.set(mono(s.top, light));
      hemi.intensity = light ? 1.1 : 0.35 + (1 - s.dark) * 0.9;
      stone.color.setHex(light ? 0xd6d6d6 : s.dark > 0.5 ? 0x141414 : 0x262626);
    }

    // ---- interaction
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let hover = -1;
    let px = 0, py = 0, tx = 0, ty = 0;
    function pick(e: PointerEvent): number {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(items.map((it) => it.shell), false)[0];
      return hit ? (hit.object.userData.index as number) : -1;
    }
    const onMove = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      const i = pick(e);
      if (i !== hover) {
        hover = i;
        renderer.domElement.style.cursor = i >= 0 ? "pointer" : "";
        if (i >= 0) ringRef.current(i);
      }
    };
    const onClick = (e: PointerEvent) => {
      const i = pick(e);
      if (i >= 0) { ringRef.current(i); strike(i, bells[i].gap); pickRef.current(bells[i].ticker); }
    };
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("click", onClick as (e: Event) => void);

    // ---- frame
    const tmp = new THREE.Vector3();
    let raf = 0, visible = true;
    const t0 = performance.now();
    let lastDraw = 0;
    function frame(now: number) {
      if (weak && now - lastDraw < 32) { if (visible) raf = requestAnimationFrame(frame); return; }
      lastDraw = now;
      const t = (now - t0) / 1000;
      const d = driver?.current ?? null;
      const wall = d ? d.at : Date.now();
      refreshSky(wall);
      const c = clock(wall);
      const swinging = d ? d.swinging && !reduce : c.phase === "night" && !c.locked && !reduce;
      // Scroll: as the tower slides out of view the camera draws back and down, and the
      // room dims, so the bells recede instead of simply scrolling away. Mouse adds a little parallax.
      if (!reduce) {
        const r = el!.getBoundingClientRect();
        const sp = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
        if (!coarse) { px += (tx - px) * 0.04; py += (ty - py) * 0.04; }
        camera.position.set(baseCam.x + px * 26, baseCam.y - py * 14 - sp * 90, baseCam.z + sp * 180);
        camera.lookAt(baseLook.x, baseLook.y - sp * 40, baseLook.z);
        renderer.toneMappingExposure = 1 - sp * 0.45;
      }
      const sel = selRef.current;
      items.forEach((it, i) => {
        if (d) {
          // follow the replayed move smoothly
          const g = d.gaps[i] ?? 0;
          const amp = d.gaps[i] == null ? 0 : Math.min(0.5, Math.max(0.035, Math.abs(g) * 16));
          const bias = Math.sign(g) * Math.min(0.22, Math.abs(g) * 7);
          it.amp += (amp - it.amp) * 0.08;
          it.bias += (bias - it.bias) * 0.08;
        }
        const since = (now - it.ring) / 1000;
        const ring = since < 6 ? 0.28 * Math.exp(-since / 1.5) * Math.sin(since * 5.2) : 0;
        const swing = swinging ? it.amp * Math.sin(it.w * t + it.phase) : 0;
        const a = it.bias + swing + ring;
        it.pivot.rotation.z = a;
        it.clapper.rotation.z = -a * 0.55 + (swinging ? Math.sin(it.w * t + it.phase - 0.9) * it.amp * 0.4 : 0);
        const isSel = bells[i].ticker === sel;
        const glow = isSel ? (light ? 0.08 : 0.14) : 0;
        it.mat.emissive.setRGB(glow, glow, glow);
        // Label under the bell's mouth.
        const lab = labels.current[i];
        if (lab) {
          tmp.set(it.pivot.position.x, it.pivot.position.y - 84, 0).project(camera);
          lab.style.transform = `translate(${((tmp.x + 1) / 2) * W}px, ${((1 - tmp.y) / 2) * Hh}px) translate(-50%, 0)`;
        }
      });
      renderer.render(scene, camera);
      if (visible) raf = requestAnimationFrame(frame);
    }

    layout();
    applyTheme();
    const ro = new ResizeObserver(() => layout());
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting;
      if (visible && !was) raf = requestAnimationFrame(frame);
    });
    io.observe(el);
    raf = requestAnimationFrame(frame);
    // Let the room ring once when it comes into view.
    if (!reduce) items.forEach((_, i) => setTimeout(() => ringRef.current(i), 300 + i * 70));

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect(); themeWatch.disconnect();
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("click", onClick as (e: Event) => void);
      [bellGeo, crownGeo, yokeGeo, rodGeo, clapGeo, wallGeo, skyMesh.geometry].forEach((g) => g.dispose());
      beams.forEach((m) => m.geometry.dispose());
      items.forEach((it) => it.mat.dispose());
      [oak, iron, patina, stone, skyMesh.material as THREE.Material].forEach((m) => m.dispose());
      skyTex.dispose(); env.dispose(); pmrem.dispose(); renderer.dispose();
      renderer.domElement.remove();
    };
  }, [bells, focusY, fill, gl, driver]);

  if (!gl) {
    // No WebGL: the same bells as flat marks, still pickable.
    return (
      <div className={`${styles.stage} ${styles.flat}`}>
        {bells.map((b, i) => (
          <button key={b.ticker} className={`${styles.flatBell} ${b.ticker === selected ? styles.on : ""}`} onClick={() => { strike(i, b.gap); onSelect(b.ticker); }} aria-pressed={b.ticker === selected}>
            <BellGlyph gap={b.gap} size={44} />
            <span className={styles.tk}>{b.ticker}</span>
            <span className={`${styles.g} ${b.gap == null ? "" : b.gap > 0.00005 ? "up" : b.gap < -0.00005 ? "down" : ""}`}>
              {b.gap == null ? "—" : `${b.gap > 0 ? "+" : ""}${(b.gap * 100).toFixed(2)}%`}
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={host} className={styles.stage}>
      <div className={styles.labels} hidden={!showLabels}>
        {bells.map((b, i) => (
          <button
            key={b.ticker}
            ref={(n) => { labels.current[i] = n; }}
            className={`${styles.tag} ${b.ticker === selected ? styles.on : ""}`}
            onClick={() => { ringRef.current(i); strike(i, b.gap); onSelect(b.ticker); }}
            onPointerEnter={() => ringRef.current(i)}
            aria-pressed={b.ticker === selected}
          >
            <span className={styles.tk}>{b.ticker}</span>
            <span className={`${styles.g} ${b.gap == null ? "" : b.gap > 0.00005 ? "up" : b.gap < -0.00005 ? "down" : ""}`}>
              {b.gap == null ? "—" : `${b.gap > 0 ? "+" : ""}${(b.gap * 100).toFixed(2)}%`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
