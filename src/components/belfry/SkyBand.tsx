"use client";

import { useEffect, useRef } from "react";
import { skyAt, nyMinutes, paintSky } from "./sky";
import s from "./skyband.module.css";

// The belfry seen from the inside, flattened for the inner pages: the same New York sky
// through a row of ANGELUS arches cut in the tower wall. 2D only, no WebGL.

const ARCH_W = 110, ARCH_H = 210, GAP = 70, BASE = 250, VIEW_W = 1600, VIEW_H = 320;

function wallPath(): string {
  // Outer rectangle plus one arched opening per bay (even-odd fill cuts them out).
  let d = `M0 0H${VIEW_W}V${VIEW_H}H0Z`;
  const n = Math.floor((VIEW_W + GAP) / (ARCH_W + GAP));
  const total = n * ARCH_W + (n - 1) * GAP;
  const x0 = (VIEW_W - total) / 2;
  const r = ARCH_W / 2;
  for (let i = 0; i < n; i++) {
    const x = x0 + i * (ARCH_W + GAP);
    const top = BASE - ARCH_H + r;
    d += `M${x} ${BASE}V${top}A${r} ${r} 0 0 1 ${x + ARCH_W} ${top}V${BASE}Z`;
  }
  return d;
}
const WALL = wallPath();

export default function SkyBand({ children, tall = false }: { children: React.ReactNode; tall?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let last = -1;
    const paint = () => {
      const m = nyMinutes(Date.now());
      if (m === last) return;
      last = m;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = cv.clientWidth, h = cv.clientHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      paintSky(ctx, cv.width, cv.height, skyAt(m), 11, document.documentElement.dataset.theme !== "dark");
    };
    paint();
    const id = setInterval(paint, 30000);
    const ro = new ResizeObserver(() => { last = -1; paint(); });
    ro.observe(cv);
    const mo = new MutationObserver(() => { last = -1; paint(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { clearInterval(id); ro.disconnect(); mo.disconnect(); };
  }, []);

  return (
    <section className={`${s.band} ${tall ? s.tall : ""}`}>
      <div className={s.scene} aria-hidden>
        <canvas ref={canvas} className={s.sky} />
        <svg className={s.wall} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMax slice">
          <path d={WALL} fillRule="evenodd" />
        </svg>
        <div className={s.fade} />
      </div>
      <div className={s.content}>{children}</div>
    </section>
  );
}
