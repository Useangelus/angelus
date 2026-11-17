"use client";

import { useState } from "react";

export default function CopyText({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <div style={{ border: "1px solid var(--rule-2)", borderRadius: 2 }}>
      <pre style={{ margin: 0, padding: "16px 18px", whiteSpace: "pre-wrap", fontFamily: "var(--f-serif)", fontSize: 17, lineHeight: 1.5 }}>{text}</pre>
      <button
        className="btn ghost"
        style={{ width: "100%", justifyContent: "center", borderWidth: "1px 0 0 0", borderRadius: 0 }}
        onClick={async () => {
          try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1800); } catch { /* clipboard blocked */ }
        }}
      >
        {done ? "Copied" : "Copy caption"}
      </button>
    </div>
  );
}
