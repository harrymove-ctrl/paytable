use serde_json::{json, Value};

use crate::domain::{
    LedgerRow, LinkedWallet, McpToolDescriptor, RunStatus, RunStep, ScheduleMilestone, StepState,
    TabletopRun, TrackKind,
};
use crate::paypal::{deterministic_receipt, SettlementReceipt};
use crate::policy::{compute_mandate_hash, sanitize_reporting_timestamp};

pub fn default_linked_wallet() -> LinkedWallet {
    LinkedWallet {
        wallet_id: "wlt_agent_linked_01".to_string(),
        owner_handle: "harrymove-ctrl".to_string(),
        agent_handle: "@paytable".to_string(),
        paypal_sandbox_buyer: "buyer-linked-wallet@paytable.dev".to_string(),
        paypal_sandbox_merchant: "merchant-sandbox@paytable.dev".to_string(),
        funding_source: "PayPal Linked Balance + Visa *1881".to_string(),
        approval_mode: "EVERY_PURCHASE".to_string(),
        max_per_purchase_usd: 500.00,
        daily_cap_usd: 1500.00,
        daily_spent_usd: 408.00,
    }
}

pub fn build_staged_run(
    run_id: &str,
    track: TrackKind,
    prompt: &str,
    amount_usd: f64,
    created_at: &str,
) -> TabletopRun {
    let (job_name, display_currency, display_amount, partitions_done, partitions_total, steps, widget) =
        match track {
            TrackKind::AgentLinkedCheckout => (
                "linked-wallet-checkout",
                "USD",
                format!("${amount_usd:.2}"),
                3,
                5,
                vec![
                    RunStep {
                        id: "step_1".into(),
                        label: "Verify wallet".into(),
                        detail: "wlt_agent_linked_01 · Visa *1881 · cap $500.00".into(),
                        state: StepState::Done,
                        tab: None,
                        word: Some("Done".into()),
                        duration_ms: Some(280),
                        output: Some("Linked wallet mandate active. Approval mode: EVERY_PURCHASE.".into()),
                    },
                    RunStep {
                        id: "step_2".into(),
                        label: "Search catalog".into(),
                        detail: "channel3.search(\"Dell UltraSharp 27 USB-C\")".into(),
                        state: StepState::Done,
                        tab: None,
                        word: Some("Done".into()),
                        duration_ms: Some(640),
                        output: Some("Matched SKU DELL-U2723QE across 3 verified merchants.".into()),
                    },
                    RunStep {
                        id: "step_3".into(),
                        label: "Negotiate quote".into(),
                        detail: format!("a2a.counter_offer($310.00 -> ${amount_usd:.2})"),
                        state: StepState::Done,
                        tab: None,
                        word: Some("Done".into()),
                        duration_ms: Some(920),
                        output: Some(format!(
                            "Merchant agent accepted ${amount_usd:.2} with free 2-day courier."
                        )),
                    },
                    RunStep {
                        id: "step_4".into(),
                        label: "Approve purchase".into(),
                        detail: format!("paypal.linked_wallet.authorize(${amount_usd:.2})"),
                        state: StepState::Waiting,
                        tab: Some("Needs approval".into()),
                        word: None,
                        duration_ms: None,
                        output: Some(format!(
                            "Paused on human owner: confirm ${amount_usd:.2} charge on linked PayPal wallet before capture."
                        )),
                    },
                    RunStep {
                        id: "step_5".into(),
                        label: "Settle order".into(),
                        detail: "POST /v2/checkout/orders + /v1/shipping/trackers-batch".into(),
                        state: StepState::Queued,
                        tab: None,
                        word: Some("Queued".into()),
                        duration_ms: None,
                        output: None,
                    },
                ],
                json!({
                    "kind": "agent_linked_checkout",
                    "headline": "Dell UltraSharp 27 4K USB-C Hub Monitor",
                    "sku": "DELL-U2723QE-SBX",
                    "list_price_usd": 310.00,
                    "negotiated_price_usd": amount_usd,
                    "savings_usd": (310.00 - amount_usd).max(0.0),
                    "wallet_badge": "Linked Agent Wallet · Approval Required",
                    "quotes": [
                        { "vendor": "B&H Studio Sandbox", "quote_usd": 309.00, "shipping": "3d ground", "selected": false },
                        { "vendor": "Adorama Pro Sandbox", "quote_usd": 289.00, "shipping": "2d air", "selected": false },
                        { "vendor": "Dell Direct A2A Desk", "quote_usd": amount_usd, "shipping": "Next-day tracked", "selected": true }
                    ],
                    "post_settlement_hook": "Auto-registers Shipment Tracking v1 + $25 studio installer payout on delivery"
                }),
            ),
            TrackKind::GroupDinnerSplit => {
                let per_share = [
                    ("Maya Lin", 0.274),
                    ("Liam Park", 0.247),
                    ("Noah Patel", 0.229),
                    ("Elena Rostova", 0.250),
                ];
                let shares: Vec<Value> = per_share
                    .iter()
                    .map(|(name, ratio)| {
                        json!({
                            "member": name,
                            "share_usd": ((amount_usd * ratio) * 100.0).round() / 100.0,
                            "channel": "PayPal QR + Phone Instant"
                        })
                    })
                    .collect();
                (
                    "group-dinner-split",
                    "USD",
                    format!("${amount_usd:.2}"),
                    3,
                    5,
                    vec![
                        RunStep {
                            id: "step_1".into(),
                            label: "Scan receipt".into(),
                            detail: "vision.ocr(\"district_table_receipt_04.jpg\")".into(),
                            state: StepState::Done,
                            tab: None,
                            word: Some("Done".into()),
                            duration_ms: Some(510),
                            output: Some("Extracted 7 line items, tax $14.20, tip $26.80.".into()),
                        },
                        RunStep {
                            id: "step_2".into(),
                            label: "Split shares".into(),
                            detail: format!("tabletop.allocate(4 diners, ${amount_usd:.2})"),
                            state: StepState::Done,
                            tab: None,
                            word: Some("Done".into()),
                            duration_ms: Some(190),
                            output: Some("Assigned itemized shares across 4 tabletop participants.".into()),
                        },
                        RunStep {
                            id: "step_3".into(),
                            label: "Draft QR".into(),
                            detail: "POST /v2/invoicing/invoices + /generate-qr-code".into(),
                            state: StepState::Done,
                            tab: None,
                            word: Some("Done".into()),
                            duration_ms: Some(430),
                            output: Some("Prepared PayPal Invoicing v2 QR payload for tabletop scan.".into()),
                        },
                        RunStep {
                            id: "step_4".into(),
                            label: "Approve split".into(),
                            detail: format!("paypal.invoicing.authorize(${amount_usd:.2})"),
                            state: StepState::Waiting,
                            tab: Some("Needs approval".into()),
                            word: None,
                            duration_ms: None,
                            output: Some("Waiting for host confirmation before dispatching QR requests and restaurant settlement.".into()),
                        },
                        RunStep {
                            id: "step_5".into(),
                            label: "Disburse settlement".into(),
                            detail: "POST /v1/payments/payouts (instant phone/email)".into(),
                            state: StepState::Queued,
                            tab: None,
                            word: Some("Queued".into()),
                            duration_ms: None,
                            output: None,
                        },
                    ],
                    json!({
                        "kind": "group_dinner_split",
                        "venue": "District Table Kitchen",
                        "total_usd": amount_usd,
                        "qr_code_label": "SCAN TO SETTLE SHARE · PAYPAL INVOICING V2",
                        "shares": shares
                    }),
                )
            }
            TrackKind::MultiCurrencyInvoice => {
                let eur_amount = ((amount_usd / 1.08) * 100.0).round() / 100.0;
                let pay_later = ((amount_usd / 4.0) * 100.0).round() / 100.0;
                (
                    "fx-creator-invoice",
                    "EUR -> USD",
                    format!("EUR {eur_amount:.2} (${amount_usd:.2})"),
                    3,
                    5,
                    vec![
                        RunStep {
                            id: "step_1".into(),
                            label: "Lock FX rate".into(),
                            detail: format!("EUR {eur_amount:.2} -> USD ${amount_usd:.2} @ 1.0800"),
                            state: StepState::Done,
                            tab: None,
                            word: Some("Done".into()),
                            duration_ms: Some(240),
                            output: Some("Locked Sandbox multi-currency quote with zero hidden spread.".into()),
                        },
                        RunStep {
                            id: "step_2".into(),
                            label: "Attach Pay Later".into(),
                            detail: format!("4x ${pay_later:.2} interest-free schedule"),
                            state: StepState::Done,
                            tab: None,
                            word: Some("Done".into()),
                            duration_ms: Some(310),
                            output: Some("Enabled PayPal Pay Later 4-installment checkout option.".into()),
                        },
                        RunStep {
                            id: "step_3".into(),
                            label: "Compute split".into(),
                            detail: "60% lead · 30% motion · 10% platform".into(),
                            state: StepState::Done,
                            tab: None,
                            word: Some("Done".into()),
                            duration_ms: Some(180),
                            output: Some("Verified marketplace revenue split allocations.".into()),
                        },
                        RunStep {
                            id: "step_4".into(),
                            label: "Approve invoice".into(),
                            detail: format!("paypal.marketplace.authorize(${amount_usd:.2})"),
                            state: StepState::Waiting,
                            tab: Some("Needs approval".into()),
                            word: None,
                            duration_ms: None,
                            output: Some("Confirm multi-currency invoice dispatch and collaborator split rules.".into()),
                        },
                        RunStep {
                            id: "step_5".into(),
                            label: "Execute batch".into(),
                            detail: "POST /v2/invoicing/invoices + /v1/payments/payouts".into(),
                            state: StepState::Queued,
                            tab: None,
                            word: Some("Queued".into()),
                            duration_ms: None,
                            output: None,
                        },
                    ],
                    json!({
                        "kind": "multi_currency_invoice",
                        "client": "Studio Nord GmbH (Berlin)",
                        "invoice_eur": eur_amount,
                        "settled_usd": amount_usd,
                        "pay_later_installment_usd": pay_later,
                        "splits": [
                            { "role": "Lead Product Designer", "pct": 60, "usd": ((amount_usd * 0.60) * 100.0).round() / 100.0 },
                            { "role": "Motion Systems Partner", "pct": 30, "usd": ((amount_usd * 0.30) * 100.0).round() / 100.0 },
                            { "role": "PayTable Studio Fee", "pct": 10, "usd": ((amount_usd * 0.10) * 100.0).round() / 100.0 }
                        ]
                    }),
                )
            }
            TrackKind::ConsumerBudgetShield => {
                let start = sanitize_reporting_timestamp("2026-10-14T00:00:00.000Z");
                let end = sanitize_reporting_timestamp("2026-11-12T12:00:00.000Z");
                (
                    "budget-dispute-shield",
                    "USD",
                    format!("${amount_usd:.2}"),
                    3,
                    5,
                    vec![
                        RunStep {
                            id: "step_1".into(),
                            label: "Pull 30d ledger".into(),
                            detail: format!("GET /v1/reporting/transactions ({start}..{end})"),
                            state: StepState::Done,
                            tab: None,
                            word: Some("Done".into()),
                            duration_ms: Some(490),
                            output: Some("Normalized 42 Sandbox transactions using RFC3339 no-ms window.".into()),
                        },
                        RunStep {
                            id: "step_2".into(),
                            label: "Flag duplicate".into(),
                            detail: "CloudRender Pro billed twice ($29.00 x 2)".into(),
                            state: StepState::Done,
                            tab: None,
                            word: Some("Done".into()),
                            duration_ms: Some(270),
                            output: Some("Prepared Disputes v1 duplicate-billing evidence packet.".into()),
                        },
                        RunStep {
                            id: "step_3".into(),
                            label: "Stage request".into(),
                            detail: format!("paypal.payment_links.create(${amount_usd:.2})"),
                            state: StepState::Done,
                            tab: None,
                            word: Some("Done".into()),
                            duration_ms: Some(220),
                            output: Some("Generated chat-ready Request Money link for shared fiber internet.".into()),
                        },
                        RunStep {
                            id: "step_4".into(),
                            label: "Approve action".into(),
                            detail: format!("paypal.consumer.authorize(${amount_usd:.2})"),
                            state: StepState::Waiting,
                            tab: Some("Needs approval".into()),
                            word: None,
                            duration_ms: None,
                            output: Some("Approve duplicate-charge hold and publish household Request Money link.".into()),
                        },
                        RunStep {
                            id: "step_5".into(),
                            label: "Publish link".into(),
                            detail: "Payment Link active + Disputes v1 hold registered".into(),
                            state: StepState::Queued,
                            tab: None,
                            word: Some("Queued".into()),
                            duration_ms: None,
                            output: None,
                        },
                    ],
                    json!({
                        "kind": "consumer_budget_shield",
                        "reporting_window": format!("{start} to {end}"),
                        "duplicate_saved_usd": 29.00,
                        "request_money_usd": amount_usd,
                        "categories": [
                            { "category": "Infrastructure & Cloud", "spent_usd": 184.00, "share_pct": 44 },
                            { "category": "Household Utilities", "spent_usd": 148.00, "share_pct": 35 },
                            { "category": "Subscriptions (1 duplicate)", "spent_usd": 88.00, "share_pct": 21 }
                        ]
                    }),
                )
            }
            TrackKind::CommunitySolarPool => (
                "solar-impact-pool",
                "USD",
                format!("${amount_usd:.2}"),
                3,
                5,
                vec![
                    RunStep {
                        id: "step_1".into(),
                        label: "Verify charities".into(),
                        detail: "3 verified 501(c)(3) & co-op Sandbox receivers".into(),
                        state: StepState::Done,
                        tab: None,
                        word: Some("Done".into()),
                        duration_ms: Some(310),
                        output: Some("Confirmed screen-reader labels and tax-receipt metadata.".into()),
                    },
                    RunStep {
                        id: "step_2".into(),
                        label: "Allocate causes".into(),
                        detail: "40% Solar Co-op · 35% Microloans · 25% Cleanup".into(),
                        state: StepState::Done,
                        tab: None,
                        word: Some("Done".into()),
                        duration_ms: Some(195),
                        output: Some("Computed zero-fee community impact split.".into()),
                    },
                    RunStep {
                        id: "step_3".into(),
                        label: "Check mandate".into(),
                        detail: format!("wallet.remaining_daily >= ${amount_usd:.2}"),
                        state: StepState::Done,
                        tab: None,
                        word: Some("Done".into()),
                        duration_ms: Some(140),
                        output: Some("Within daily linked-wallet budget cap.".into()),
                    },
                    RunStep {
                        id: "step_4".into(),
                        label: "Approve donation".into(),
                        detail: format!("paypal.donations.authorize(${amount_usd:.2})"),
                        state: StepState::Waiting,
                        tab: Some("Needs approval".into()),
                        word: None,
                        duration_ms: None,
                        output: Some("Human approval required before pooling and disbursing to field partners.".into()),
                    },
                    RunStep {
                        id: "step_5".into(),
                        label: "Disburse causes".into(),
                        detail: "POST /v2/checkout/orders + /v1/payments/payouts".into(),
                        state: StepState::Queued,
                        tab: None,
                        word: Some("Queued".into()),
                        duration_ms: None,
                        output: None,
                    },
                ],
                json!({
                    "kind": "community_solar_pool",
                    "pool_name": "Block 14 Solar & Resilience Pool",
                    "total_usd": amount_usd,
                    "accessibility": "AAA Screen-Reader & Keyboard First",
                    "causes": [
                        { "cause": "Block 14 Rooftop Solar Co-op", "pct": 40, "usd": ((amount_usd * 0.40) * 100.0).round() / 100.0 },
                        { "cause": "Underbanked Micro-Builder Fund", "pct": 35, "usd": ((amount_usd * 0.35) * 100.0).round() / 100.0 },
                        { "cause": "Harbor Plastic Recovery Partner", "pct": 25, "usd": ((amount_usd * 0.25) * 100.0).round() / 100.0 }
                    ]
                }),
            ),
        };

    TabletopRun {
        run_id: run_id.to_string(),
        track,
        track_title: track.title().to_string(),
        track_category: track.category().to_string(),
        job_name: job_name.to_string(),
        prompt: prompt.to_string(),
        merchant: track.merchant_label().to_string(),
        amount_usd,
        display_currency: display_currency.to_string(),
        display_amount,
        status: RunStatus::AwaitingApproval,
        partitions_done,
        partitions_total,
        workers_active: 3,
        workers_total: 4,
        failed_checks: 0,
        left_label: "1 human gate".to_string(),
        elapsed_ms: 1940,
        paypal_capabilities: track
            .paypal_capabilities()
            .into_iter()
            .map(str::to_string)
            .collect(),
        steps,
        widget,
        paypal_order_id: None,
        paypal_capture_id: None,
        paypal_invoice_id: None,
        paypal_payout_batch_id: None,
        paypal_tracker_id: None,
        mandate_hash: None,
        execution_mode: "awaiting_human_approval".to_string(),
        approver: None,
        error_code: None,
        error_message: None,
        created_at: created_at.to_string(),
        settled_at: None,
    }
}

