import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { LiveRow } from "./live";
import { kvGet, kvSet } from "./store";

// The Vigil: once a night, at the lock, a language model reads the board and writes one
// short note per stock explaining what the night did and why the agents disagree.
// It never changes a number. Without ANTHROPIC_API_KEY it simply does not run.

export interface Vigil { session: string; at: number; notes: Record<string, string> }

const SYSTEM = `You write the overnight notes for ANGELUS, a site that estimates the next official opening price of US stocks from tokenized-stock trading on Robinhood Chain, Solana and Ethereum while the exchange is closed.

For each stock you receive: the official close, the on-chain prices per chain with pool depth, three agent estimates (Lauds: cross-chain average; Terce: market beta split; Compline: learned shrink of the token move) and the blended Bell.

Write one note per stock, 1 to 2 sentences, under 45 words. Say what the night did (direction and size against the close), whether the chains and the agents agree, and the one thing most worth watching at the open. Plain English, no hype, no advice to buy or sell, no emoji, no predictions beyond the numbers given.

Output exactly one line per stock in the form TICKER: note. No other text.`;

function brief(rows: LiveRow[]): string {
  const f = (v: number | null) => (v == null ? "n/a" : v.toFixed(2));
  return rows.map((r) => {
    const chains = r.chains.map((c) => `${c.chain} ${c.price.toFixed(2)} (depth $${Math.round(c.liq / 1000)}k)`).join("; ");
    return `${r.ticker} (${r.name}): close ${f(r.close)}; ${chains}; Lauds ${f(r.est.lauds)}; Terce ${f(r.est.terce)}; Compline ${f(r.est.compline)}; Bell ${f(r.est.bell)}`;
  }).join("\n");
}

export async function writeVigil(session: string, rows: LiveRow[]): Promise<Vigil | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic();
  try {
    const res = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [{ role: "user", content: `Session ${session}.\n\n${brief(rows)}` }],
    });
    if (res.stop_reason === "refusal") return null;
    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");
    const known = new Set(rows.map((r) => r.ticker));
    const notes: Record<string, string> = {};
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z]{1,6})\s*:\s*(.+)$/);
      if (m && known.has(m[1])) notes[m[1]] = m[2].trim();
    }
    if (!Object.keys(notes).length) return null;
    const v: Vigil = { session, at: Date.now(), notes };
    await kvSet("vigil", v);
    return v;
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) console.error("vigil: rate limited");
    else if (e instanceof Anthropic.AuthenticationError) console.error("vigil: invalid ANTHROPIC_API_KEY");
    else if (e instanceof Anthropic.APIError) console.error(`vigil: API error ${e.status}`, e.message);
    else console.error("vigil:", e);
    return null;
  }
}

export async function getVigil(session: string): Promise<Vigil | null> {
  const v = await kvGet<Vigil>("vigil").catch(() => null);
  return v && v.session === session ? v : null;
}
