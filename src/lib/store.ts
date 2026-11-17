import "server-only";
import { promises as fs } from "fs";
import path from "path";

// Two backends:
//  - Supabase, when SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY + ANGELUS_DB_TOKEN are set.
//    Only the publishable key is used. The tables are closed to it; every read and write
//    goes through the angelus_* SQL functions (supabase/schema.sql), which check the
//    server-only ANGELUS_DB_TOKEN first. No service-role key is needed anywhere.
//  - JSON files in .data/ for local runs.

const SB_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SB_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const TOKEN = process.env.ANGELUS_DB_TOKEN;
const useSb = Boolean(SB_URL && SB_KEY && TOKEN);
const DIR = path.join(process.cwd(), ".data");

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const headers: Record<string, string> = { apikey: SB_KEY!, "content-type": "application/json" };
  // Legacy anon keys are JWTs and also go in Authorization; sb_publishable_ keys do not.
  if (SB_KEY!.startsWith("eyJ")) headers.authorization = `Bearer ${SB_KEY}`;
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    cache: "no-store",
    headers,
    body: JSON.stringify({ p_token: TOKEN, ...args }),
  });
  if (!r.ok) throw new Error(`store ${fn}: ${r.status} ${await r.text()}`);
  const text = await r.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const storage = useSb ? "supabase" : "file";

export async function kvGet<T>(key: string): Promise<T | null> {
  if (useSb) {
    try {
      return (await rpc<T | null>("angelus_kv_get", { p_key: key })) ?? null;
    } catch {
      return null;
    }
  }
  try {
    return JSON.parse(await fs.readFile(path.join(DIR, `${key}.json`), "utf8"));
  } catch {
    return null;
  }
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  if (useSb) {
    await rpc("angelus_kv_set", { p_key: key, p_value: value });
    return;
  }
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(path.join(DIR, `${key}.json`), JSON.stringify(value));
}

export interface CallRow {
  address: string;
  ticker: string;
  session: string;
  side: "over" | "under";
  ref: number;
  signature: string;
  created_at: string;
}

export async function callsInsert(row: CallRow): Promise<"ok" | "duplicate"> {
  if (useSb) {
    return rpc<"ok" | "duplicate">("angelus_call_insert", {
      p_address: row.address, p_ticker: row.ticker, p_session: row.session, p_side: row.side, p_ref: row.ref, p_signature: row.signature,
    });
  }
  const all = (await kvGet<CallRow[]>("calls")) ?? [];
  if (all.some((c) => c.address === row.address && c.ticker === row.ticker && c.session === row.session)) return "duplicate";
  all.push(row);
  await kvSet("calls", all);
  return "ok";
}

export async function callsList(filter: { session?: string; address?: string; since?: string } = {}): Promise<CallRow[]> {
  if (useSb) {
    try {
      const rows = await rpc<(CallRow & { ref: number | string })[]>("angelus_calls_list", {
        p_session: filter.session ?? null, p_address: filter.address ?? null, p_since: filter.since ?? null,
      });
      return (rows ?? []).map((r) => ({ ...r, ref: Number(r.ref) }));
    } catch {
      return [];
    }
  }
  const all = (await kvGet<CallRow[]>("calls")) ?? [];
  return all
    .filter((c) => (!filter.session || c.session === filter.session) && (!filter.address || c.address === filter.address) && (!filter.since || c.session >= filter.since))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
