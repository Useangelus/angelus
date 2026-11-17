"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// The ANGELUS mark in 3D (silver or black lacquer, by theme): the arch of a bell tower, extruded, with the bell
// (the dot) hanging free inside it. The bell swings when it rings.

function archShape(): THREE.Shape {
  // Built from the master SVG (viewBox 256), centred on x=128, y=128, y up.
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

export default function Mark3D({
  size = 480,
  interactive = true,
  className,
  ringKey = 0,
  label = "ANGELUS mark",
  front = false,
}: {
  size?: number;
  interactive?: boolean;
  className?: string;
  ringKey?: number;
  label?: string;
  /** Face the viewer square on and hold still: no turn, no idle drift, the bell hanging straight. */
  front?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const ringRef = useRef<() => void>(() => {});

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = size < 80;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: small ? "low-power" : "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 3 : 2));
    renderer.setSize(size, size);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;

    const camera = new THREE.PerspectiveCamera(28, 1, 10, 2000);
    camera.position.set(0, 0, small ? 520 : 560);

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-180, 260, 320);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 1.1);
    rim.position.set(260, -60, -200);
    scene.add(rim);

    // Black and white: polished silver on dark pages, black lacquer on light pages.
    // (Names kept from the bronze version: `bronze` is the arch, `patina` the bell.)
    const bronze = new THREE.MeshPhysicalMaterial({ color: 0xd4d4d4, metalness: 1, roughness: 0.3, clearcoat: 0.3, clearcoatRoughness: 0.4, envMapIntensity: 0.8 });
    const patina = new THREE.MeshPhysicalMaterial({ color: 0xb8b8b8, metalness: 1, roughness: 0.38, envMapIntensity: 0.8 });
    const applyTheme = () => {
      const light = document.documentElement.dataset.theme !== "dark";
      bronze.color.setHex(light ? 0x141414 : 0xd4d4d4);
      bronze.metalness = light ? 0.55 : 1;
      patina.color.setHex(light ? 0x0a0a0a : 0xb8b8b8);
      patina.metalness = light ? 0.55 : 1;
      start();
    };
    const themeWatch = new MutationObserver(applyTheme);
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const depth = 38;
    const geo = new THREE.ExtrudeGeometry(archShape(), {
      depth, curveSegments: small ? 48 : 96, bevelEnabled: true, bevelThickness: 5, bevelSize: 3.5, bevelSegments: small ? 3 : 8,
    });
    geo.translate(0, 0, -depth / 2);
    const arch = new THREE.Mesh(geo, bronze);

    const root = new THREE.Group();
    root.add(arch);

    // The bell hangs from the crown of the inner arch (y=60) to its centre (y=-22).
    const pivot = new THREE.Group();
    pivot.position.set(0, 60, 0);
    const bell = new THREE.Mesh(new THREE.SphereGeometry(24, 64, 48), patina);
    bell.position.set(0, -82, 0);
    pivot.add(bell);
    root.add(pivot);
    root.position.y = 6;
    scene.add(root);

    let ringStart = -1e9;
    const ring = () => { ringStart = performance.now(); start(); };
    ringRef.current = ring;

    let px = 0, py = 0, tx = 0, ty = 0;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = ((e.clientX - (r.left + r.width / 2)) / window.innerWidth) * 1.2;
      ty = ((e.clientY - (r.top + r.height / 2)) / window.innerHeight) * 0.6;
      start();
    };
    if (interactive && !reduce) window.addEventListener("pointermove", onMove, { passive: true });

    let raf = 0, running = false, visible = true;
    const t0 = performance.now();
    const frame = (now: number) => {
      const t = (now - t0) / 1000;
      px += (tx - px) * 0.05;
      py += (ty - py) * 0.05;
      const idle = reduce || front ? 0 : Math.sin(t * 0.35) * 0.28;
      root.rotation.y = front ? 0 : -0.32 + idle + px;
      root.rotation.x = front ? 0 : 0.06 + py * 0.4;
      const since = (now - ringStart) / 1000;
      const swing = !front && since < 9 ? 0.42 * Math.exp(-since / 2.4) * Math.sin(since * 4.1) : 0;
      pivot.rotation.z = swing + (reduce || front ? 0 : Math.sin(t * 1.3) * 0.015);
      renderer.render(scene, camera);
      const settled = since >= 9 && Math.abs(tx - px) < 0.001 && Math.abs(ty - py) < 0.001;
      if (visible && (!small || !settled) && !(reduce && settled)) raf = requestAnimationFrame(frame);
      else running = false;
    };
    function start() {
      if (running || !visible) return;
      running = true;
      raf = requestAnimationFrame(frame);
    }

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
    });
    io.observe(el);

    if (!small) ringStart = performance.now() + 500;
    applyTheme();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      themeWatch.disconnect();
      window.removeEventListener("pointermove", onMove);
      geo.dispose();
      bell.geometry.dispose();
      bronze.dispose();
      patina.dispose();
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [size, interactive, front]);

  useEffect(() => {
    if (ringKey) ringRef.current();
  }, [ringKey]);

  return (
    <div
      ref={host}
      className={className}
      role="img"
      aria-label={label}
      onPointerEnter={() => ringRef.current()}
      onClick={() => ringRef.current()}
      style={{ width: size, height: size, maxWidth: "100%", aspectRatio: "1 / 1", cursor: "pointer" }}
    />
  );
}
