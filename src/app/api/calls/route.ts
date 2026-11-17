import { verifyMessage, isAddress, getAddress } from "viem";
import { clock } from "@/lib/clock";
import { listing } from "@/lib/registry";
import { getBoard } from "@/lib/live";
import { callMessage } from "@/lib/callmsg";
import { callsInsert, callsList } from "@/lib/store";
import { scoreCalls } from "@/lib/season";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const address = url.searchParams.get("address");
  if (!address || !isAddress(address)) return Response.json({ calls: [] });
  const rows = await callsList({ address: address.toLowerCase() });
  return Response.json({ calls: await scoreCalls(rows.slice(0, 60)) });
}

export async function POST(req: Request) {
  let body: { address?: string; ticker?: string; side?: string; ref?: number; session?: string; signature?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  const { address, ticker, side, ref, session, signature } = body;
  // An ordinary wallet signature is exactly 65 bytes (0x + 130 hex). Anything else is rejected
  // before it reaches verification or storage.
  if (
    !address || !isAddress(address) || !ticker || !listing(ticker) || (side !== "over" && side !== "under") ||
    typeof ref !== "number" || !Number.isFinite(ref) || ref <= 0 ||
    typeof session !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(session) || typeof signature !== "string"
  ) {
    return Response.json({ error: "Missing or invalid fields." }, { status: 400 });
  }
  if (!/^0x[0-9a-fA-F]{130}$/.test(signature)) {
    return Response.json({ error: "This wallet signs in a format Calls cannot check yet (smart-contract wallets). Use a regular wallet such as MetaMask or Rabby." }, { status: 400 });
  }
  const c = clock();
  if (!c.callsOpen) return Response.json({ error: "Calls are closed. They open at the closing bell and lock at 04:00 ET." }, { status: 409 });
  if (session !== c.session) return Response.json({ error: "That session is not the one taking calls." }, { status: 409 });

  const b = await getBoard();
  const bell = b.rows.find((r) => r.ticker === ticker)?.est.bell;
  if (!bell) return Response.json({ error: "No Bell number for this stock right now." }, { status: 409 });
  if (Math.abs(ref / bell - 1) > 0.005) return Response.json({ error: "The Bell has moved since you loaded the page. Refresh and call again." }, { status: 409 });

  const addr = getAddress(address);
  const message = callMessage({ ticker, side, ref, session, address: addr });
  let ok = false;
  try {
    ok = await verifyMessage({ address: addr, message, signature: signature as `0x${string}` });
  } catch {
    ok = false;
  }
  if (!ok) return Response.json({ error: "Signature does not match this wallet." }, { status: 401 });

  try {
    const res = await callsInsert({ address: addr.toLowerCase(), ticker, session, side, ref, signature, created_at: new Date().toISOString() });
    if (res === "duplicate") return Response.json({ error: `You already called ${ticker} for this bell.` }, { status: 409 });
  } catch {
    return Response.json({ error: "Calls storage is not available right now." }, { status: 503 });
  }
  return Response.json({ ok: true });
}
