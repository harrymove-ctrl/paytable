import { Suspense } from "react";
import { PayTableWorkspace } from "@/components/paytable/PayTableWorkspace";
import type { EngineSnapshot } from "@/lib/types";

export const dynamic = "force-dynamic";

const FALLBACK_SNAPSHOT: EngineSnapshot = {
  wallet: {
    wallet_id: "wlt_agent_linked_01",
    owner_handle: "harrymove-ctrl",
    agent_handle: "@paytable",
    paypal_sandbox_buyer: "buyer-linked-wallet@paytable.dev",
    paypal_sandbox_merchant: "merchant-sandbox@paytable.dev",
    funding_source: "PayPal Linked Balance + Visa *1881",
    approval_mode: "EVERY_PURCHASE",
    max_per_purchase_usd: 500,
    daily_cap_usd: 1500,
    daily_spent_usd: 408,
  },
  awaiting_count: 1,
  settled_total_usd: 408,
  chain_head:
    "9a7f14b2e5c94d30a1e8f77b2104c8e99d12ab34cd56ef7890123456789abcde",
  live_credentials_configured: false,
  runs: [
    {
      run_id: "run_91c0d4",
      track: "agent_linked_checkout",
      track_title: "Linked Wallet Agent Checkout",
      track_category: "AI Agents & Automation",
      job_name: "linked-wallet-checkout",
      prompt:
        "@paytable Source Dell UltraSharp 27 USB-C Monitor under $320, negotiate A2A quote, and hold linked wallet for my approval",
      merchant: "Channel3 Verified · Dell Direct Sandbox",
      amount_usd: 265,
      display_currency: "USD",
      display_amount: "$265.00",
      status: "awaiting_approval",
      partitions_done: 3,
      partitions_total: 5,
      workers_active: 3,
      workers_total: 4,
      failed_checks: 0,
      left_label: "1 human gate",
      elapsed_ms: 1940,
      paypal_capabilities: [
        "Linked Agent Wallet",
        "Orders v2",
        "Shipment Tracking v1",
        "Agent Toolkit MCP",
      ],
      steps: [
        {
          id: "step_1",
          label: "Verify wallet",
          detail: "wlt_agent_linked_01 · Visa *1881 · cap $500.00",
          state: "done",
          word: "Done",
          duration_ms: 280,
          output: "Linked wallet mandate active. Approval mode: EVERY_PURCHASE.",
        },
        {
          id: "step_2",
          label: "Search catalog",
          detail: 'channel3.search("Dell UltraSharp 27 USB-C")',
          state: "done",
          word: "Done",
          duration_ms: 640,
          output: "Matched SKU DELL-U2723QE across 3 verified merchants.",
        },
        {
          id: "step_3",
          label: "Negotiate quote",
          detail: "a2a.counter_offer($310.00 -> $265.00)",
          state: "done",
          word: "Done",
          duration_ms: 920,
          output: "Merchant agent accepted $265.00 with free 2-day courier.",
        },
        {
          id: "step_4",
          label: "Approve purchase",
          detail: "paypal.linked_wallet.authorize($265.00)",
          state: "waiting",
          tab: "Needs approval",
          output:
            "Paused on human owner: confirm $265.00 charge on linked PayPal wallet before capture.",
        },
        {
          id: "step_5",
          label: "Settle order",
          detail: "POST /v2/checkout/orders + /v1/shipping/trackers-batch",
          state: "queued",
          word: "Queued",
        },
      ],
      widget: {
        kind: "agent_linked_checkout",
        quotes: [
          {
            vendor: "B&H Studio Sandbox",
            quote_usd: 309,
            shipping: "3d ground",
            selected: false,
          },
          {
            vendor: "Adorama Pro Sandbox",
            quote_usd: 289,
            shipping: "2d air",
            selected: false,
          },
          {
            vendor: "Dell Direct A2A Desk",
            quote_usd: 265,
            shipping: "Next-day tracked",
            selected: true,
          },
        ],
      },
      execution_mode: "awaiting_human_approval",
      created_at: "2026-11-12T07:18:00Z",
    },
  ],
  ledger: [],
  tracks: [
    {
      code: "01",
      slug: "agent_linked_checkout",
      title: "Linked Wallet Agent Checkout",
      category: "AI Agents & Automation",
      default_prompt:
        "@paytable Source Dell UltraSharp 27 USB-C Monitor under $320, negotiate A2A quote, and hold linked wallet for my approval",
      default_amount_usd: 265,
      merchant: "Channel3 Verified · Dell Direct Sandbox",
      paypal_capabilities: ["Linked Agent Wallet", "Orders v2"],
    },
  ],
  schedule: [],
  mcp_tools: [],
};

async function loadInitialSnapshot(): Promise<EngineSnapshot> {
  const origin = process.env.PAYTABLE_API_ORIGIN ?? "http://127.0.0.1:4184";
  try {
    const res = await fetch(`${origin}/api/state`, { cache: "no-store" });
    if (res.ok) {
      return (await res.json()) as EngineSnapshot;
    }
  } catch {
    // Fallback used during static build check when backend daemon is not bound yet
  }
  return FALLBACK_SNAPSHOT;
}

export default async function HomePage() {
  const initialSnapshot = await loadInitialSnapshot();
  return (
    <Suspense fallback={<div className="p-6 type-code-sm">Loading PayTable...</div>}>
      <PayTableWorkspace initialSnapshot={initialSnapshot} />
    </Suspense>
  );
}
