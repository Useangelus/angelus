import type { Metadata, Viewport } from "next";
import { Newsreader, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Masthead from "@/components/Masthead";
import Footer from "@/components/Footer";
import AutoRefresh from "@/components/AutoRefresh";
import { Analytics } from "@vercel/analytics/next";

const serif = Newsreader({ subsets: ["latin"], variable: "--f-serif", style: ["normal", "italic"], axes: ["opsz"], display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--f-mono", weight: ["400", "500"], display: "swap" });

const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3217";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "ANGELUS · the stock market's night, priced", template: "%s · ANGELUS" },
  description: "Agents on Robinhood Chain that read tokenized stocks while Wall Street is closed, publish the next opening price, and grade themselves at the bell.",
  openGraph: { title: "ANGELUS", description: "Wall Street is closed. Its stocks are not.", type: "website" },
  twitter: { card: "summary_large_image", site: "@useangelus", creator: "@useangelus" },
  icons: { icon: [{ url: "/favicon.ico" }, { url: "/favicon.svg", type: "image/svg+xml" }], apple: "/apple-touch-icon.png" },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

// Runs before paint: light by default; dark only if the visitor chose it with the switch.
const THEME_BOOT = `try{var t=localStorage.getItem("angelus-theme");document.documentElement.dataset.theme=t==="dark"?"dark":"light"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" className={`${serif.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <a href="#main" className="skip">Skip to content</a>
        <Masthead />
        <main id="main" tabIndex={-1}>{children}</main>
        <Footer />
        <AutoRefresh />
        {/* Cookieless page-view counts; active only once Web Analytics is enabled on Vercel. */}
        <Analytics />
      </body>
    </html>
  );
}