pub fn apply_settlement_to_run(
    run: &mut TabletopRun,
    receipt: SettlementReceipt,
    approver: &str,
    mandate_hash: String,
    settled_at: &str,
) {
    run.status = RunStatus::ApprovedSettled;
    run.partitions_done = run.partitions_total;
    run.workers_active = run.workers_total;
    run.left_label = "0 remaining".to_string();
    run.elapsed_ms += 620;
    run.execution_mode = receipt.execution_mode;
    run.paypal_order_id = receipt.paypal_order_id;
    run.paypal_capture_id = receipt.paypal_capture_id;
    run.paypal_invoice_id = receipt.paypal_invoice_id;
    run.paypal_payout_batch_id = receipt.paypal_payout_batch_id;
    run.paypal_tracker_id = receipt.paypal_tracker_id;
    run.mandate_hash = Some(mandate_hash.clone());
    run.approver = Some(approver.to_string());
    run.settled_at = Some(settled_at.to_string());

    if let Some(step4) = run.steps.get_mut(3) {
        step4.state = StepState::Done;
        step4.tab = None;
        step4.word = Some("Done".to_string());
        step4.duration_ms = Some(180);
        step4.output = Some(format!(
            "Approved by {approver}. SHA-256 mandate: {}...",
            &mandate_hash[..16]
        ));
    }
    if let Some(step5) = run.steps.get_mut(4) {
        step5.state = StepState::Done;
        step5.tab = None;
        step5.word = Some("Done".to_string());
        step5.duration_ms = Some(440);
        step5.output = Some(format!(
            "Settled in PayPal Sandbox ({}) · Ref {}",
            run.execution_mode, receipt.primary_ref
        ));
    }
}

