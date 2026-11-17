// A thin line of numbers, no chrome. Server-safe SVG.

export default function Spark({
  values,
  width = 160,
  height = 36,
  stroke = "var(--ink)",
  baseline,
  label,
}: {
  values: (number | null)[];
  width?: number;
  height?: number;
  stroke?: string;
  baseline?: number;
  label?: string;
}) {
  const v = values.map((x) => (x == null || !isFinite(x) ? null : x));
  const nums = v.filter((x): x is number => x != null);
  if (nums.length < 2) return <svg width={width} height={height} aria-hidden />;
  const lo = Math.min(...nums, baseline ?? Infinity), hi = Math.max(...nums, baseline ?? -Infinity);
  const y = (x: number) => height - 3 - ((x - lo) / (hi - lo || 1)) * (height - 6);
  const step = width / (v.length - 1);
  let d = "";
  v.forEach((x, i) => {
    if (x == null) return;
    d += `${d === "" || v[i - 1] == null ? "M" : "L"}${(i * step).toFixed(1)},${y(x).toFixed(1)}`;
  });
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} style={{ display: "block", overflow: "visible" }}>
      {baseline != null && <line x1={0} x2={width} y1={y(baseline)} y2={y(baseline)} stroke="var(--rule-2)" strokeDasharray="2 3" />}
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.25} strokeLinejoin="round" />
    </svg>
  );
}
