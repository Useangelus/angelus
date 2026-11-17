import { useCurrentFrame } from "remotion";
import { mono, serif, serifItalic } from "../fonts";
import { inOut, out, ramp } from "../ease";

type Part = { text: string; italic?: boolean };

/**
 * Words rise out of a mask one after another (a title-sequence reveal, not a fade), with a short focus pull.
 * `at` is the first word's start frame; `outAt` (optional) sends the whole line away.
 */
export function Rise({
  parts,
  at,
  outAt,
  size = 120,
  stagger = 4,
  dur = 26,
  color = "#f2f2f2",
  weight = 300,
  tracking = -0.025,
  lineHeight = 1.02,
}: {
  parts: Part[];
  at: number;
  outAt?: number;
  size?: number;
  stagger?: number;
  dur?: number;
  color?: string;
  weight?: number;
  tracking?: number;
  lineHeight?: number;
}) {
  const f = useCurrentFrame();
  const words: { w: string; italic?: boolean }[] = [];
  parts.forEach((p) => p.text.split(" ").filter(Boolean).forEach((w) => words.push({ w, italic: p.italic })));
  const gone = outAt == null ? 0 : ramp(f, outAt, outAt + 18, 0, 1, inOut);
  return (
    <span style={{ display: "inline-block", fontSize: size, lineHeight, letterSpacing: `${tracking}em`, color, opacity: 1 - gone, transform: `translateY(${-gone * 18}px)`, filter: `blur(${gone * 6}px)` }}>
      {words.map((x, i) => {
        const p = ramp(f, at + i * stagger, at + i * stagger + dur, 0, 1, out);
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: "0.12em", marginBottom: "-0.12em", marginRight: "0.24em" }}>
            <span
              style={{
                display: "inline-block",
                transform: `translateY(${(1 - p) * 105}%)`,
                opacity: Math.min(1, p * 2.5),
                filter: `blur(${(1 - p) * 8}px)`,
                fontFamily: x.italic ? serifItalic : serif,
                fontStyle: x.italic ? "italic" : "normal",
                fontWeight: weight,
              }}
            >
              {x.w}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** Small uppercase ledger label: types on character by character, the way a terminal prints. */
export function Label({ text, at, outAt, size = 20, color = "#8f8f8f", tracking = 0.22, speed = 1.2 }: { text: string; at: number; outAt?: number; size?: number; color?: string; tracking?: number; speed?: number }) {
  const f = useCurrentFrame();
  const n = Math.max(0, Math.floor((f - at) * speed));
  const gone = outAt == null ? 0 : ramp(f, outAt, outAt + 14, 0, 1, inOut);
  const shown = text.slice(0, n);
  const caret = n < text.length && f >= at && Math.floor(f / 4) % 2 === 0;
  return (
    <span style={{ fontFamily: mono, fontSize: size, letterSpacing: `${tracking}em`, textTransform: "uppercase", color, opacity: (f >= at ? 1 : 0) * (1 - gone), whiteSpace: "pre" }}>
      {shown}
      <span style={{ opacity: caret ? 1 : 0 }}>▍</span>
    </span>
  );
}

/** A hairline that draws itself from left to right. */
export function Rule({ at, dur = 30, width = 400, color = "rgba(255,255,255,0.35)", outAt }: { at: number; dur?: number; width?: number; color?: string; outAt?: number }) {
  const f = useCurrentFrame();
  const p = ramp(f, at, at + dur, 0, 1, out);
  const gone = outAt == null ? 0 : ramp(f, outAt, outAt + 14, 0, 1, inOut);
  return <div style={{ width: width * p, height: 1, background: color, opacity: 1 - gone }} />;
}
