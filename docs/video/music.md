# PayTable v2.0 Dual-Voice Score, Web Audio & Foley Cue Sheet

## 1. 6-Act Cinematic Launch Score (`video/scripts/synthesize_elevenlabs_voice.py`)

1. **Tempo & Harmony**: `92 BPM` in `D Dorian` / `D minor 9`, cycling a 4-bar chord progression (`Dm9 -> Bbmaj7 -> Fmaj7 -> C6`) with warm beat-pulsed sub-bass, stereo detuned Rhodes pad, and syncopated 8th-note Kurzgesagt-style marimba/kalimba bell plucks.
2. **Automatic Dialogue Ducking**: A 2-pass smoothed `100 Hz` gain envelope ducks the musical score to `0.38x` (`~ -8.4 dB`) `140ms` before each `Alex` or `Maya` vocal phrase and blooms back to `1.00x` in inter-scene transitions, mastered via `ffmpeg loudnorm` to `-14.0 LUFS` (`-1.5 dBTP` ceiling).
3. **Interactive In-App Web Audio (`web/src/lib/sound-engine.ts`)**: Mirrors the exact `92 BPM` `D Dorian` ambient chord loop (`Play Score` toggle in header) alongside tactile `SFX On` mechanical clicks, stage arpeggios, D-add9 approval chimes, and low sawtooth guardrail block alerts.

## 2. Master Film Foley Timeline (`92.0s @ 60fps`)

1. **Character & Step Entrance Pops (`380 Hz -> 820 Hz` pitch-envelope sine pop)**: `0.4s`, `9.1s`, `18.6s`, `26.2s`, `34.8s`, `58.5s`, `65.6s`, `72.5s`.
2. **Stereo Act Transition Whooshes (`520ms` filtered noise + sub sweep)**: `18.0s` (`ColorWipe`), `42.0s` (`WhipPan`), `58.0s` (`PortalIris`), `72.0s` (`DiagonalShutter`), `84.0s` (`ColorWipe`).
3. **Rust Vault `$500` Laser Gate Pulse (`640 Hz -> 230 Hz`)**: `46.0s` as the rogue `$620.00` quote capsule fails closed (`HTTP 422`).
4. **Human Switch Click + D-Add9 Approval Sparkle Chimes (`587 Hz + 740 Hz + 880 Hz + 1175 Hz`)**: `38.2s` (Tabletop `Approve` click), `52.8s` (`SHA-256` crystal stamp in Rust Lab), and `84.4s` (Final Hero Lockup resolve).
