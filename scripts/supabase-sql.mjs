// Writes the exact SQL to run in the Supabase SQL editor, with this deployment's values filled in,
// to supabase/.generated.sql (git-ignored, it contains secrets).
//   node scripts/supabase-sql.mjs            -> schema + token (run before the first deploy)
//   node scripts/supabase-sql.mjs --cron     -> the exact-time 04:00 lock (run after the site is live)
import { readFileSync, writeFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.production.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=.+/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const need = (k) => {
  if (!env[k]) throw new Error(`${k} is missing from .env.production.local`);
  return env[k].replace(/'/g, "''");
};
let sql;
if (process.argv.includes("--cron")) {
  const site = need("NEXT_PUBLIC_SITE_URL").replace(/\/$/, "");
  sql = readFileSync("supabase/cron.sql", "utf8").replaceAll("<SITE>", site).replaceAll("<CRON_SECRET>", need("CRON_SECRET"));
} else {
  sql = readFileSync("supabase/schema.sql", "utf8") + `\n\n-- this deployment's database token\nselect private.angelus_set_token('${need("ANGELUS_DB_TOKEN")}');\n`;
}
writeFileSync("supabase/.generated.sql", sql);
console.log("-> supabase/.generated.sql: paste it into the Supabase SQL editor and run it. Delete the file afterwards.");
