import { encodeAbiParameters, keccak256, stringToHex, type Hex } from "viem";

// The seal's digest, recomputed from the published numbers. Shared by the browser (/verify) and anyone reading
// the code: keccak256(abi.encode(uint32 yyyymmdd, bytes8[] tickers ascending, uint64[] closes, uint64[] bells)),
// prices in US dollars with 6 decimals.

export interface PublishedStock { ticker: string; close: string; bell: string }

const micro = (usd: string) => {
  const [i, f = ""] = usd.split(".");
  return BigInt(i) * BigInt(1_000_000) + BigInt((f + "000000").slice(0, 6));
};

export function digestFrom(session: string, stocks: PublishedStock[]): Hex {
  const s = [...stocks].sort((a, b) => (a.ticker < b.ticker ? -1 : a.ticker > b.ticker ? 1 : 0));
  return keccak256(
    encodeAbiParameters(
      [{ type: "uint32" }, { type: "bytes8[]" }, { type: "uint64[]" }, { type: "uint64[]" }],
      [Number(session.replaceAll("-", "")), s.map((x) => stringToHex(x.ticker, { size: 8 })), s.map((x) => micro(x.close)), s.map((x) => micro(x.bell))],
    ),
  );
}
