// Production smoke test: every page and endpoint answers, health is green, the board has prices.
//   node scripts/smoke.mjs https://your-domain
const base = (process.argv[2] || "").replace(/\/$/, "");
if (!base) throw new Error("usage: node scripts/smoke.mjs https://your-domain");
const pages = ["/", "/board", "/s/NVDA", "/record", "/calls", "/edition", "/watch", "/flow", "/docs", "/token", "/terms", "/sitemap.xml", "/robots.txt", "/opengraph-image", "/edition/latest/image", "/api/seals"];
let bad = 0;
for (const p of pages) {
  const r = await fetch(base + p, { redirect: "follow" }).catch((e) => ({ status: String(e) }));
  const ok = r.status === 200;
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${r.status} ${p}`);
}
const h = await (await fetch(base + "/api/health")).json().catch(() => null);
console.log("health:", JSON.stringify(h));
if (!h || h.status !== "ok") bad++;
const b = await (await fetch(base + "/api/bell.json")).json().catch(() => null);
const priced = b?.stocks?.filter((s) => s.bell != null).length ?? 0;
console.log(`bells priced: ${priced}/16`);
if (priced < 12) bad++;
console.log(bad ? `${bad} problem(s)` : "all good");
process.exit(bad ? 1 : 0);
