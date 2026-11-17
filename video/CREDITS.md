# Sound sources

Every sound in the ANGELUS film is a real recording, cut, pitched or filtered. No stock music, no synthesized audio.
All files are from Wikimedia Commons and are public domain or CC0; credit is listed for the record.

| Use in the film | File | Recorded by | License |
|---|---|---|---|
| Every bell stroke (closing bell, the 16 bells of the tower, opening bell, the final ring) | Striking a bell 15cm large.ogg | stephan | Public domain |
| The room under the closing bell | 20150323 SM Glocke 5.ogg (Ludwigsglocke, St. Maximilian) | Rongaman | CC0 |
| The room under the opening bell, the 04:00 lock | 20150323 SM Glocke 4.ogg (Maximiliansglocke, St. Maximilian) | Rongaman | CC0 |
| The night's hum, slowed two octaves | 20150323 SM Glocke 6.ogg (Ottoglocke, St. Maximilian) | Rongaman | CC0 |
| The clock before 04:00 | Tick2.ogg | Marble Toast | CC0 |

Sources: https://commons.wikimedia.org/wiki/File:Striking_a_bell_15cm_large.ogg, File:20150323_SM_Glocke_4.ogg, File:20150323_SM_Glocke_5.ogg, File:20150323_SM_Glocke_6.ogg, File:Tick2.ogg

The site's bell sound (`public/sound/bell.mp3`) is cut from the same public-domain 15 cm bell.

## Rebuild

```bash
npm install
npx remotion bundle src/index.ts --out-dir build
npx remotion render build Intro out/video-hq.mp4 --gl=angle --concurrency=2 --crf=16 --x264-preset=slow
npx remotion render build Teaser out/teaser-hq.mp4 --gl=angle --concurrency=2 --crf=16 --x264-preset=slow
node sound/engine.mjs && node sound/mix.mjs
```
