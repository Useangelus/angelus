"use client";

import { setSound, useSound } from "@/lib/sound";

/** Sound on/off for the bells. Off by default; nothing plays until a visitor turns it on. Icon only: the header has no room for a second label beside the clock. */
export default function SoundToggle({ inMenu = false }: { inMenu?: boolean }) {
  const on = useSound();
  if (inMenu) {
    // In the phone menu: a labelled row, where the header has no room for the icon.
    return (
      <button type="button" className="sound-row" onClick={() => void setSound(!on)} aria-pressed={on}>
        Bell sound: {on ? "on" : "off"}
      </button>
    );
  }
  return (
    <button
      type="button"
      className="theme-btn sound-btn sound-head" style={{ padding: "6px 7px" }}
      onClick={() => void setSound(!on)}
      aria-pressed={on}
      aria-label={on ? "Turn the bells' sound off" : "Turn the bells' sound on"}
      title={on ? "Sound on: click a bell to ring it" : "Sound off"}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        {/* a small bell; the stroke lines show only when sound is on */}
        <path d="M9 2.2c-2.4 0-4 1.9-4 4.4v2.8L3.6 12h10.8L13 9.4V6.6c0-2.5-1.6-4.4-4-4.4Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <circle cx="9" cy="14.3" r="1.3" fill="currentColor" />
        {on ? (
          <>
            <path d="M14.9 4.2c.9 1 .9 2.6 0 3.6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M3.1 4.2c-.9 1-.9 2.6 0 3.6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </>
        ) : (
          <path d="M2.5 15.5 15.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        )}
      </svg>
    </button>
  );
}
