import { loadFont as loadSerif } from "@remotion/google-fonts/Newsreader";
import { loadFont as loadMono } from "@remotion/google-fonts/IBMPlexMono";

// The site's own pair: Newsreader (editorial serif) and IBM Plex Mono (the ledger).
export const serif = loadSerif("normal", { weights: ["300", "400", "500"], subsets: ["latin"] }).fontFamily;
export const serifItalic = loadSerif("italic", { weights: ["300", "400"], subsets: ["latin"] }).fontFamily;
export const mono = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily;
