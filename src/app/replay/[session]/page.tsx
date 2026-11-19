import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReplayPlayer from "@/components/ReplayPlayer";
import { pageMeta } from "@/lib/meta";
import { dayLabel } from "@/lib/clock";
import { nightOf, replayable } from "@/lib/replay";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ session: string }> }): Promise<Metadata> {
  const { session } = await params;
  return pageMeta({ title: `Replay · ${dayLabel(session)}`, description: `The night before the ${dayLabel(session)} open, replayed: sixteen bells swinging as each stock's token moved, the 04:00 ET lock, and the grade at the bell.`, path: `/replay/${session}` });
}

export default async function ReplayPage({ params }: { params: Promise<{ session: string }> }) {
  const { session } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(session)) notFound();
  const [data, sessions] = await Promise.all([nightOf(session), replayable()]);
  if (!data) notFound();
  return (
    <>
      <header className="wrap rp-head">
        <div>
          <p className="label" style={{ marginBottom: 14 }}>Replay · the night before {dayLabel(session)}</p>
          <h1 className="h2">Watch a night <em>ring out.</em></h1>
        </div>
        <p className="mute" style={{ maxWidth: "34em" }}>
          From the {dayLabel(data.prevDay)} closing bell to the {dayLabel(session)} open, in {26} seconds. Each bell swings as far as its stock&apos;s token had moved
          from the close; at 04:00 ET the numbers lock and the bells stop; at 09:30 ET the open grades every Bell. <Link href="/docs#clock" className="u">How the night works</Link>
        </p>
      </header>
      <ReplayPlayer key={session} data={data} sessions={sessions.length ? sessions : [session]} />
    </>
  );
}
