#![forbid(unsafe_code)]

pub mod domain;
pub mod paypal;
pub mod policy;
pub mod tracks;

use std::collections::HashSet;
use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::Deserialize;
use serde_json::{json, Value};
use tokio::sync::RwLock;
use tower_http::cors::{Any, CorsLayer};

use crate::domain::{LinkedWallet, RunStatus, StepState, TabletopRun, TrackKind, TrackPreset};
use crate::paypal::{PayPalConfig, PayPalGateway, SettlementError};
use crate::policy::{compute_mandate_hash, evaluate_linked_wallet_policy, verify_webhook_hmac};
use crate::tracks::{
    apply_failure_to_run, apply_settlement_to_run, build_staged_run, default_linked_wallet,
    default_mcp_tools, default_schedule, run_to_ledger_row, seed_runs,
};

pub struct EngineStore {
    pub wallet: LinkedWallet,
    pub runs: Vec<TabletopRun>,
    pub chain_head: String,
    pub seen_idempotency_keys: HashSet<String>,
    pub next_seq: u64,
}

impl EngineStore {
    pub fn seeded() -> Self {
        let (runs, chain_head) = seed_runs();
        Self {
            wallet: default_linked_wallet(),
            runs,
            chain_head,
            seen_idempotency_keys: HashSet::new(),
            next_seq: 1,
        }
    }
}

#[derive(Clone)]
pub struct AppState {
    pub store: Arc<RwLock<EngineStore>>,
    pub gateway: PayPalGateway,
    pub webhook_secret: String,
}

pub fn build_router() -> Router {
    build_router_with_config(PayPalConfig::deterministic())
}

pub fn build_router_from_env() -> Router {
    build_router_with_config(PayPalConfig::from_env())
}

pub fn build_router_with_config(config: PayPalConfig) -> Router {
    let webhook_secret = std::env::var("PAYPAL_WEBHOOK_HMAC_SECRET")
        .unwrap_or_else(|_| "paytable-sandbox-webhook-secret".to_string());
    let state = AppState {
        store: Arc::new(RwLock::new(EngineStore::seeded())),
        gateway: PayPalGateway::new(config),
        webhook_secret,
    };
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/api/health", get(health_handler))
        .route("/api/state", get(get_state_handler))
        .route("/api/state/reseed", post(reseed_handler))
        .route("/api/tracks", get(list_tracks_handler))
        .route("/api/runs/stage", post(stage_run_handler))
        .route("/api/runs/:run_id/approve", post(approve_run_handler))
        .route("/api/runs/:run_id/reject", post(reject_run_handler))
        .route("/api/mcp/tools", get(list_mcp_tools_handler))
        .route("/api/schedule", get(list_schedule_handler))
        .route("/api/webhooks/verify", post(verify_webhook_handler))
        .route("/api/paypal/live-verify", post(live_verify_handler))
        .layer(cors)
        .with_state(state)
}

async fn health_handler(State(state): State<AppState>) -> Json<Value> {
    Json(json!({
        "status": "ok",
        "service": "paytable-api",
        "approval_mode": "EVERY_PURCHASE",
        "live_credentials_configured": state.gateway.config.has_live_credentials()
    }))
}

async fn get_state_handler(State(state): State<AppState>) -> Json<Value> {
    let guard = state.store.read().await;
    serialize_snapshot(&guard, state.gateway.config.has_live_credentials())
}

async fn reseed_handler(State(state): State<AppState>) -> Json<Value> {
    let mut guard = state.store.write().await;
    *guard = EngineStore::seeded();
    serialize_snapshot(&guard, state.gateway.config.has_live_credentials())
}

