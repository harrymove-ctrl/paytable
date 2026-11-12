"use client";

import { useEffect, useRef, useState } from "react";

export type TrackSlug =
  | "agent_linked_checkout"
  | "group_dinner_split"
  | "multi_currency_invoice"
  | "consumer_budget_shield"
  | "community_solar_pool";

export interface TrackPreset {
  code: string;
  slug: TrackSlug;
  title: string;
  category: string;
  default_prompt: string;
  default_amount_usd: number;
  merchant: string;
  paypal_capabilities: string[];
}

export interface LinkedWallet {
  wallet_id: string;
  owner_handle: string;
  agent_handle: string;
  paypal_sandbox_buyer: string;
  paypal_sandbox_merchant: string;
  funding_source: string;
  approval_mode: string;
  max_per_purchase_usd: number;
  daily_cap_usd: number;
  daily_spent_usd: number;
}

export type SodiumStepState =
  | "queued"
  | "running"
  | "waiting"
  | "done"
  | "failed"
  | "stopped";

export interface RunStep {
  id: string;
  label: string;
  detail: string;
  state: SodiumStepState;
  tab?: string | null;
  word?: string | null;
  duration_ms?: number | null;
  output?: string | null;
}

export type RunStatus =
  | "awaiting_approval"
  | "approved_settled"
  | "rejected"
  | "blocked_policy"
  | "failed";

export interface TabletopRun {
  run_id: string;
  track: TrackSlug;
  track_title: string;
  track_category: string;
  job_name: string;
  prompt: string;
  merchant: string;
  amount_usd: number;
  display_currency: string;
  display_amount: string;
  status: RunStatus;
  partitions_done: number;
  partitions_total: number;
  workers_active: number;
  workers_total: number;
  failed_checks: number;
  left_label: string;
  elapsed_ms: number;
  paypal_capabilities: string[];
  steps: RunStep[];
  widget: Record<string, unknown>;
  paypal_order_id?: string | null;
  paypal_capture_id?: string | null;
  paypal_invoice_id?: string | null;
  paypal_payout_batch_id?: string | null;
  paypal_tracker_id?: string | null;
  mandate_hash?: string | null;
  execution_mode: string;
  approver?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  created_at: string;
  settled_at?: string | null;
}

export interface LedgerRow {
  id: string;
  timestamp: string;
  run_id: string;
  track_code: string;
  track_title: string;
  counterparty: string;
  paypal_capability: string;
  amount_usd: number;
  currency_note: string;
  approval_gate: string;
  paypal_ref: string;
  mandate_hash: string;
  status: string;
}

export interface ScheduleMilestone {
  id: string;
  track_code: string;
  milestone: string;
  owner: string;
  window: string;
  progress_pct: number;
  amount_usd: number;
  gate_state: string;
  paypal_api: string;
}

export interface McpToolDescriptor {
  tool_name: string;
  paypal_endpoint: string;
  apimatic_method: string;
  requires_human_approval: boolean;
  summary: string;
}

export interface EngineSnapshot {
  wallet: LinkedWallet;
  awaiting_count: number;
  settled_total_usd: number;
  chain_head: string;
  live_credentials_configured: boolean;
  runs: TabletopRun[];
  ledger: LedgerRow[];
  tracks: TrackPreset[];
  schedule: ScheduleMilestone[];
  mcp_tools: McpToolDescriptor[];
}

export function formatUsd(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Björk UI smooth tabular numeral glide without layout shift. */
export function useGlidingNumber(target: number, durationMs = 260): number {
  const [shown, setShown] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      fromRef.current = target;
      setShown(target);
      return;
    }
    const startVal = fromRef.current;
    if (Math.abs(target - startVal) < 0.005) {
      setShown(target);
      return;
    }
    const startAt = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - startAt) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = startVal + (target - startVal) * eased;
      setShown(next);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return shown;
}
