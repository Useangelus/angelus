"use client";

import { useSyncExternalStore } from "react";

// The bells' voice: one real recording (a 15 cm bell, public domain, Wikimedia Commons), pitched per bell.
// Off by default. A visitor turns it on with the switch in the masthead; the choice is remembered.
// Nothing plays without a click, so browsers never block it and nobody is surprised by sound.

const KEY = "angelus-sound";
const subs = new Set<() => void>();
let ctx: AudioContext | null = null;
let buffer: AudioBuffer | null = null;
let loading: Promise<void> | null = null;

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

export function soundOn(): boolean {
  return typeof window !== "undefined" && read();
}

export function useSound(): boolean {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },
    read,
    () => false,
  );
}

async function prepare() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") await ctx.resume();
  if (!buffer) {
    loading ??= fetch("/sound/bell.mp3")
      .then((r) => r.arrayBuffer())
      .then((b) => ctx!.decodeAudioData(b))
      .then((b) => {
        buffer = b;
      });
    await loading;
  }
}

/** Each bell's pitch, as in the film: a carillon in fourths and fifths, the bottom row lower. */
function pitch(i: number) {
  const scale = [1, 1.125, 1.25, 1.5, 1.6875, 2, 2.25, 2.5];
  return scale[((i % 8) + 8) % 8] * (i < 8 ? 1 : 0.75) * 0.4;
}

/** Ring bell i once (a stroke), if sound is on. `strength` 0..1 scales the stroke. */
export async function ring(i: number, strength = 1) {
  if (!read()) return;
  await prepare();
  if (!ctx || !buffer) return;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = pitch(i);
  const g = ctx.createGain();
  g.gain.value = 0.35 + 0.65 * Math.max(0, Math.min(1, strength));
  src.connect(g).connect(ctx.destination);
  src.start();
}

export async function setSound(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* private mode */
  }
  subs.forEach((s) => s());
  // Turning it on is a click: answer it with one soft stroke, so the visitor knows it works.
  if (on) await ring(3, 0.5);
}