pub fn apply_failure_to_run(run: &mut TabletopRun, code: &str, message: &str) {
    run.status = RunStatus::Failed;
    run.failed_checks = 1;
    run.left_label = "retry required".to_string();
    run.error_code = Some(code.to_string());
    run.error_message = Some(message.to_string());

    if let Some(step4) = run.steps.get_mut(3) {
        step4.state = StepState::Done;
        step4.tab = None;
        step4.word = Some("Done".to_string());
        step4.duration_ms = Some(150);
    }
    if let Some(step5) = run.steps.get_mut(4) {
        step5.state = StepState::Failed;
        step5.tab = Some("Settlement failed".to_string());
        step5.word = None;
        step5.duration_ms = Some(390);
        step5.output = Some(format!("{code}: {message}"));
    }
}

pub fn run_to_ledger_row(run: &TabletopRun) -> LedgerRow {
    let primary_ref = run
        .paypal_order_id
        .clone()
        .or_else(|| run.paypal_invoice_id.clone())
        .or_else(|| run.paypal_payout_batch_id.clone())
        .unwrap_or_else(|| "PENDING-GATE".to_string());
    LedgerRow {
        id: format!("ldg_{}", run.run_id),
        timestamp: run
            .settled_at
            .clone()
            .unwrap_or_else(|| run.created_at.clone()),
        run_id: run.run_id.clone(),
        track_code: run.track.code().to_string(),
        track_title: run.track_title.clone(),
        counterparty: run.merchant.clone(),
        paypal_capability: run.paypal_capabilities.join(" + "),
        amount_usd: run.amount_usd,
        currency_note: run.display_amount.clone(),
        approval_gate: run
            .approver
            .as_ref()
            .map(|a| format!("Approved ({a})"))
            .unwrap_or_else(|| "Needs approval".to_string()),
        paypal_ref: primary_ref,
        mandate_hash: run
            .mandate_hash
            .clone()
            .unwrap_or_else(|| "awaiting_signature".to_string()),
        status: match run.status {
            RunStatus::AwaitingApproval => "awaiting_approval",
            RunStatus::ApprovedSettled => "settled",
            RunStatus::Rejected => "rejected",
            RunStatus::BlockedPolicy => "blocked_policy",
            RunStatus::Failed => "failed",
        }
        .to_string(),
    }
}

