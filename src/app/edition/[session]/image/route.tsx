import { ImageResponse } from "next/og";
import { getEdition } from "@/lib/edition";
import { cardFonts } from "@/lib/ogfont";
import EditionCard from "@/components/cards/EditionCard";

// GET /edition/2026-11-17/image        → 1600×900 (share preview)
// GET /edition/2026-11-17/image?s=2     → 3200×1800 (the file to post)
// add &download=1 to get it as an attachment. "latest" = tonight's edition.

export const revalidate = 300;

export async function GET(req: Request, { params }: { params: Promise<{ session: string }> }) {
  const { session } = await params;
  const url = new URL(req.url);
  const k = url.searchParams.get("s") === "2" ? 2 : 1;
  const e = await getEdition(session === "latest" ? undefined : session);
  if (!e) return new Response("No such edition", { status: 404 });
  const fonts = await cardFonts();
  const headers: Record<string, string> = { "cache-control": "public, max-age=300, s-maxage=300" };
  if (url.searchParams.has("download")) headers["content-disposition"] = `attachment; filename="angelus-edition-${e.no}-${e.session}${k === 2 ? "@2x" : ""}.png"`;
  return new ImageResponse(<EditionCard e={e} k={k} />, { width: 1600 * k, height: 900 * k, fonts, headers });
}
