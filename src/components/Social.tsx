// X and GitHub links. X is @useangelus (overridable with NEXT_PUBLIC_X_URL); GitHub is the public repo
// Useangelus/angelus (overridable with NEXT_PUBLIC_GITHUB_URL).
// Monochrome marks drawn in currentColor so they follow the theme.

export const X_HANDLE = "useangelus";
const X_URL = process.env.NEXT_PUBLIC_X_URL || `https://x.com/${X_HANDLE}`;
const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/Useangelus/angelus";

export const hasSocial = Boolean(X_URL || GITHUB_URL);

function XMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GitHubMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a10.9 10.9 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.09 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

export default function Social({ size = 16, labels = false, className }: { size?: number; labels?: boolean; className?: string }) {
  if (!hasSocial) return null;
  return (
    <span className={`social ${className ?? ""}`}>
      {X_URL && (
        <a href={X_URL} target="_blank" rel="noreferrer" aria-label="ANGELUS on X" title="ANGELUS on X">
          <XMark size={size} />{labels && <span>X</span>}
        </a>
      )}
      {GITHUB_URL && (
        <a href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label="ANGELUS on GitHub" title="ANGELUS on GitHub">
          <GitHubMark size={size} />{labels && <span>GitHub</span>}
        </a>
      )}
    </span>
  );
}