pub fn seed_runs() -> (Vec<TabletopRun>, String) {
    let genesis = "0000000000000000000000000000000000000000000000000000000000000000".to_string();

    let mut dinner = build_staged_run(
        "run_88a1f0",
        TrackKind::GroupDinnerSplit,
        TrackKind::GroupDinnerSplit.default_prompt(),
        168.00,
        "2026-11-12T06:40:00Z",
    );
    let rec1 = deterministic_receipt(&dinner.run_id, dinner.track);
    let hash1 = compute_mandate_hash(
        &genesis,
        &dinner.run_id,
        dinner.track.slug(),
        dinner.amount_usd,
        "harrymove-ctrl",
        &rec1.primary_ref,
    );
    apply_settlement_to_run(
        &mut dinner,
        rec1,
        "harrymove-ctrl",
        hash1.clone(),
        "2026-11-12T06:41:12Z",
    );

    let mut solar = build_staged_run(
        "run_89b4c2",
        TrackKind::CommunitySolarPool,
        TrackKind::CommunitySolarPool.default_prompt(),
        240.00,
        "2026-11-12T07:02:00Z",
    );
    let rec2 = deterministic_receipt(&solar.run_id, solar.track);
    let hash2 = compute_mandate_hash(
        &hash1,
        &solar.run_id,
        solar.track.slug(),
        solar.amount_usd,
        "harrymove-ctrl",
        &rec2.primary_ref,
    );
    apply_settlement_to_run(
        &mut solar,
        rec2,
        "harrymove-ctrl",
        hash2.clone(),
        "2026-11-12T07:03:05Z",
    );

    let awaiting = build_staged_run(
        "run_91c0d4",
        TrackKind::AgentLinkedCheckout,
        TrackKind::AgentLinkedCheckout.default_prompt(),
        265.00,
        "2026-11-12T07:18:00Z",
    );

    (vec![awaiting, solar, dinner], hash2)
}

