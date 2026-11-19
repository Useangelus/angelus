import { redirect } from "next/navigation";
import { replayable } from "@/lib/replay";

export const revalidate = 600;

// The latest night that can be replayed.
export default async function ReplayIndex() {
  const [latest] = await replayable();
  redirect(latest ? `/replay/${latest}` : "/record");
}
