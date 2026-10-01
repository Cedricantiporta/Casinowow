# Cozy Casino: 30s intro video

`cozy-casino-intro.mp4` is a 1920×1080, 30fps, 30-second landscape intro, built with [HyperFrames](https://github.com/heygen-com/hyperframes).

All gameplay footage is real: it was captured from the game running locally in a 932×430 landscape phone viewport.

## Edit and re-render

```bash
cd marketing/intro-video
npx hyperframes preview   # live preview / timeline studio
npx hyperframes render -f 30 -q delivery --video-frame-format png -o cozy-casino-intro.mp4
```

Every scene is in `index.html`. Scene timing is snapped to the music. The drop (`D = 4.26s`) and kick spacing (`P = 0.54s`) are at the top of the script.

| Time | Scene |
| --- | --- |
| 0–4.3s | Reels spin and land on triple sevens |
| 4.3–8.6s | Logo slam with a coin burst. "Your cozy corner of Vegas" |
| 8.6–12.9s | Lobby on a phone. "20+ themed slots" |
| 12.9–16.7s | Wall of slot covers with kinetic phrases |
| 16.7–22.6s | Gameplay cut on the beat (Piggy Riches, Pharaoh's Tomb, Buffalo Thunder) |
| 22.6–25.3s | "Free coins!" welcome gift counter to 10,000,000 with coin rain |
| 25.3–27.5s | Feature cards |
| 27.5–30s | End card: "10,000,000 free coins to start" and "Play free on Android" |

Music is the in-game Neon Vegas track (`neon_music.mp3`), starting at 11.5s into the track. Sound effects come from the game, plus a synthesized whoosh and reel tick.