pub fn default_schedule() -> Vec<ScheduleMilestone> {
    vec![
        ScheduleMilestone {
            id: "ms_01".into(),
            track_code: "01".into(),
            milestone: "Channel3 Monitor Procurement + Carrier Tracker".into(),
            owner: "@paytable · buyer-linked".into(),
            window: "09:00 to 10:30 UTC".into(),
            progress_pct: 60,
            amount_usd: 265.00,
            gate_state: "Needs approval".into(),
            paypal_api: "Orders v2 + Tracking v1".into(),
        },
        ScheduleMilestone {
            id: "ms_02".into(),
            track_code: "02".into(),
            milestone: "4-Diner Receipt QR Split & Instant Payout".into(),
            owner: "District Table Group".into(),
            window: "10:30 to 11:15 UTC".into(),
            progress_pct: 100,
            amount_usd: 168.00,
            gate_state: "Settled".into(),
            paypal_api: "Invoicing v2 + QR + Payouts v1".into(),
        },
        ScheduleMilestone {
            id: "ms_03".into(),
            track_code: "03".into(),
            milestone: "Berlin EUR 420 Sprint + 60/30/10 Creator Split".into(),
            owner: "Studio Nord GmbH".into(),
            window: "12:00 to 14:00 UTC".into(),
            progress_pct: 40,
            amount_usd: 453.60,
            gate_state: "Ready to stage".into(),
            paypal_api: "Invoicing v2 + Pay Later + Payouts v1".into(),
        },
        ScheduleMilestone {
            id: "ms_04".into(),
            track_code: "04".into(),
            milestone: "30-Day Subscription Shield & Utility Link".into(),
            owner: "Household Budget Guard".into(),
            window: "14:00 to 15:00 UTC".into(),
            progress_pct: 80,
            amount_usd: 74.00,
            gate_state: "Protected".into(),
            paypal_api: "Reporting v1 + Payment Links + Disputes v1".into(),
        },
        ScheduleMilestone {
            id: "ms_05".into(),
            track_code: "05".into(),
            milestone: "Block 14 Solar Co-op & Field Disbursement".into(),
            owner: "Community Solar Pool".into(),
            window: "15:30 to 17:00 UTC".into(),
            progress_pct: 100,
            amount_usd: 240.00,
            gate_state: "Settled".into(),
            paypal_api: "Donations + Batch Payouts v1".into(),
        },
    ]
}

