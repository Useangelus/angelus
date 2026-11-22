import { revalidatePath } from "next/cache";
import { storeNights } from "@/lib/replay";

// Runs after the open (Supabase pg_cron): stores every finished night of the replay with full hourly history,
// so the replay page never has to ask GeckoTerminal for it again. Safe to call any number of times.

export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const local = process.env.NODE_ENV !== "production";
  if (!local && (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const out = await storeNights();
  for (const s of out.stored) revalidatePath(`/replay/${s}`);
  if (out.stored.length) revalidatePath("/replay");
  return Response.json(out);
}
