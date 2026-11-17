import { getSeals, REGISTRY, EXPLORER, robinhood } from "@/lib/seal";

export const revalidate = 60;

// Every night ANGELUS sealed on Robinhood Chain, with the exact numbers sent, so anyone can rebuild the
// digest and compare it with BellRegistry.sealOf(session) or verify(session, tickers, closes, bells).
export async function GET() {
  const seals = await getSeals();
  const list = Object.values(seals).sort((a, b) => (a.session < b.session ? 1 : -1));
  return Response.json(
    {
      contract: REGISTRY || null,
      chain: { id: robinhood.id, name: robinhood.name, explorer: EXPLORER },
      howToVerify:
        "digest = keccak256(abi.encode(uint32 session_yyyymmdd, bytes8[] tickers_ascending, uint64[] closes, uint64[] bells)), prices in USD with 6 decimals. Compare with sealOf(session).digest on the contract, or call verify(...).",
      seals: list,
    },
    { headers: { "access-control-allow-origin": "*" } },
  );
}