pub fn default_mcp_tools() -> Vec<McpToolDescriptor> {
    vec![
        McpToolDescriptor {
            tool_name: "paypal.orders.create_linked_capture".into(),
            paypal_endpoint: "POST /v2/checkout/orders".into(),
            apimatic_method: "ordersController.createOrder(payPalRequestId, body)".into(),
            requires_human_approval: true,
            summary: "Stages and captures a linked-wallet order only after human owner signature.".into(),
        },
        McpToolDescriptor {
            tool_name: "paypal.invoicing.create_and_qr".into(),
            paypal_endpoint: "POST /v2/invoicing/invoices/{id}/generate-qr-code".into(),
            apimatic_method: "invoicesController.invoicesGenerateQrCode(invoiceId)".into(),
            requires_human_approval: true,
            summary: "Generates multi-currency or dinner-split invoices with scannable Base64 QR.".into(),
        },
        McpToolDescriptor {
            tool_name: "paypal.payouts.create_batch".into(),
            paypal_endpoint: "POST /v1/payments/payouts".into(),
            apimatic_method: "payoutsController.createBatchPayout(body)".into(),
            requires_human_approval: true,
            summary: "Disburses contractor, creator-split, and nonprofit field-partner payouts.".into(),
        },
        McpToolDescriptor {
            tool_name: "paypal.reporting.list_transactions".into(),
            paypal_endpoint: "GET /v1/reporting/transactions".into(),
            apimatic_method: "transactionSearchController.listTransactions(startDate, endDate)".into(),
            requires_human_approval: false,
            summary: "Read-only 31-day transaction categorizer and duplicate-subscription detector.".into(),
        },
        McpToolDescriptor {
            tool_name: "paypal.tracking.register_batch".into(),
            paypal_endpoint: "POST /v1/shipping/trackers-batch".into(),
            apimatic_method: "trackersBatchController.createTrackersBatch(body)".into(),
            requires_human_approval: false,
            summary: "Links carrier tracking numbers to settled linked-wallet orders.".into(),
        },
    ]
}
