# Chokepoint — Demo video

A **28-second, gaming-styled product demo** you can post on YouTube, LinkedIn,
X/Twitter, TikTok, Reels or Shorts. Rebuilt from the redesigned
**command-center dashboard** (live risk index, risk-trend chart, severity donut,
activity timeline, action breakdown, live alerts and tamper-evident audit trail).

## Files

| File | What |
| --- | --- |
| **`chokepoint-demo.mp4`** | **Horizontal / landscape (16:9)** — 1920×1080, H.264, ~28s, with voiceover **and** music. For **YouTube** and LinkedIn. |
| **`chokepoint-demo-vertical.mp4`** | **Vertical (9:16)** — 1080×1920, H.264, ~28s. For **Shorts, Reels & TikTok**. Same content, sharp video centered over a blurred backdrop. |
| `intro-card.png` | The animated title card ("PRESS START"). |
| `outro-card.png` | The "LEVEL UP" end card with the live URL. |
| `hud-overlay.png` | Transparent gaming HUD corner brackets overlay. |
| `scanline.png` | Legacy cyan light-sweep strip (no longer used — it obscured the new data-rich dashboard). |
| `build-video.sh` | ffmpeg script that assembles the video: punch-in on cards, vertical pan over tall pages, HUD corner brackets + gaming caption. |
| `synth-music.mjs` | Node script that synthesizes the music bed. |
| `music.wav` | The synthesized music bed (44.1 kHz stereo). |
| `narration.mp3` | The voiceover track. |
| `LINKEDIN-POST.md` | Copy/paste-ready LinkedIn announcement. |
| `SOCIAL-CAPTION.md` | Post-ready captions, hooks & hashtags for TikTok/Reels/Shorts/X/YouTube. |

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
