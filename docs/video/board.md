# PayTable Cinetic Storyboard & Seam Map

## Visual Constants (`cinetic` + `Sodium`)

1. **Ground**: `#141412` (`--page`), `#1c1b19` (`--panel`), `#2c2a25` (`--line`), `#ffd400` (`--accent`), `#ff9a52` (`--warn`), `#8cc79a` (`--ok`).
2. **Typography**: `Inter Display` (`400`) for statements and captions; `Commit Mono` (`400`) uppercase for `[STEP]` labels, telemetry headers, and tabular USD readouts.
3. **Carried Seam Element**: A `1px` horizontal rule at `y = 540px` opens Scene 01, expands into the `Frame` border in Scene 02, steps down the dashed `ToolCallStack` spine in Scene 03, wipes across the `5 / 5` segmented progress bar in Scene 04, frames the 5-track carousel in Scene 05, anchors the AG Grid header in Scene 06, and collapses into the square PayTable mark in Scene 07.
4. **Zero-Freeze Contract**: Every frame has active sub-pixel plate drift (`scale 1.0 -> 1.032`), live tabular numeral interpolation, or kinetic word entrance so `ffmpeg freezedetect` reports `0.0s` of frozen gaps.
