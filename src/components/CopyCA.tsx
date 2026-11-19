"use client";

import { useState } from "react";

/** The contract address, with a one-click copy. */
export default function CopyCA({ ca }: { ca: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="copy-ca">
      <span className="num">{ca}</span>
      <button
        type="button"
        className="theme-btn"
        onClick={async () => {
          try { await navigator.clipboard.writeText(ca); setDone(true); setTimeout(() => setDone(false), 1600); } catch { /* clipboard blocked */ }
        }}
        aria-label="Copy the contract address"
      >
        {done ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
