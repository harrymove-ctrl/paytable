# PayTable v2.0 Visual Style Analysis, Color Palette, Character Rigs & Storyboard

## 1. Color Palette System (HEX)

| Act / World | Deep Ground | Midground Surface | Primary Accent | Secondary Accent | Semantic Highlight |
| --- | --- | --- | --- | --- | --- |
| **Act 01 · Cosmic Opening** | `#09134B` | `#180A59` / `#243CDB` | `#22D7DA` (Cyan) | `#FFD244` (Solar Gold) | `#FF4D6D` (Card Block) |
| **Act 02 · Guided Tabletop** | `#141412` | `#1C1B19` / `#22211E` | `#FFD244` (Sodium Gold) | `#22D7DA` (Agent Cyan) | `#FF9A52` (Needs Approval) |
| **Act 03 · Rust Vault Lab** | `#071235` | `#0B1D51` / `#1D4ED8` | `#22D7DA` (Reagent Cyan) | `#FF851D` (Human Switch) | `#3DD68C` (SHA-256 Seal) |
| **Act 04 · Everyday Tracks** | `#0D0636` | `#180A59` / `#3B1C8C` | `#33B9D7` (QR Cyan) | `#ED4BA4` (Creator Pink) | `#FFD244` (Pay Later) |
| **Act 05 · Warm asciicn World** | `#1C0D18` | `#3E1524` / `#8C2D19` | `#FF851D` (Sunset Orange) | `#FFD244` (ASCII Gold) | `#ED4BA4` (Horizon Rose) |
| **Act 06 · Hero Lockup** | `#0B0D16` | `#121526` / `#1F35B8` | `#FFD244` (CTA Gold) | `#22D7DA` (Globe Cyan) | `#3DD68C` (MIT Ready) |

## 2. Original 2D Rigged Character System (`video/src/CharacterRig.tsx`)

1. **Pip (`PipAgentRig`, The Courier Orb-Finch Agent)**:
   1. **Separated SVG Layers**: Contact shadow, articulated legs, squash-and-stretch capsule body (`#22D7DA` with `#9CF4F5` belly and Linked Wallet chest emblem), lagged back wing, neck-pivoted head (`+/- 3` to `7` degrees), tracking pupils with blinking eyelids (`186`-frame cycle), two-part word-synced geometric beak (`#FFD244` / `#FF851D`), and foreground pointing/cheering wing (`4`-frame follow-through lag).
2. **Vaulty (`VaultyGuardianRig`, The Octagonal Rust Vault Guardian)**:
   1. **Separated SVG Layers**: Hover shadow, pulsing thruster plume, left & right articulated arms (`halt`, `point`, `stamp`, `cheer`), chamfered octagonal body (`#243CDB`) with rotating `6`-spoke mandate dial (`#FF851D` armed, `#FF4D6D` blocked, `#3DD68C` approved), visored crown with antenna orb, blinking LED eyes (`210`-frame cycle), and 4-bar word-synced equalizer mouth.

## 3. Camera & Transition Choreography (`video/src/ParallaxWorld.tsx`)

1. **3-Layer Parallax + Foreground Vignette**: Layer 1 (`0.34x`) renders starfields, blueprint grids, and deterministic `asciicn` `<canvas>` shaders; Layer 2 (`0.68x`) renders orbital wallet rings, bubbling reagent cylinders, and warm geometric trees; Layer 3 (`1.00x`) holds characters and product plates; Layer 4 (`1.22x`) adds atmospheric depth framing.
2. **Non-Repeating Act Transitions (`ActTransitionOverlay`)**:
   1. `18.0s` (`frame 1080`): `color_wipe` (3-band angled `#FFD244 / #22D7DA / #243CDB` ribbon sweep)
   2. `42.0s` (`frame 2520`): `whip_pan` (high-velocity `#22D7DA / #FF851D` kinetic streak sweep)
   3. `58.0s` (`frame 3480`): `portal_iris` (expanding circular `#FFD244 / #ED4BA4` iris ring)
   4. `72.0s` (`frame 4320`): `diagonal_shutter` (warm `#FF851D / #FFD244` angled shutter)
   5. `84.0s` (`frame 5040`): `color_wipe` into final hero composition