fn serialize_snapshot(store: &EngineStore, live_configured: bool) -> Json<Value> {
    let awaiting_count = store
        .runs
        .iter()
        .filter(|r| r.status == RunStatus::AwaitingApproval)
        .count();
    let settled_total_usd: f64 = store
        .runs
        .iter()
        .filter(|r| r.status == RunStatus::ApprovedSettled)
        .map(|r| r.amount_usd)
        .sum();
    let ledger: Vec<_> = store.runs.iter().map(run_to_ledger_row).collect();
    let tracks: Vec<TrackPreset> = TrackKind::all().into_iter().map(TrackPreset::from).collect();

    Json(json!({
        "wallet": store.wallet,
        "awaiting_count": awaiting_count,
        "settled_total_usd": ((settled_total_usd * 100.0).round()) / 100.0,
        "chain_head": store.chain_head,
        "live_credentials_configured": live_configured,
        "runs": store.runs,
        "ledger": ledger,
        "tracks": tracks,
        "schedule": default_schedule(),
        "mcp_tools": default_mcp_tools()
    }))
}

async fn list_tracks_handler() -> Json<Value> {
    let tracks: Vec<TrackPreset> = TrackKind::all().into_iter().map(TrackPreset::from).collect();
    Json(json!({ "tracks": tracks }))
}

async fn list_mcp_tools_handler() -> Json<Value> {
    Json(json!({ "tools": default_mcp_tools() }))
}

async fn list_schedule_handler() -> Json<Value> {
    Json(json!({ "milestones": default_schedule() }))
}

#[derive(Debug, Deserialize)]
pub struct StageRunRequest {
    pub track: String,
    pub prompt: Option<String>,
    pub amount_usd: Option<f64>,
}

async fn stage_run_handler(
    State(state): State<AppState>,
    Json(req): Json<StageRunRequest>,
) -> (StatusCode, Json<Value>) {
    let Some(track) = TrackKind::from_slug(&req.track) else {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "code": "UNKNOWN_TRACK",
                "message": format!("Unsupported track slug '{}'", req.track)
            })),
        );
    };

    let amount_usd = req.amount_usd.unwrap_or_else(|| track.default_amount_usd());
    let prompt = req
        .prompt
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| track.default_prompt().to_string());

    let mut guard = state.store.write().await;
    if let Err(err) = evaluate_linked_wallet_policy(&guard.wallet, amount_usd) {
        return (
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(json!({
                "code": err.code(),
                "message": err.to_string(),
                "max_per_purchase_usd": guard.wallet.max_per_purchase_usd,
                "daily_remaining_usd": (guard.wallet.daily_cap_usd - guard.wallet.daily_spent_usd).max(0.0)
            })),
        );
    }

    let seq = guard.next_seq;
    guard.next_seq += 1;
    let run_id = format!("run_91c{:03x}", seq + 212);
    let created_at = format!("2026-11-12T07:{:02}:00Z", (20 + (seq % 38)));
    let run = build_staged_run(&run_id, track, &prompt, amount_usd, &created_at);
    guard.runs.insert(0, run.clone());

    (StatusCode::CREATED, Json(serde_json::to_value(run).unwrap()))
}

#[derive(Debug, Deserialize)]
pub struct ApproveRunRequest {
    pub idempotency_key: String,
    pub approver: Option<String>,
    pub simulate_decline: Option<bool>,
}

