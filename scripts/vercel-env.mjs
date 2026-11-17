// Pushes every variable in .env.production.local to the linked Vercel project (production).
// Server secrets go in as sensitive; NEXT_PUBLIC_* as plain (they are public by design).
// Run in a terminal that is logged in to the ANGELUS Vercel account:  node scripts/vercel-env.mjs
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.production.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z0-9_]+=.+/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
// Local-only values the site never reads (the database password stays on this machine).
const SKIP = new Set(["SUPABASE_DB_PASSWORD"]);
for (const [k, v] of Object.entries(env)) {
  if (SKIP.has(k)) continue;
  const pub = k.startsWith("NEXT_PUBLIC_");
  // remove first so re-running updates a value instead of failing on "already exists"
  spawnSync("npx", ["--yes", "vercel@latest", "env", "rm", k, "production", "--yes"], { stdio: "ignore", shell: true });
  const args = ["--yes", "vercel@latest", "env", "add", k, "production", ...(pub ? [] : ["--sensitive"])];
  const r = spawnSync("npx", args, { input: v, encoding: "utf8", shell: true });
  console.log(`${r.status === 0 ? "ok  " : "FAIL"} ${k}${pub ? "" : " (sensitive)"}${r.status === 0 ? "" : ": " + (r.stderr || r.stdout).trim().split("\n").pop()}`);
}
console.log("Redeploy for the values to take effect.");
