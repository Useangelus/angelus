import { redirect } from "next/navigation";
import { clock } from "@/lib/clock";

export const dynamic = "force-dynamic";

/** /edition always opens tonight's edition. */
export default function Latest() {
  redirect(`/edition/${clock().session}`);
}
