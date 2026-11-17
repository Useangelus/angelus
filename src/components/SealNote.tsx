import Link from "next/link";
import { getSeals, REGISTRY, txUrl, addressUrl } from "@/lib/seal";
import { short } from "@/lib/format";

/** Where one session's locked numbers stand on Robinhood Chain. Renders nothing until the contract exists. */
export default async function SealNote({ session }: { session: string }) {
  if (!REGISTRY) return null;
  const seal = (await getSeals())[session];
  const at = seal ? new Date(seal.at).toISOString().slice(11, 16) : null;
  return (
    <div style={{ borderTop: "1px solid var(--rule)", paddingTop: 14, marginTop: 20 }}>
      <p className="label" style={{ marginBottom: 8 }}>On-chain seal</p>
      {seal ? (
        <p className="note" style={{ margin: 0 }}>
          Sealed on Robinhood Chain at {at} UTC, before the opening bell.{" "}
          {seal.tx ? <a className="u num" href={txUrl(seal.tx)} target="_blank" rel="noreferrer">tx {short(seal.tx)}</a> : <a className="u" href={addressUrl(seal.contract)} target="_blank" rel="noreferrer">contract</a>}
          {" · "}digest <span className="num">{short(seal.digest)}</span> · <Link className="u" href="/docs#seal">how to check it</Link>
        </p>
      ) : (
        <p className="note" style={{ margin: 0 }}>
          Not sealed. Each night&apos;s numbers are written to <a className="u num" href={addressUrl(REGISTRY)} target="_blank" rel="noreferrer">BellRegistry</a> at the 04:00 ET lock; nights scored before it existed have no seal.
        </p>
      )}
    </div>
  );
}
