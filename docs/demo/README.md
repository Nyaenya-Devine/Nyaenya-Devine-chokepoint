# Chokepoint — Demo video

A **28-second, gaming-styled product demo** you can post on YouTube, LinkedIn,
X/Twitter, TikTok, Reels or Shorts.

## Files

| File | What |
| --- | --- |
| **`chokepoint-demo.mp4`** | **The final video** — 1920×1080, H.264, ~28s, with voiceover **and** music. YouTube/LinkedIn-ready. |
| `intro-card.png` | The animated title card ("PRESS START"). |
| `outro-card.png` | The "LEVEL UP" end card with the live URL. |
| `hud-overlay.png` | Transparent gaming HUD corner brackets overlay. |
| `scanline.png` | The cyan light-sweep strip used in the animation. |
| `build-demo.sh` | ffmpeg script that assembles the video (zoom, HUD, caption, scanline). |
| `synth-music.mjs` | Node script that synthesizes the music bed. |
| `music.wav` | The synthesized music bed (44.1 kHz stereo). |
| `narration.mp3` | The voiceover track. |
| `LINKEDIN-POST.md` | Copy/paste-ready LinkedIn announcement. |

## Licensing / safety

- **The music is 100% synthesized in-code** (`synth-music.mjs`) — an original,
  128 BPM cyber/techno bed with no sampled material. **No copyright or Content ID
  issues**, so it's safe to post on YouTube and other platforms.
- The voiceover is an AI/TTS narration. If you want a personal touch, re-record it
  in your own voice and swap it in (the build script handles the mix).

## Live URL

> **https://nyaenya-devine-chokepoint.vercel.app**

Sign in with a demo account (no signup): `admin` / `admin1234`, `operator` /
`operator1234`, `auditor` / `auditor1234`, `viewer` / `viewer1234`.
