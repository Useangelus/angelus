import type { Metadata } from "next";

type Img = { url: string; width?: number; height?: number; alt?: string };

// The site-wide card (src/app/opengraph-image.tsx). A page with its own opengraph-image file still wins.
const DEFAULT_IMG: Img = { url: "/opengraph-image", width: 1200, height: 630, alt: "ANGELUS: Wall Street is asleep. Its stocks are not." };

/**
 * One page's metadata: its own title and description in search results and in share previews
 * (X, Telegram, Discord), plus a canonical URL. Without this every page would share as plain "ANGELUS".
 */
export function pageMeta({ title, description, path, image, noindex }: { title: string; description: string; path: string; image?: Img; noindex?: boolean }): Metadata {
  const full = `${title} · ANGELUS`;
  const img = image ?? DEFAULT_IMG;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: full, description, url: path, siteName: "ANGELUS", type: "website", images: [img] },
    twitter: { card: "summary_large_image", site: "@useangelus", creator: "@useangelus", title: full, description, images: [img.url] },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
