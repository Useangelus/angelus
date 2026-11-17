import { getBoard } from "@/lib/live";
import { summarize, sessionsOf, type Scored } from "@/lib/record";
import { lausWitnesses } from "@/lib/agents";

// Open data: tonight's Bell for every stock, the agents behind it, and the record so far.
// Free to use, no key, CORS open. Updated about once a minute.

export const revalidate = 60;

const r4 = (v: number | null | undefined) => (v == null || !isFinite(v) ? null : Math.round(v * 1e4) / 1e4);

export async function GET() {
  const b = await getBoard();
  const sessions = sessionsOf(b.record.rows);
  const summary = summarize(b.record.rows);
  const body = {
    about: "ANGELUS: estimates of the next official US opening price from tokenized-stock trading on Robinhood Chain, Solana and Ethereum. Estimates, not advice.",
    method: "/docs",
    generatedAt: new Date(b.updatedAt).toISOString(),
    clock: {
      phase: b.clock.phase,
      session: b.clock.session,
      referenceClose: b.clock.refDay,
      lockAt: new Date(b.clock.lockAt).toISOString(),
      openAt: new Date(b.clock.openAt).toISOString(),
      callsOpen: b.clock.callsOpen,
    },
    stocks: b.rows.map((r) => {
      const heard = new Set(lausWitnesses(r.chains).map((c) => c.chain));
      return {
        ticker: r.ticker,
        name: r.name,
        close: r4(r.close),
        bell: r4(r.est.bell),
        gap: r.est.bell != null ? r4(r.est.bell / r.close - 1) : null,
        agents: { lauds: r4(r.est.lauds), terce: r4(r.est.terce), compline: r4(r.est.compline), rawChain: r4(r.est.raw) },
        params: { beta: r4(r.params.beta), shrink: r4(r.params.k), weights: { lauds: r4(r.params.weights.lauds), terce: r4(r.params.weights.terce), compline: r4(r.params.weights.compline) } },
        chains: r.chains.map((c) => ({ chain: c.chain, price: r4(c.price), depthUsd: Math.round(c.liq), pools: c.pools, usedByLauds: heard.has(c.chain) })),
        open: r4(r.open),
      };
    }),
    record: {
      sessions: sessions.length,
      from: sessions[0] ?? null,
      to: sessions[sessions.length - 1] ?? null,
      averageMissBp: Object.fromEntries(summary.map((s) => [s.who as Scored, s.n ? Math.round(s.mae * 10) / 10 : null])),
      direction: Object.fromEntries(summary.map((s) => [s.who as Scored, s.hit == null ? null : Math.round(s.hit * 1000) / 1000])),
    },
  };
  return Response.json(body, {
    headers: {
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=60, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
