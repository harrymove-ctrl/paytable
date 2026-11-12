# PayTable Cinematic Product Demo Script

## Overview

1. **Master Hackathon Cut (`paytable-hackathon-master.mp4`)**: `1:20` (`2400` frames at `30fps`, `1920x1080`), strictly under the `3:00` Devpost limit.
2. **X Launch Cut (`paytable-x-launch.mp4`)**: `0:40` (`1200` frames at `30fps`, `1920x1080`).
3. **Design Direction (`Leonxlnx/cinetic` + `Sodium`)**: Carbon `#141412` ground, sharp `0px` square geometry, `1px` `#2c2a25` structural rules, centered middle-band kinetic typography (`Inter Display` + `Commit Mono`), one `#ffd400` sodium-yellow focal action, carried horizontal rule spine across scene transitions, and live captured PayTable UI plates paired with macro Sodium step choreography.
4. **Voice Engine**: ElevenLabs `eleven_multilingual_v2` (`scripts/synthesize_elevenlabs_voice.py`) with automatic offline studio voiceover fallback when `ELEVENLABS_API_KEY` is unset.

## Scene-by-Scene Narration & Visuals

| Scene | Time | Frames | Spoken Narration | Visual Beat |
| --- | --- | --- | --- | --- |
| `01` | `0:00` to `0:09` | `0..270` | PayPal just opened a huge door. New linked wallets for agents mean an AI agent can spend on your behalf, with approval on every purchase. | Centered `cinetic` statement card on `#141412` carbon ground; `APPROVAL ON EVERY PURCHASE` locks in `#ffd400` sodium yellow with a `1px` rule wipe. |
| `02` | `0:09` to `0:19` | `270..570` | Meet PayTable. One shared tabletop where you prompt at paytable to shop, split group bills, invoice overseas clients, and move real money. | Carried rule expands into the live PayTable header, `StatusStrip`, and `@paytable` prompt bar typing the studio monitor procurement request. |
| `03` | `0:19` to `0:33` | `570..990` | Watch an agent source a studio monitor across three merchants, negotiate the price down to two hundred sixty five dollars, and pause right at the orange human gate. | Macro Sodium `ToolCallStack` builds `[VERIFY WALLET]`, `[SEARCH CATALOG]`, and `[NEGOTIATE QUOTE]`, then halts on `[APPROVE PURCHASE]` with the orange `NEEDS APPROVAL` tab. |
| `04` | `0:33` to `0:46` | `990..1380` | Nothing leaves your PayPal wallet until you click Approve. One tap signs a cryptographic mandate, captures the Sandbox order, and locks carrier tracking. | Cursor presses `APPROVE $265.00 PURCHASE`; segmented gates fill `5 / 5`, settled total glides to `$673.00`, and the SHA-256 mandate `<dialog>` reveals `ORD-SBX`. |
| `05` | `0:46` to `1:00` | `1380..1800` | Switch presets in one click: scan a dinner receipt into PayPal QR shares, bill Berlin in euros with Pay Later, flag duplicate subscriptions, or pool neighborhood solar funds. | Crisp horizontal diptych gliding across real captured plates: 4-diner PayPal QR split (`$168.00`), Berlin `EUR 420` `4x` Pay Later creator split, and Block 14 Solar Pool (`$240.00`). |
| `06` | `1:00` to `1:12` | `1800..2160` | Every run reconciles live in AG Grid, while the Rust engine blocks overspend caps, catches card declines, and rejects duplicate replay keys. | Live AG Grid v36 ledger plate + APIMatic & PayPal MCP contracts + Rust `422` / `409` / `502` guardrail telemetry callouts. |
| `07` | `1:12` to `1:20` | `2160..2400` | PayTable. Linked PayPal wallets for AI agents, with human approval on every purchase. | Minimalist Sodium end lockup with geometric PayTable emblem, GitHub open-source badge, and `PayPal Developer Sandbox` verification line. |
