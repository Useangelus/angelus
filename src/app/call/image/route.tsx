import { ImageResponse } from "next/og";
import { findCall } from "@/lib/callcard";
import { cardFonts } from "@/lib/ogfont";
import CallCard from "@/components/cards/CallCard";

// GET /call/image?a=0x…&t=NVDA&d=2026-11-17   (add s=2 for 3200×1800, download=1 for a file)

export async function GET(req: Request) {
  const u = new URL(req.url);
  const c = await findCall(u.searchParams.get("a"), u.searchParams.get("t"), u.searchParams.get("d"));
  if (!c) return new Response("No such call", { status: 404 });
  const k = u.searchParams.get("s") === "2" ? 2 : 1;
  const fonts = await cardFonts();
  const settled = c.outcome !== "pending";
  const headers: Record<string, string> = { "cache-control": settled ? "public, max-age=86400" : "public, max-age=120" };
  if (u.searchParams.has("download")) headers["content-disposition"] = `attachment; filename="angelus-call-${c.ticker}-${c.session}${k === 2 ? "@2x" : ""}.png"`;
  return new ImageResponse(<CallCard c={c} name={c.name} k={k} />, { width: 1600 * k, height: 900 * k, fonts, headers });
}
