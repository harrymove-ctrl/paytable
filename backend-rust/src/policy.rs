use hmac::{Hmac, Mac};
use sha2::{Digest, Sha256};
use thiserror::Error;

use crate::domain::LinkedWallet;

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum PolicyError {
    #[error("Purchase amount must be greater than zero USD")]
    InvalidAmount,
    #[error("Requested ${requested:.2} exceeds linked wallet single-purchase limit of ${cap:.2}")]
    SinglePurchaseCapExceeded { requested: u64, cap: u64 },
    #[error("Requested ${requested:.2} exceeds remaining daily linked-wallet budget of ${remaining:.2}")]
    DailyCapExceeded { requested: u64, remaining: u64 },
}

impl PolicyError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::InvalidAmount => "INVALID_PURCHASE_AMOUNT",
            Self::SinglePurchaseCapExceeded { .. } => "SINGLE_PURCHASE_CAP_EXCEEDED",
            Self::DailyCapExceeded { .. } => "DAILY_BUDGET_CAP_EXCEEDED",
        }
    }
}

pub fn evaluate_linked_wallet_policy(
    wallet: &LinkedWallet,
    amount_usd: f64,
) -> Result<(), PolicyError> {
    if !amount_usd.is_finite() || amount_usd <= 0.0 {
        return Err(PolicyError::InvalidAmount);
    }
    if amount_usd > wallet.max_per_purchase_usd {
        return Err(PolicyError::SinglePurchaseCapExceeded {
            requested: amount_usd.round() as u64,
            cap: wallet.max_per_purchase_usd.round() as u64,
        });
    }
    let remaining = (wallet.daily_cap_usd - wallet.daily_spent_usd).max(0.0);
    if amount_usd > remaining {
        return Err(PolicyError::DailyCapExceeded {
            requested: amount_usd.round() as u64,
            remaining: remaining.round() as u64,
        });
    }
    Ok(())
}

pub fn compute_mandate_hash(
    prev_hash: &str,
    run_id: &str,
    track_slug: &str,
    amount_usd: f64,
    approver: &str,
    paypal_ref: &str,
) -> String {
    let mut hasher = Sha256::new();
    hasher.update(prev_hash.as_bytes());
    hasher.update(b"|");
    hasher.update(run_id.as_bytes());
    hasher.update(b"|");
    hasher.update(track_slug.as_bytes());
    hasher.update(b"|");
    hasher.update(format!("{amount_usd:.2}").as_bytes());
    hasher.update(b"|");
    hasher.update(approver.as_bytes());
    hasher.update(b"|");
    hasher.update(paypal_ref.as_bytes());
    hex::encode(hasher.finalize())
}

/// PayPal Reporting v1 rejects fractional milliseconds (.000Z) and windows > 31 days.
pub fn sanitize_reporting_timestamp(raw: &str) -> String {
    let trimmed = raw.trim();
    if let Some((prefix, _ms)) = trimmed.split_once('.') {
        return format!("{prefix}Z");
    }
    if trimmed.ends_with('Z') {
        trimmed.to_string()
    } else {
        format!("{trimmed}Z")
    }
}

pub fn verify_webhook_hmac(
    secret: &str,
    transmission_id: &str,
    timestamp: &str,
    payload: &str,
    signature_hex: &str,
) -> bool {
    let Ok(sig_bytes) = hex::decode(signature_hex.trim()) else {
        return false;
    };
    let Ok(mut mac) = HmacSha256::new_from_slice(secret.as_bytes()) else {
        return false;
    };
    mac.update(transmission_id.as_bytes());
    mac.update(b"|");
    mac.update(timestamp.as_bytes());
    mac.update(b"|");
    mac.update(payload.as_bytes());
    mac.verify_slice(&sig_bytes).is_ok()
}

pub fn sign_webhook_hmac(
    secret: &str,
    transmission_id: &str,
    timestamp: &str,
    payload: &str,
) -> String {
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .expect("HMAC accepts keys of any byte length");
    mac.update(transmission_id.as_bytes());
    mac.update(b"|");
    mac.update(timestamp.as_bytes());
    mac.update(b"|");
    mac.update(payload.as_bytes());
    hex::encode(mac.finalize().into_bytes())
}
