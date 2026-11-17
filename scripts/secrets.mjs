// Generates the two server secrets ANGELUS makes for itself and writes them to .env.production.local
// (git-ignored). Run once:  node scripts/secrets.mjs
// Existing values are kept, so running it again never rotates a live secret by accident.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const FILE = ".env.production.local";
const env = existsSync(FILE) ? readFileSync(FILE, "utf8") : "";
const has = (k) => new RegExp(`^${k}=.+`, "m").test(env);
const lines = [];
for (const k of ["ANGELUS_DB_TOKEN", "CRON_SECRET"]) {
  if (has(k)) console.log(`${k}: kept`);
  else {
    lines.push(`${k}=${randomBytes(36).toString("base64url")}`);
    console.log(`${k}: created`);
  }
}
if (lines.length) writeFileSync(FILE, (env && !env.endsWith("\n") ? env + "\n" : env) + lines.join("\n") + "\n");
console.log(`-> ${FILE} (git-ignored). Add the Supabase and other values there too, then run scripts/vercel-env.mjs.`);
