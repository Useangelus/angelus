import type { MetadataRoute } from "next";
import { LISTINGS } from "@/lib/registry";
import { getRecord, sessionsOf } from "@/lib/record";

const site = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3217").replace(/\/$/, "");

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  // Every scored night has its own edition page.
  const days = await getRecord().then((r) => sessionsOf(r.rows)).catch(() => [] as string[]);
  const pages: [string, MetadataRoute.Sitemap[number]["changeFrequency"], number][] = [
    ["", "hourly", 1],
    ["/board", "hourly", 0.9],
    ["/edition", "daily", 0.8],
    ["/record", "daily", 0.8],
    ["/calls", "hourly", 0.8],
    ["/watch", "daily", 0.6],
    ["/flow", "hourly", 0.6],
    ["/docs", "monthly", 0.5],
    ["/token", "weekly", 0.5],
    ["/terms", "yearly", 0.3],
  ];
  return [
    ...pages.map(([p, changeFrequency, priority]) => ({ url: `${site}${p}`, lastModified: now, changeFrequency, priority })),
    ...LISTINGS.map((l) => ({ url: `${site}/s/${l.ticker}`, lastModified: now, changeFrequency: "hourly" as const, priority: 0.7 })),
    ...days.map((d) => ({ url: `${site}/edition/${d}`, lastModified: new Date(`${d}T14:00:00Z`), changeFrequency: "monthly" as const, priority: 0.4 })),
  ];
}
