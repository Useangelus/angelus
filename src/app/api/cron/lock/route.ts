import { revalidatePath } from "next/cache";
import { clock } from "@/lib/clock";
import { getBoard } from "@/lib/live";
import { getLocks, type LockRow } from "@/lib/record";
import { kvSet } from "@/lib/store";
import { writeVigil } from "@/lib/vigil";
import { sealSession } from "@/lib/seal";

// Writes the lock to Robinhood Chain (BellRegistry) without ever failing the lock itself.
async function trySeal(session: string, rows: LockRow[]) {
  try {
    return await sealSession(session, rows);
  } catch (e) {
    console.error("[seal]", e);
    return { error: e instanceof Error ? e.message.slice(0, 300) : "seal failed" };
  }
}

// Runs at 08:00 and 09:00 UTC. Whichever run lands inside the hour after 04:00 ET
// (EDT or EST) freezes tonight's numbers. The open settles them later.

export const maxDuration = 120;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const local = process.env.NODE_ENV !== "production";
  if (!local && (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const force = local && new URL(req.url).searchParams.has("force");
  const c = clock();
  const inWindow = c.phase === "night" && c.now >= c.lockAt && c.now < c.lockAt + 70 * 60000;
  if (!inWindow && !force) return Response.json({ skipped: "outside the lock window", session: c.session });

  const locks = await getLocks();
  // Already locked: the second run only retries the on-chain seal if the first one did not land.
  if (locks[c.session]?.length && !force) {
    const seal = await trySeal(c.session, locks[c.session]);
    return Response.json({ skipped: "already locked", session: c.session, seal });
  }

  const b = await getBoard();
  const rows: LockRow[] = b.rows.filter((r) => r.est.bell != null).map((r) => ({
    session: c.session,
    ticker: r.ticker,
    close: r.close,
    lock: Object.fromEntries(r.chains.map((q) => [q.chain, q.price])),
    indexMove: null,
    beta: r.params.beta,
    k: r.params.k,
    est: r.est,
    at: Date.now(),
  }));
  // Keep about three months of nights.
  const keep = Object.keys(locks).sort().slice(-70);
  const next = Object.fromEntries(keep.map((k) => [k, locks[k]]));
  next[c.session] = rows;
  await kvSet("locks", next);
  const seal = await trySeal(c.session, rows);
  const vigil = await writeVigil(c.session, b.rows);
  revalidatePath("/", "layout");
  return Response.json({ locked: c.session, rows: rows.length, seal, vigil: vigil ? Object.keys(vigil.notes).length : "off" });
}
