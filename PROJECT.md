# PayTable Project Architecture & Verification Matrix

## Central Propositions

1. **Agentic autonomy requires a deterministic human spend gate**: PayTable separates read-only catalog search and quote negotiation from irreversible money movement so an AI agent prepares the work while the human wallet owner signs every purchase.
2. **Infrastructure clarity beats decorative fintech clutter**: Applying Sodium's `0px` square frames, `1px` rules, mono telemetry strips, and explicit `Needs approval` step boxes lets a user verify merchant, cap utilization, and PayPal capability in under two seconds.
3. **One protocol powers five everyday money workflows**: The same `Stage -> Policy Check -> Human Approval -> SHA-256 Mandate -> PayPal Sandbox Settlement -> AG Grid Reconciliation` pipeline runs across autonomous shopping, receipt QR splitting, multi-currency creator billing, subscription protection, and community impact pooling.

## Claim and Evidence Matrix

| Claim | Verification Artifact | Status |
| --- | --- | --- |
| Linked wallet defaults to `EVERY_PURCHASE` human approval | `backend-rust/src/lib.rs` (`initial_state_contains_linked_wallet_and_awaiting_approval_run`) | Verified (`PASS`) |
| Duplicate approval replay returns `409 DUPLICATE_APPROVAL_KEY` | `backend-rust/src/lib.rs` (`stage_and_approve_linked_wallet_purchase_settles_with_mandate_hash_and_blocks_replay`) | Verified (`PASS`) |
| Overspend above `$500.00` cap fails closed (`422`) | `backend-rust/src/lib.rs` (`overspend_above_per_purchase_cap_fails_closed_at_policy_gate`) | Verified (`PASS`) |
| Declined card (`INSTRUMENT_DECLINED`) leaves settled total unchanged | `backend-rust/src/lib.rs` (`simulated_card_decline_marks_run_failed_without_incrementing_settled_total`) | Verified (`PASS`) |
| All 5 PayPal Developer Hackathon tracks stage and settle | `backend-rust/src/lib.rs` (`all_five_devpost_tracks_stage_and_settle_cleanly`) + `web/e2e/paytable.spec.ts` | Verified (`PASS`) |
| Zero horizontal overflow (`1440px`, `1280px`, `390px`) & zero em-dashes | `web/e2e/paytable.spec.ts` + `docs/qa/*.png` + `docs/qa/after-flow.webm` | Verified (`PASS`) |
