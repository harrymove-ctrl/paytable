use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TrackKind {
    AgentLinkedCheckout,
    GroupDinnerSplit,
    MultiCurrencyInvoice,
    ConsumerBudgetShield,
    CommunitySolarPool,
}

impl TrackKind {
    pub fn from_slug(slug: &str) -> Option<Self> {
        match slug.trim() {
            "agent_linked_checkout" => Some(Self::AgentLinkedCheckout),
            "group_dinner_split" => Some(Self::GroupDinnerSplit),
            "multi_currency_invoice" => Some(Self::MultiCurrencyInvoice),
            "consumer_budget_shield" => Some(Self::ConsumerBudgetShield),
            "community_solar_pool" => Some(Self::CommunitySolarPool),
            _ => None,
        }
    }

    pub fn slug(self) -> &'static str {
        match self {
            Self::AgentLinkedCheckout => "agent_linked_checkout",
            Self::GroupDinnerSplit => "group_dinner_split",
            Self::MultiCurrencyInvoice => "multi_currency_invoice",
            Self::ConsumerBudgetShield => "consumer_budget_shield",
            Self::CommunitySolarPool => "community_solar_pool",
        }
    }

    pub fn code(self) -> &'static str {
        match self {
            Self::AgentLinkedCheckout => "01",
            Self::GroupDinnerSplit => "02",
            Self::MultiCurrencyInvoice => "03",
            Self::ConsumerBudgetShield => "04",
            Self::CommunitySolarPool => "05",
        }
    }

    pub fn title(self) -> &'static str {
        match self {
            Self::AgentLinkedCheckout => "Linked Wallet Agent Checkout",
            Self::GroupDinnerSplit => "Receipt Scan & Dinner Split",
            Self::MultiCurrencyInvoice => "Multi-Currency & Creator Split",
            Self::ConsumerBudgetShield => "Budget & Dispute Shield",
            Self::CommunitySolarPool => "Neighborhood Solar Co-op Pool",
        }
    }

    pub fn category(self) -> &'static str {
        match self {
            Self::AgentLinkedCheckout => "AI Agents & Automation",
            Self::GroupDinnerSplit => "Money Movement",
            Self::MultiCurrencyInvoice => "Business Solutions",
            Self::ConsumerBudgetShield => "Consumer Experiences",
            Self::CommunitySolarPool => "Social Impact",
        }
    }

    pub fn default_prompt(self) -> &'static str {
        match self {
            Self::AgentLinkedCheckout => {
                "@paytable Source Dell UltraSharp 27 USB-C Monitor under $320, negotiate A2A quote, and hold linked wallet for my approval"
            }
            Self::GroupDinnerSplit => {
                "@paytable Scan dinner receipt ($168.00 across 4 friends), generate PayPal QR invoices, and settle instant payouts"
            }
            Self::MultiCurrencyInvoice => {
                "@paytable Bill Berlin studio EUR 420 with Pay Later 4x option and split settlement 60/30/10 across collaborators"
            }
            Self::ConsumerBudgetShield => {
                "@paytable Audit 30-day PayPal spend, flag duplicate $29 subscription, and create $74 household Request Money link"
            }
            Self::CommunitySolarPool => {
                "@paytable Pool $240 neighborhood clean-energy contribution across Block 14 Solar, Microloans, and Harbor Cleanup"
            }
        }
    }

    pub fn default_amount_usd(self) -> f64 {
        match self {
            Self::AgentLinkedCheckout => 265.00,
            Self::GroupDinnerSplit => 168.00,
            Self::MultiCurrencyInvoice => 453.60,
            Self::ConsumerBudgetShield => 74.00,
            Self::CommunitySolarPool => 240.00,
        }
    }

    pub fn merchant_label(self) -> &'static str {
        match self {
            Self::AgentLinkedCheckout => "Channel3 Verified · Dell Direct Sandbox",
            Self::GroupDinnerSplit => "District Table · 4-Diner Split",
            Self::MultiCurrencyInvoice => "Studio Nord Berlin (EUR -> USD)",
            Self::ConsumerBudgetShield => "Household Wallet Audit & Payment Link",
            Self::CommunitySolarPool => "Block 14 Solar & Field Partners",
        }
    }

    pub fn paypal_capabilities(self) -> Vec<&'static str> {
        match self {
            Self::AgentLinkedCheckout => vec![
                "Linked Agent Wallet",
                "Orders v2",
                "Shipment Tracking v1",
                "Agent Toolkit MCP",
            ],
            Self::GroupDinnerSplit => vec![
                "Invoicing v2",
                "Invoice QR Code",
                "Payouts v1",
            ],
            Self::MultiCurrencyInvoice => vec![
                "Multi-Currency Invoicing",
                "Pay Later 4x",
                "Subscriptions v1",
                "Batch Payouts v1",
            ],
            Self::ConsumerBudgetShield => vec![
                "Reporting v1",
                "Payment Links",
                "Disputes v1 Guard",
            ],
            Self::CommunitySolarPool => vec![
                "Donations Checkout",
                "Multi-Cause Split",
                "Recurring Field Payouts",
            ],
        }
    }

    pub fn all() -> [Self; 5] {
        [
            Self::AgentLinkedCheckout,
            Self::GroupDinnerSplit,
            Self::MultiCurrencyInvoice,
            Self::ConsumerBudgetShield,
            Self::CommunitySolarPool,
        ]
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackPreset {
    pub code: String,
    pub slug: String,
    pub title: String,
    pub category: String,
    pub default_prompt: String,
    pub default_amount_usd: f64,
    pub merchant: String,
    pub paypal_capabilities: Vec<String>,
}

impl From<TrackKind> for TrackPreset {
    fn from(kind: TrackKind) -> Self {
        Self {
            code: kind.code().to_string(),
            slug: kind.slug().to_string(),
            title: kind.title().to_string(),
            category: kind.category().to_string(),
            default_prompt: kind.default_prompt().to_string(),
            default_amount_usd: kind.default_amount_usd(),
            merchant: kind.merchant_label().to_string(),
            paypal_capabilities: kind
                .paypal_capabilities()
                .into_iter()
                .map(str::to_string)
                .collect(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LinkedWallet {
    pub wallet_id: String,
    pub owner_handle: String,
    pub agent_handle: String,
    pub paypal_sandbox_buyer: String,
    pub paypal_sandbox_merchant: String,
    pub funding_source: String,
    pub approval_mode: String,
    pub max_per_purchase_usd: f64,
    pub daily_cap_usd: f64,
    pub daily_spent_usd: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StepState {
    Queued,
    Running,
    Waiting,
    Done,
    Failed,
    Stopped,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunStep {
    pub id: String,
    pub label: String,
    pub detail: String,
    pub state: StepState,
    pub tab: Option<String>,
    pub word: Option<String>,
    pub duration_ms: Option<u64>,
    pub output: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RunStatus {
    AwaitingApproval,
    ApprovedSettled,
    Rejected,
    BlockedPolicy,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TabletopRun {
    pub run_id: String,
    pub track: TrackKind,
    pub track_title: String,
    pub track_category: String,
    pub job_name: String,
    pub prompt: String,
    pub merchant: String,
    pub amount_usd: f64,
    pub display_currency: String,
    pub display_amount: String,
    pub status: RunStatus,
    pub partitions_done: u32,
    pub partitions_total: u32,
    pub workers_active: u32,
    pub workers_total: u32,
    pub failed_checks: u32,
    pub left_label: String,
    pub elapsed_ms: u64,
    pub paypal_capabilities: Vec<String>,
    pub steps: Vec<RunStep>,
    pub widget: Value,
    pub paypal_order_id: Option<String>,
    pub paypal_capture_id: Option<String>,
    pub paypal_invoice_id: Option<String>,
    pub paypal_payout_batch_id: Option<String>,
    pub paypal_tracker_id: Option<String>,
    pub mandate_hash: Option<String>,
    pub execution_mode: String,
    pub approver: Option<String>,
    pub error_code: Option<String>,
    pub error_message: Option<String>,
    pub created_at: String,
    pub settled_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LedgerRow {
    pub id: String,
    pub timestamp: String,
    pub run_id: String,
    pub track_code: String,
    pub track_title: String,
    pub counterparty: String,
    pub paypal_capability: String,
    pub amount_usd: f64,
    pub currency_note: String,
    pub approval_gate: String,
    pub paypal_ref: String,
    pub mandate_hash: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleMilestone {
    pub id: String,
    pub track_code: String,
    pub milestone: String,
    pub owner: String,
    pub window: String,
    pub progress_pct: u32,
    pub amount_usd: f64,
    pub gate_state: String,
    pub paypal_api: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpToolDescriptor {
    pub tool_name: String,
    pub paypal_endpoint: String,
    pub apimatic_method: String,
    pub requires_human_approval: bool,
    pub summary: String,
}
