# PayTable Cinematic Video Verification Report

## Rendered Deliverables

| Cut | File | Duration | Resolution & Rate | Codecs | Integrated Loudness | True Peak |
| --- | --- | --- | --- | --- | --- | --- |
| Hackathon Master (`< 3:00`) | `video/out/paytable-hackathon-master.mp4` | `80.00s` (`1:20`, `2400` frames) | `1920x1080` at `30fps` | `H.264` + `AAC` (`48 kHz`) | `-14.29 LUFS` | `-2.68 dBTP` |
| X Launch Cut (`40s`) | `video/out/paytable-x-launch.mp4` | `40.00s` (`0:40`, `1200` frames) | `1920x1080` at `30fps` | `H.264` + `AAC` (`48 kHz`) | `-14.30 LUFS` | `-2.70 dBTP` |

## Frame and Audio Quality Gates

1. **Devpost Under-3-Minute Gate**: Master cut clocks in at `80.000000s` (`1:20`), well below the mandatory `3:00` (`180.0s`) ceiling so judges see every capability without padding.
2. **Deterministic Software ANGLE Rasterization (`gl: "swangle"`)**: Eliminated macOS headless Chromium Metal `IOSurface` 3x3 tile corruption across concurrent tabs (`70.0s` to `75.0s`), verified by pixel inspection at `2s`, `28s`, `41s`, `52s`, `62s`, `68s`, `70s`, `72.5s`, and `75s`.
3. **Sodium + Cinetic Visual Continuity**: Verified `0px` square geometry, `#141412` carbon ground, `#ffd400` primary action emphasis, orange `NEEDS APPROVAL` human gate tab, live `AG Grid v36` ledger plate, unclipped `HUMAN SIGN` / `READ SAFE` SDK gate column, and crisp `PayTable` end lockup.
4. **Broadcast Audio Mastering**: Voiceover (`ElevenLabs eleven_multilingual_v2` pipeline with offline neural studio fallback), `D Dorian` `92 BPM` low-pass modular score (`680 Hz` speech clearance), and mechanical UI foley mastered to `-14.29 LUFS` with `-2.68 dBTP` headroom.

## Reproducible Verification Commands

```bash
cd video && npm run voice && npm run render
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate -of json video/out/paytable-hackathon-master.mp4
ffmpeg -i video/out/paytable-hackathon-master.mp4 -af loudnorm=print_format=json -f null -
```
