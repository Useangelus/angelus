import { readSeal, REGISTRY } from "@/lib/seal";

// What BellRegistry holds for a session, read from Robinhood Chain at request time.
// The /verify page recomputes the digest in the visitor's browser and compares it with this.
export async function GET(req: Request) {
  const session = new URL(req.url).searchParams.get("session") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(session)) return Response.json({ error: "session must be yyyy-mm-dd" }, { status: 400 });
  if (!REGISTRY) return Response.json({ error: "no contract configured" }, { status: 404 });
  try {
    const onchain = await readSeal(session);
    return Response.json(
      { session, contract: REGISTRY, onchain },
      { headers: { "access-control-allow-origin": "*", "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (e) {
    return Response.json({ error: "Robinhood Chain did not answer", detail: String(e).slice(0, 200) }, { status: 502 });
  }
}