async fn approve_run_handler(
    State(state): State<AppState>,
    Path(run_id): Path<String>,
    Json(req): Json<ApproveRunRequest>,
) -> (StatusCode, Json<Value>) {
    let idem = req.idempotency_key.trim().to_string();
    if idem.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "code": "MISSING_IDEMPOTENCY_KEY",
                "message": "idempotency_key is required to authorize a linked-wallet purchase"
            })),
        );
    }

    let (track, amount_usd, prompt) = {
        let mut guard = state.store.write().await;
        if guard.seen_idempotency_keys.contains(&idem) {
            return (
                StatusCode::CONFLICT,
                Json(json!({
                    "code": "DUPLICATE_APPROVAL_KEY",
                    "message": format!("Approval key '{idem}' was already processed; replay blocked")
                })),
            );
        }
        let Some(run) = guard.runs.iter().find(|r| r.run_id == run_id) else {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({
                    "code": "RUN_NOT_FOUND",
                    "message": format!("Run '{run_id}' does not exist")
                })),
            );
        };
        if run.status != RunStatus::AwaitingApproval {
            return (
                StatusCode::CONFLICT,
                Json(json!({
                    "code": "RUN_NOT_AWAITING_APPROVAL",
                    "message": format!("Run '{run_id}' is already finalized")
                })),
            );
        }
        if let Err(err) = evaluate_linked_wallet_policy(&guard.wallet, run.amount_usd) {
            return (
                StatusCode::UNPROCESSABLE_ENTITY,
                Json(json!({
                    "code": err.code(),
                    "message": err.to_string()
                })),
            );
        }
        let snapshot = (run.track, run.amount_usd, run.prompt.clone());
        guard.seen_idempotency_keys.insert(idem.clone());
        snapshot
    };

    let approver = req
        .approver
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| "harrymove-ctrl".to_string());
    let simulate_decline = req.simulate_decline.unwrap_or(false);

    match state
        .gateway
        .settle_approved_run(&run_id, track, amount_usd, &prompt, simulate_decline)
        .await
    {
        Ok(receipt) => {
            let mut guard = state.store.write().await;
            let mandate_hash = compute_mandate_hash(
                &guard.chain_head,
                &run_id,
                track.slug(),
                amount_usd,
                &approver,
                &receipt.primary_ref,
            );
            guard.chain_head = mandate_hash.clone();
            guard.wallet.daily_spent_usd =
                ((guard.wallet.daily_spent_usd + amount_usd) * 100.0).round() / 100.0;

            if let Some(run) = guard.runs.iter_mut().find(|r| r.run_id == run_id) {
                apply_settlement_to_run(
                    run,
                    receipt,
                    &approver,
                    mandate_hash,
                    "2026-11-12T07:59:00Z",
                );
                return (StatusCode::OK, Json(serde_json::to_value(run.clone()).unwrap()));
            }
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "code": "STATE_DESYNC" })),
            )
        }
        Err(SettlementError::InstrumentDeclined) => {
            let mut guard = state.store.write().await;
            if let Some(run) = guard.runs.iter_mut().find(|r| r.run_id == run_id) {
                apply_failure_to_run(
                    run,
                    "INSTRUMENT_DECLINED",
                    "Linked card Visa *1881 was declined by issuer. Zero funds captured.",
                );
                return (
                    StatusCode::BAD_GATEWAY,
                    Json(json!({
                        "code": "INSTRUMENT_DECLINED",
                        "message": "Linked card Visa *1881 was declined by issuer. Zero funds captured.",
                        "run": run
                    })),
                );
            }
            (
                StatusCode::BAD_GATEWAY,
                Json(json!({ "code": "INSTRUMENT_DECLINED" })),
            )
        }
        Err(err) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({
                "code": "PAYPAL_UPSTREAM_ERROR",
                "message": err.to_string()
            })),
        ),
    }
}

#[derive(Debug, Deserialize)]
pub struct RejectRunRequest {
    pub reason: Option<String>,
}

async fn reject_run_handler(
    State(state): State<AppState>,
    Path(run_id): Path<String>,
    Json(req): Json<RejectRunRequest>,
) -> (StatusCode, Json<Value>) {
    let mut guard = state.store.write().await;
    let Some(run) = guard.runs.iter_mut().find(|r| r.run_id == run_id) else {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({ "code": "RUN_NOT_FOUND" })),
        );
    };
    run.status = RunStatus::Rejected;
    run.left_label = "stopped by owner".to_string();
    let note = req
        .reason
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| "Stopped at human approval gate".to_string());
    if let Some(step4) = run.steps.get_mut(3) {
        step4.state = StepState::Stopped;
        step4.tab = None;
        step4.word = Some("Stopped".to_string());
        step4.output = Some(note);
    }
    if let Some(step5) = run.steps.get_mut(4) {
        step5.state = StepState::Stopped;
        step5.word = Some("Stopped".to_string());
    }
    (StatusCode::OK, Json(serde_json::to_value(run.clone()).unwrap()))
}

#[derive(Debug, Deserialize)]
pub struct VerifyWebhookRequest {
    pub transmission_id: String,
    pub timestamp: String,
    pub payload: String,
    pub signature_hex: String,
}

