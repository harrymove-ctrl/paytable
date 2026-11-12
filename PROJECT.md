# PayTable v2.0 Project Architecture & Verification Matrix

## Central Propositions

1. **Agentic autonomy requires a deterministic human spend gate**: PayTable separates read-only catalog search and quote negotiation from irreversible money movement so an AI agent prepares the work while the human wallet owner tunes wallet caps (`POST /api/wallet/policy`) and approves every purchase.
2. **Guided interactive controls beat opaque prompts**: Combining a 4-step interactive onboarding banner, live per-track calculators (diner tip QR splits, `EUR/GBP/JPY/CAD` FX + `4x` Pay Later, duplicate-charge dispute holds, solar pool tiers), tactile Web Audio feedback, and Sodium's `0px` square telemetry frames lets any user understand and operate every workflow immediately.
3. **Composable `asciicn` shaders and dual-voice storytelling make infrastructure memorable**: Integrating `asciicn` (`3D Globe`, `3D Vault Torus`, `Topography`, `.txt/.svg/.png/.webm` export, and `.mcp.json` agent skill wiring) alongside a 60 FPS Kurzgesagt-inspired 2-voice product launch film turns backend settlement guardrails into tangible visual proof.

## Claim and Evidence Matrix

| Claim | Verification Artifact | Status |
| --- | --- | --- |
| Linked wallet defaults to `EVERY_PURCHASE` human approval | `backend-rust/src/lib.rs` (`initial_state_contains_linked_wallet_and_awaiting_approval_run`) | Verified (`PASS`) |
| Live wallet policy tuner updates caps & rejects invalid bounds (`422`) | `backend-rust/src/lib.rs` (`updating_linked_wallet_policy_enforces_new_caps_and_rejects_invalid_bounds`) | Verified (`PASS`) |
| Duplicate approval replay returns `409 DUPLICATE_APPROVAL_KEY` | `backend-rust/src/lib.rs` (`stage_and_approve_linked_wallet_purchase_settles_with_mandate_hash_and_blocks_replay`) | Verified (`PASS`) |
| Overspend above `$500.00` cap fails closed (`422`) | `backend-rust/src/lib.rs` (`overspend_above_per_purchase_cap_fails_closed_at_policy_gate`) | Verified (`PASS`) |
| Declined card (`INSTRUMENT_DECLINED`) leaves settled total unchanged | `backend-rust/src/lib.rs` (`simulated_card_decline_marks_run_failed_without_incrementing_settled_total`) | Verified (`PASS`) |
| All 5 PayPal tracks, 4-step guide, calculators, Web Audio & `asciicn` export pass E2E | `backend-rust/src/lib.rs` + `web/e2e/paytable.spec.ts` | Verified (`PASS`) |
| Zero horizontal overflow (`1600px`, `1280px`, `390px`) & zero em-dashes | `web/e2e/paytable.spec.ts` + `docs/qa/*.png` + `video/public/plates/plate-01..08.png` | Verified (`PASS`) |
