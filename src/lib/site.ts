// The site's public origin, without a trailing slash.
// NEXT_PUBLIC_SITE_URL wins (set it to the custom domain); on Vercel the production domain is used
// automatically; locally it falls back to the dev server.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/$/, "");
