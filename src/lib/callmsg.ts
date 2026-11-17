// The exact text a wallet signs for a call. Shared by browser and server.

export function callMessage(c: { ticker: string; side: "over" | "under"; ref: number; session: string; address: string }): string {
  return [
    "ANGELUS call",
    "",
    `${c.ticker} opens ${c.side.toUpperCase()} ${c.ref.toFixed(4)}`,
    `Session: ${c.session}`,
    `Address: ${c.address.toLowerCase()}`,
    "",
    "No transaction. No fee. Signing only records this call.",
  ].join("\n");
}

export function seasonOf(session: string): string {
  return session.slice(0, 7);
}
