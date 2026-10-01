# Cozy Casino marketing assets

| Folder | What it is |
| --- | --- |
| `intro-video/` | 30s landscape intro, 1920×1080. HyperFrames project plus the rendered `cozy-casino-intro.mp4` |
| `intro-video-portrait/` | 30s TikTok/Reels/Shorts cut, 1080×1920. Shares assets with `intro-video/` through a symlink |
| `play-store-screenshots/` | 7 portrait Google Play screenshots, 1440×2560 PNG. Template and source captures are in `source/` |

## Footage

All gameplay comes from the real game, captured at 3× pixel density (2796×1290) in a 932×430 landscape phone viewport.

## Re-rendering

```bash
cd marketing/intro-video && npx hyperframes render -f 30 -q delivery --crf 14 --video-frame-format png -o cozy-casino-intro.mp4
cd marketing/intro-video-portrait && npx hyperframes render -f 30 -q delivery --crf 14 --video-frame-format png -o cozy-casino-intro-portrait.mp4
cd marketing/play-store-screenshots/source && node render.mjs   # writes out/*.png
```

To change screenshot headlines, edit `play-store-screenshots/source/shots.json`.

## Google Play notes

- Screenshots are 1440×2560 (9:16). That is inside Play's limits: 320–3840px per side, with the long side at most 2× the short side.
- Raw landscape captures from the game are 2.17:1, which Play rejects. That is why the screenshots are framed.
- The "10,000,000 free coins" claim matches the in-game welcome gift (`App.tsx`, welcome-gift claim handler).
