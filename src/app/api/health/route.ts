import { fetchPairs, official } from "@/lib/sources";
import { kvGet, storage } from "@/lib/store";
import { getLocks } from "@/lib/record";
import { clock, prevTradingDay } from "@/lib/clock";

// For uptime monitors: 200 when the site can price tonight's bells, 503 when it cannot.
// Also reports whether last night's 04:00 ET lock actually happened.

export const dynamic = "force-dynamic";

async function timed<T>(fn: () => Promise<T>): Promise<{ ok: boolean; ms: number; value?: T }> {
  const t = Date.now();
  try {
    const value = await fn();
    return { ok: true, ms: Date.now() - t, value };
  } catch {
    return { ok: false, ms: Date.now() - t };
  }
}

export async function GET() {
  const c = clock();
  const [pools, tape, store, locks] = await Promise.all([
    // Probes the source itself, so a stand-in answer from the last good list does not count.
    timed(async () => { const p = await fetchPairs("robinhood", "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC", 0); if (!p.fresh || !p.pairs.length) throw new Error("empty"); return p.pairs.length; }),
    timed(async () => { const o = await official("SPY", "5d", 0); if (!o) throw new Error("empty"); return o.days.length; }),
    timed(() => kvGet("health-probe")),
    timed(() => getLocks()),
  ]);
  // The most recent session that should already have been locked.
  const lastLocked = c.now >= c.lockAt ? c.session : prevTradingDay(c.session);
  const lockedSessions = locks.value ? Object.keys(locks.value) : [];
  const lockOk = storage === "file" ? null : lockedSessions.includes(lastLocked);

  const healthy = pools.ok && tape.ok;
  return Response.json(
    {
      status: healthy ? "ok" : "degraded",
      time: new Date(c.now).toISOString(),
      checks: {
        dexscreener: { ok: pools.ok, ms: pools.ms },
        officialPrices: { ok: tape.ok, ms: tape.ms },
        storage: { backend: storage, ok: store.ok, ms: store.ms },
        nightlyLock: { expected: lastLocked, ok: lockOk },
      },
    },
    { status: healthy ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
