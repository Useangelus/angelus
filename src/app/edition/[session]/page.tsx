import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEdition, editionCaption } from "@/lib/edition";
import { sessionsOf, getRecord } from "@/lib/record";
import { dayLabel } from "@/lib/clock";
import SkyBand from "@/components/belfry/SkyBand";
import CopyText from "@/components/CopyText";
import { pageMeta } from "@/lib/meta";
import SealNote from "@/components/SealNote";
import { SITE_URL } from "@/lib/site";

export const revalidate = 300;


export async function generateMetadata({ params }: { params: Promise<{ session: string }> }): Promise<Metadata> {
  const { session } = await params;
  const e = await getEdition(session === "latest" ? undefined : session);
  if (!e) return { title: "Edition" };
  const title = `Edition No. ${e.no} · ${dayLabel(e.session)}`;
  const image = { url: `/edition/${e.session}/image`, width: 1600, height: 900, alt: `ANGELUS edition ${e.no}` };
  return pageMeta({ title, description: `The night of ${dayLabel(e.night)} in ${e.rows.length} bells.`, path: `/edition/${e.session}`, image });
}

export default async function EditionPage({ params }: { params: Promise<{ session: string }> }) {
  const { session } = await params;
  const e = await getEdition(session === "latest" ? undefined : session);
  if (!e) notFound();
  const rec = await getRecord();
  const days = sessionsOf(rec.rows);
  const prev = days.filter((d) => d < e.session).at(-1);
  const next = days.find((d) => d > e.session) ?? (e.live ? undefined : "latest");
  const caption = editionCaption(e, SITE_URL);
  const img = `/edition/${e.session}/image`;

  return (
    <>
      <SkyBand>
        <header className="wrap grid-2" style={{ paddingBottom: 40 }}>
          <div>
            <p className="label" style={{ marginBottom: 18 }}>Edition No. {e.no} · {e.live ? "tonight" : "scored"}</p>
            <h1 className="h2">The night of {dayLabel(e.night)}, <em>in {e.rows.length} bells.</em></h1>
          </div>
          <p className="mute" style={{ alignSelf: "end", margin: 0 }}>
            One edition per night, drawn from the board. Post it as it is: the image is 16:9 and the caption is written for it.
            {e.live ? " Tonight's edition keeps updating until the 04:00 ET lock." : ""}
          </p>
        </header>
      </SkyBand>
      <div className="wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt={`ANGELUS edition ${e.no}`} width={1600} height={900} style={{ width: "100%", height: "auto", display: "block", border: "1px solid var(--rule-2)" }} />
        <div className="grid-2" style={{ marginTop: 32, alignItems: "start" }}>
          <div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a className="btn" href={`${img}?s=2&download=1`}>Download 3200×1800 <span className="arr">↓</span></a>
            <a className="btn ghost" href={`${img}?download=1`}>1600×900</a>
          </div>
          <SealNote session={e.session} />
          </div>
          <div>
            <p className="label" style={{ marginBottom: 10 }}>Caption</p>
            <CopyText text={caption} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 56, paddingTop: 20, borderTop: "1px solid var(--rule)" }}>
          {prev ? <Link className="u" href={`/edition/${prev}`}>← Edition No. {e.no - 1}</Link> : <span />}
          {next ? <Link className="u" href={`/edition/${next}`}>Edition No. {e.no + 1} →</Link> : <span />}
        </div>
      </div>
    </>
  );
}
