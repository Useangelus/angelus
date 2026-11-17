import { refreshRecord, summarize } from "@/lib/record";
import { revalidatePath } from "next/cache";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const local = process.env.NODE_ENV !== "production";
  if (!local && (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const lines: string[] = [];
  const r = await refreshRecord((s) => {
    lines.push(s);
    console.log("[record]", s);
  });
  revalidatePath("/", "layout");
  const sessions = [...new Set(r.rows.map((x) => x.session))].sort();
  return Response.json({ rows: r.rows.length, from: sessions[0], to: sessions.at(-1), summary: summarize(r.rows), log: lines });
}