async fn verify_webhook_handler(
    State(state): State<AppState>,
    Json(req): Json<VerifyWebhookRequest>,
) -> (StatusCode, Json<Value>) {
    let valid = verify_webhook_hmac(
        &state.webhook_secret,
        &req.transmission_id,
        &req.timestamp,
        &req.payload,
        &req.signature_hex,
    );
    if valid {
        (StatusCode::OK, Json(json!({ "verified": true })))
    } else {
        (
            StatusCode::UNAUTHORIZED,
            Json(json!({
                "verified": false,
                "code": "INVALID_WEBHOOK_SIGNATURE"
            })),
        )
    }
}

async fn live_verify_handler(State(state): State<AppState>) -> Json<Value> {
    Json(state.gateway.probe_live_sandbox().await)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::policy::{sanitize_reporting_timestamp, sign_webhook_hmac};
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use http_body_util::BodyExt;
    use serde_json::{json, Value};
    use tower::ServiceExt;

    async fn send_json(
        app: &Router,
        method: &str,
        uri: &str,
        body: Option<Value>,
    ) -> (StatusCode, Value) {
        let req_builder = Request::builder()
            .method(method)
            .uri(uri)
            .header("content-type", "application/json");
        let req = match body {
            Some(b) => req_builder.body(Body::from(b.to_string())).unwrap(),
            None => req_builder.body(Body::empty()).unwrap(),
        };
        let resp = app.clone().oneshot(req).await.unwrap();
        let status = resp.status();
        let bytes = resp.into_body().collect().await.unwrap().to_bytes();
        let val = serde_json::from_slice(&bytes).unwrap_or_else(|_| json!({}));
        (status, val)
    }

    #[tokio::test]
    async fn initial_state_contains_linked_wallet_and_awaiting_approval_run() {
        let app = build_router();
        let (status, body) = send_json(&app, "GET", "/api/state", None).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["wallet"]["approval_mode"], "EVERY_PURCHASE");
        assert!(body["awaiting_count"].as_u64().unwrap_or(0) >= 1);
    }

    #[tokio::test]
    async fn stage_and_approve_linked_wallet_purchase_settles_with_mandate_hash_and_blocks_replay() {
        let app = build_router();
        let (stage_status, staged) = send_json(
            &app,
            "POST",
            "/api/runs/stage",
            Some(json!({
                "track": "agent_linked_checkout",
                "prompt": "Buy Dell UltraSharp 27 USB-C Hub Monitor for studio desk under $320",
                "amount_usd": 265.0
            })),
        )
        .await;
        assert_eq!(stage_status, StatusCode::CREATED);
        assert_eq!(staged["status"], "awaiting_approval");
        let run_id = staged["run_id"].as_str().unwrap().to_string();

        let (app_status, approved) = send_json(
            &app,
            "POST",
            &format!("/api/runs/{run_id}/approve"),
            Some(json!({
                "idempotency_key": "idem-approve-001",
                "approver": "harrymove-ctrl"
            })),
        )
        .await;
        assert_eq!(app_status, StatusCode::OK);
        assert_eq!(approved["status"], "approved_settled");
        assert_eq!(approved["mandate_hash"].as_str().unwrap().len(), 64);

        let (dup_status, dup_body) = send_json(
            &app,
            "POST",
            &format!("/api/runs/{run_id}/approve"),
            Some(json!({
                "idempotency_key": "idem-approve-001",
                "approver": "harrymove-ctrl"
            })),
        )
        .await;
        assert_eq!(dup_status, StatusCode::CONFLICT);
        assert_eq!(dup_body["code"], "DUPLICATE_APPROVAL_KEY");
    }

    #[tokio::test]
    async fn overspend_above_per_purchase_cap_fails_closed_at_policy_gate() {
        let app = build_router();
        let (status, body) = send_json(
            &app,
            "POST",
            "/api/runs/stage",
            Some(json!({
                "track": "agent_linked_checkout",
                "prompt": "Order unapproved cluster GPU node",
                "amount_usd": 850.0
            })),
        )
        .await;
        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
        assert_eq!(body["code"], "SINGLE_PURCHASE_CAP_EXCEEDED");
    }

    #[tokio::test]
    async fn simulated_card_decline_marks_run_failed_without_incrementing_settled_total() {
        let app = build_router();
        let (_, before) = send_json(&app, "GET", "/api/state", None).await;
        let settled_before = before["settled_total_usd"].as_f64().unwrap();

        let (_, staged) = send_json(
            &app,
            "POST",
            "/api/runs/stage",
            Some(json!({
                "track": "agent_linked_checkout",
                "prompt": "Test CCREJECT-IF negative decline",
                "amount_usd": 120.0
            })),
        )
        .await;
        let run_id = staged["run_id"].as_str().unwrap();

        let (dec_status, dec_body) = send_json(
            &app,
            "POST",
            &format!("/api/runs/{run_id}/approve"),
            Some(json!({
                "idempotency_key": "idem-decline-001",
                "approver": "harrymove-ctrl",
                "simulate_decline": true
            })),
        )
        .await;
        assert_eq!(dec_status, StatusCode::BAD_GATEWAY);
        assert_eq!(dec_body["code"], "INSTRUMENT_DECLINED");

        let (_, after) = send_json(&app, "GET", "/api/state", None).await;
        assert!((after["settled_total_usd"].as_f64().unwrap() - settled_before).abs() < 0.001);
    }

    #[tokio::test]
    async fn all_five_devpost_tracks_stage_and_settle_cleanly() {
        let app = build_router();
        for (idx, track) in [
            "agent_linked_checkout",
            "group_dinner_split",
            "multi_currency_invoice",
            "consumer_budget_shield",
            "community_solar_pool",
        ]
        .iter()
        .enumerate()
        {
            let (s_code, staged) = send_json(
                &app,
                "POST",
                "/api/runs/stage",
                Some(json!({
                    "track": track,
                    "prompt": format!("Execute tabletop preset {track}"),
                    "amount_usd": 140.0
                })),
            )
            .await;
            assert_eq!(s_code, StatusCode::CREATED, "track {track} failed stage");
            let run_id = staged["run_id"].as_str().unwrap();
            let (a_code, approved) = send_json(
                &app,
                "POST",
                &format!("/api/runs/{run_id}/approve"),
                Some(json!({
                    "idempotency_key": format!("idem-track-{idx}"),
                    "approver": "harrymove-ctrl"
                })),
            )
            .await;
            assert_eq!(a_code, StatusCode::OK, "track {track} failed approve");
            assert_eq!(approved["status"], "approved_settled");
        }
    }

    #[tokio::test]
    async fn webhook_hmac_and_reporting_timestamp_sanitizer_hold_invariants() {
        assert_eq!(
            sanitize_reporting_timestamp("2026-11-12T08:15:30.482Z"),
            "2026-11-12T08:15:30Z"
        );
        let app = build_router();
        let sig = sign_webhook_hmac(
            "paytable-sandbox-webhook-secret",
            "tx-901",
            "2026-11-12T08:00:00Z",
            "{\"event_type\":\"PAYMENT.CAPTURE.COMPLETED\"}",
        );
        let (ok_code, ok_body) = send_json(
            &app,
            "POST",
            "/api/webhooks/verify",
            Some(json!({
                "transmission_id": "tx-901",
                "timestamp": "2026-11-12T08:00:00Z",
                "payload": "{\"event_type\":\"PAYMENT.CAPTURE.COMPLETED\"}",
                "signature_hex": sig
            })),
        )
        .await;
        assert_eq!(ok_code, StatusCode::OK);
        assert_eq!(ok_body["verified"], true);

        let (bad_code, _) = send_json(
            &app,
            "POST",
            "/api/webhooks/verify",
            Some(json!({
                "transmission_id": "tx-901",
                "timestamp": "2026-11-12T08:00:00Z",
                "payload": "{\"event_type\":\"TAMPERED\"}",
                "signature_hex": "deadbeef"
            })),
        )
        .await;
        assert_eq!(bad_code, StatusCode::UNAUTHORIZED);
    }
}
