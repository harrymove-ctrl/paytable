"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/sodium/ui/button";
import {
  Frame,
  FrameBody,
  FrameFooter,
  FrameHeader,
  FrameMeta,
  FrameStatus,
  FrameTitle,
  FrameValue,
} from "@/components/sodium/ui/frame";
import {
  NumberedTabs,
  NumberedTabsContent,
  NumberedTabsList,
  NumberedTabsTrigger,
} from "@/components/sodium/ui/numbered-tabs";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/sodium/ui/progress";
import {
  StatusStrip,
  StatusStripCell,
  StatusStripLabel,
  StatusStripUnit,
  StatusStripValue,
} from "@/components/sodium/ui/status-strip";
import { Status, StatusMark } from "@/components/sodium/ui/status";
import {
  ToolCallRow,
  ToolCallStack,
  formatElapsed,
} from "@/components/sodium/ai/tool-call-row";
import { Icon, Moon, Renew, Sun } from "@/components/sodium/icon";
import { TabletopWidget } from "@/components/paytable/TabletopWidget";
import { LedgerPanel } from "@/components/paytable/LedgerPanel";
import { ScheduleSdkPanel } from "@/components/paytable/ScheduleSdkPanel";
import { ReceiptDialog } from "@/components/paytable/ReceiptDialog";
import {
  formatUsd,
  useGlidingNumber,
  type EngineSnapshot,
  type TabletopRun,
  type TrackSlug,
} from "@/lib/types";

type LayoutVariant = "split" | "focus" | "compact";

export function PayTableWorkspace({
  initialSnapshot,
}: {
  initialSnapshot: EngineSnapshot;
}) {
  const searchParams = useSearchParams();
  const [snapshot, setSnapshot] = useState<EngineSnapshot>(initialSnapshot);
  const [selectedRunId, setSelectedRunId] = useState<string>(
    initialSnapshot.runs[0]?.run_id ?? ""
  );
  const [activeTab, setActiveTab] = useState<string>("tabletop");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [variant, setVariant] = useState<LayoutVariant>("split");
  const [promptDraft, setPromptDraft] = useState<string>(
    initialSnapshot.tracks[0]?.default_prompt ?? ""
  );
  const [amountDraft, setAmountDraft] = useState<string>("265.00");
  const [selectedTrack, setSelectedTrack] = useState<TrackSlug>(
    "agent_linked_checkout"
  );
  const [staging, setStaging] = useState(false);
  const [approving, setApproving] = useState(false);
  const [banner, setBanner] = useState<{
    tone: "ok" | "warn" | "fail";
    text: string;
  } | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [qaOpen, setQaOpen] = useState(false);
  const [lastIdempotencyKey, setLastIdempotencyKey] = useState<string>(
    "idem-live-session-01"
  );

  useEffect(() => {
    if (searchParams.get("debug") === "1") {
      setQaOpen(true);
    }
    const qTheme = searchParams.get("theme");
    if (qTheme === "light" || qTheme === "dark") {
      setTheme(qTheme);
    }
  }, [searchParams]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const refreshState = useCallback(async (focusRunId?: string) => {
    const res = await fetch("/api/state", { cache: "no-store" });
    if (!res.ok) return;
    const next: EngineSnapshot = await res.json();
    setSnapshot(next);
    if (focusRunId) {
      setSelectedRunId(focusRunId);
    }
  }, []);

  const activeRun: TabletopRun | undefined = useMemo(() => {
    return (
      snapshot.runs.find((r) => r.run_id === selectedRunId) ?? snapshot.runs[0]
    );
  }, [snapshot.runs, selectedRunId]);

  const glidingSpent = useGlidingNumber(snapshot.wallet.daily_spent_usd);
  const glidingSettled = useGlidingNumber(snapshot.settled_total_usd);

  const stageRun = async (
    track: TrackSlug,
    promptOverride?: string,
    amountOverride?: number
  ) => {
    setStaging(true);
    setBanner(null);
    try {
      const amount =
        amountOverride ?? (Number.parseFloat(amountDraft) || undefined);
      const res = await fetch("/api/runs/stage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          track,
          prompt: promptOverride ?? promptDraft,
          amount_usd: amount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({
          tone: "fail",
          text: `${data.code ?? "POLICY_BLOCK"}: ${data.message ?? "Blocked by linked-wallet policy"}`,
        });
        return;
      }
      const key = `idem-${data.run_id}`;
      setLastIdempotencyKey(key);
      await refreshState(data.run_id);
      setBanner({
        tone: "warn",
        text: `Staged ${data.run_id} (${formatUsd(data.amount_usd)}). Paused at human approval gate.`,
      });
    } finally {
      setStaging(false);
    }
  };

  const selectTrackPreset = async (slug: TrackSlug) => {
    setSelectedTrack(slug);
    const preset = snapshot.tracks.find((t) => t.slug === slug);
    if (preset) {
      setPromptDraft(preset.default_prompt);
      setAmountDraft(preset.default_amount_usd.toFixed(2));
    }
    const existingAwaiting = snapshot.runs.find(
      (r) => r.track === slug && r.status === "awaiting_approval"
    );
    if (existingAwaiting) {
      setSelectedRunId(existingAwaiting.run_id);
      setBanner(null);
      return;
    }
    if (preset) {
      await stageRun(slug, preset.default_prompt, preset.default_amount_usd);
    }
  };

  const approveRun = async (opts?: {
    simulateDecline?: boolean;
    forceKey?: string;
  }) => {
    if (!activeRun) return;
    setApproving(true);
    setBanner(null);
    const idemKey =
      opts?.forceKey ?? `idem-${activeRun.run_id}-${Date.now().toString(36)}`;
    if (!opts?.forceKey) {
      setLastIdempotencyKey(idemKey);
    }
    try {
      const res = await fetch(`/api/runs/${activeRun.run_id}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          idempotency_key: idemKey,
          approver: snapshot.wallet.owner_handle,
          simulate_decline: opts?.simulateDecline ?? false,
        }),
      });
      const data = await res.json();
      await refreshState(activeRun.run_id);
      if (!res.ok) {
        setBanner({
          tone: "fail",
          text: `${data.code ?? "APPROVAL_ERROR"}: ${data.message ?? "Approval halted"}`,
        });
        return;
      }
      setBanner({
        tone: "ok",
        text: `Approved & settled ${data.run_id} (${formatUsd(data.amount_usd)}). Mandate ${String(data.mandate_hash ?? "").slice(0, 14)}...`,
      });
    } finally {
      setApproving(false);
    }
  };

  const rejectRun = async () => {
    if (!activeRun) return;
    const res = await fetch(`/api/runs/${activeRun.run_id}/reject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "Stopped by linked-wallet owner" }),
    });
    if (res.ok) {
      await refreshState(activeRun.run_id);
      setBanner({
        tone: "warn",
        text: `Stopped ${activeRun.run_id} before PayPal capture. Zero funds moved.`,
      });
    }
  };

  const reseedAll = async () => {
    const res = await fetch("/api/state/reseed", { method: "POST" });
    if (!res.ok) return;
    const fresh: EngineSnapshot = await res.json();
    setSnapshot(fresh);
    setSelectedRunId(fresh.runs[0]?.run_id ?? "");
    setSelectedTrack("agent_linked_checkout");
    setPromptDraft(fresh.tracks[0]?.default_prompt ?? "");
    setAmountDraft("265.00");
    setBanner({
      tone: "ok",
      text: "Sandbox state reseeded. Linked wallet run_91c0d4 is ready for approval.",
    });
  };

  const probeLiveSandbox = async () => {
    setBanner({ tone: "warn", text: "Probing live PayPal Sandbox OAuth2 and v2 endpoints..." });
    const res = await fetch("/api/paypal/live-verify", { method: "POST" });
    const data = await res.json();
    if (data.oauth_ok) {
      setBanner({
        tone: "ok",
        text: `Live PayPal Sandbox verified (${data.mode}) · Order ${data.sandbox_order_id ?? "OK"} · Reporting HTTP ${data.reporting_http_status}`,
      });
    } else {
      setBanner({
        tone: "warn",
        text: `Mode: ${data.mode}. ${data.note ?? data.error ?? ""}`,
      });
    }
  };

  return (
    <div
      data-system="sodium"
      data-theme={theme}
      className="sodium min-h-dvh bg-page text-text-1"
    >
      <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-4 px-4 py-4 sm:px-6">
        {/* Top Masthead */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div className="flex min-w-0 items-center gap-3">
            <svg
              viewBox="0 0 28 28"
              className="size-7 shrink-0 border border-line bg-panel"
              role="img"
              aria-label="PayTable linked wallet mark"
            >
              <rect x="4" y="4" width="11" height="11" fill="#ffd400" />
              <rect
                x="13"
                y="13"
                width="11"
                height="11"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="type-title-sm text-text-1">PayTable</h1>
                <span className="border border-line bg-well px-1.5 py-0.5 type-micro text-text-2">
                  PayPal AI Tabletop
                </span>
              </div>
              <p className="truncate type-caption text-text-2">
                Linked PayPal wallets for AI agents, with human approval on every purchase.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div
              role="group"
              aria-label="Layout density variant"
              className="inline-flex border border-line bg-panel"
            >
              {(["split", "focus", "compact"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setVariant(mode)}
                  aria-pressed={variant === mode}
                  className={`h-(--control-sm) cursor-pointer px-2.5 type-label-sm transition-colors ${
                    variant === mode
                      ? "selected text-text-1"
                      : "text-text-2 hover:bg-hover hover:text-text-1"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <Button
              variant="secondary"
              size="icon-sm"
              aria-label={
                theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
              }
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              data-testid="theme-toggle-btn"
            >
              <Icon icon={theme === "dark" ? Sun : Moon} />
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={reseedAll}
              data-testid="reseed-btn"
            >
              <Icon icon={Renew} />
              <span>Reseed</span>
            </Button>

            <Button
              variant={qaOpen ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setQaOpen((v) => !v)}
              data-testid="qa-toggle-btn"
            >
              QA
            </Button>
          </div>
        </header>

        {/* QA / Debug Bar (?debug=1 or QA button) */}
        {qaOpen && (
          <section
            aria-label="Adversarial QA controls"
            data-testid="qa-debug-bar"
            className="flex flex-wrap items-center gap-2 border border-line bg-panel px-inset py-2"
          >
            <span className="type-label-sm text-text-2">QA Guardrails</span>
            <Button
              variant="secondary"
              size="sm"
              data-testid="qa-overspend-btn"
              onClick={() =>
                stageRun(
                  "agent_linked_checkout",
                  "@paytable Attempt unapproved $850 workstation GPU order above $500 single cap",
                  850
                )
              }
            >
              Simulate $850 overspend
            </Button>
            <Button
              variant="secondary"
              size="sm"
              data-testid="qa-decline-btn"
              onClick={() => approveRun({ simulateDecline: true })}
            >
              Simulate card decline
            </Button>
            <Button
              variant="secondary"
              size="sm"
              data-testid="qa-replay-btn"
              onClick={() => approveRun({ forceKey: lastIdempotencyKey })}
            >
              Replay duplicate key (409)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              data-testid="qa-stress-btn"
              onClick={() =>
                stageRun(
                  "multi_currency_invoice",
                  "@paytable Cross-border multi-collaborator settlement for International Distributed Systems Architecture & Creative Studio Consortium Europe",
                  488.25
                )
              }
            >
              Stress long values
            </Button>
            <Button
              variant="secondary"
              size="sm"
              data-testid="qa-live-probe-btn"
              onClick={probeLiveSandbox}
            >
              Probe live Sandbox
            </Button>
          </section>
        )}

        {/* Sodium StatusStrip */}
        <StatusStrip label="Linked agent wallet telemetry">
          <StatusStripCell>
            <StatusStripLabel>Linked Wallet</StatusStripLabel>
            <StatusStripValue>
              <span>{snapshot.wallet.wallet_id}</span>
              <StatusStripUnit>Visa *1881</StatusStripUnit>
            </StatusStripValue>
          </StatusStripCell>

          <StatusStripCell>
            <StatusStripLabel>Approval Gate</StatusStripLabel>
            <StatusStripValue>
              <StatusMark status="warn" />
              <span>Every purchase</span>
            </StatusStripValue>
          </StatusStripCell>

          <StatusStripCell
            selected={snapshot.awaiting_count > 0}
            onClick={() => {
              const nextWaiting = snapshot.runs.find(
                (r) => r.status === "awaiting_approval"
              );
              if (nextWaiting) {
                setSelectedRunId(nextWaiting.run_id);
                setActiveTab("tabletop");
              }
            }}
          >
            <StatusStripLabel>Needs Approval</StatusStripLabel>
            <StatusStripValue data-testid="awaiting-count-val">
              <StatusMark
                status={snapshot.awaiting_count > 0 ? "warn" : "ok"}
              />
              <span>{snapshot.awaiting_count}</span>
              <StatusStripUnit>staged</StatusStripUnit>
            </StatusStripValue>
          </StatusStripCell>

          <StatusStripCell>
            <StatusStripLabel>Daily Budget</StatusStripLabel>
            <StatusStripValue data-testid="daily-spent-val">
              <span>{formatUsd(glidingSpent)}</span>
              <StatusStripUnit>
                / {formatUsd(snapshot.wallet.daily_cap_usd)}
              </StatusStripUnit>
            </StatusStripValue>
          </StatusStripCell>

          <StatusStripCell>
            <StatusStripLabel>Sandbox Settled</StatusStripLabel>
            <StatusStripValue data-testid="settled-total-val">
              <StatusMark status="ok" />
              <span>{formatUsd(glidingSettled)}</span>
            </StatusStripValue>
          </StatusStripCell>
        </StatusStrip>

        {/* Live Action Feedback Banner */}
        {banner && (
          <div
            role="status"
            data-testid="status-banner"
            className={`flex items-center justify-between gap-3 border px-inset py-2 ${
              banner.tone === "fail"
                ? "border-fail bg-fail-tint text-fail-text"
                : banner.tone === "warn"
                  ? "border-warn bg-warn-tint text-warn-text"
                  : "border-line bg-panel text-text-1"
            }`}
          >
            <Status size="sm" status={banner.tone}>
              {banner.text}
            </Status>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="shrink-0 cursor-pointer type-label-sm text-text-2 hover:text-text-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Sodium NumberedTabs */}
        <NumberedTabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(String(val))}
        >
          <NumberedTabsList size="sm" aria-label="PayTable views">
            <NumberedTabsTrigger value="tabletop" data-testid="tab-tabletop">
              Tabletop
            </NumberedTabsTrigger>
            <NumberedTabsTrigger value="ledger" data-testid="tab-ledger">
              Ledger ({snapshot.ledger.length})
            </NumberedTabsTrigger>
            <NumberedTabsTrigger value="schedule" data-testid="tab-schedule">
              Schedule & SDK
            </NumberedTabsTrigger>
          </NumberedTabsList>

          {/* [01] TABLETOP */}
          <NumberedTabsContent value="tabletop">
            <div className="flex min-w-0 flex-col gap-4">
              {/* 5 Minimalist PayPal Developer Track Presets (single horizontal scroll row) */}
              <div
                role="group"
                aria-label="PayPal Developer Hackathon tracks"
                className="flex w-full min-w-0 items-stretch gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {snapshot.tracks.map((track) => {
                  const isCurrent = activeRun?.track === track.slug;
                  return (
                    <button
                      key={track.slug}
                      type="button"
                      data-testid={`track-preset-${track.slug}`}
                      onClick={() => selectTrackPreset(track.slug)}
                      className={`flex shrink-0 cursor-pointer items-center gap-2 border px-3 py-2 text-start transition-colors ${
                        isCurrent
                          ? "selected border-accent-edge text-text-1"
                          : "border-line bg-panel text-text-2 hover:bg-hover hover:text-text-1"
                      }`}
                    >
                      <span className="bracketed type-label-sm text-accent-text">
                        {track.code}
                      </span>
                      <span className="type-label-sm">{track.title}</span>
                      <span className="type-code-sm text-text-2">
                        {formatUsd(track.default_amount_usd)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* @paytable Collaborative Composer */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  stageRun(selectedTrack);
                }}
                className="field-surface flex flex-col gap-2 p-2 sm:flex-row sm:items-center"
              >
                <label htmlFor="paytable-prompt" className="sr-only">
                  Prompt @paytable agent
                </label>
                <input
                  id="paytable-prompt"
                  type="text"
                  value={promptDraft}
                  onChange={(e) => setPromptDraft(e.target.value)}
                  placeholder="Ask @paytable to shop, split a receipt, invoice in EUR, or pool donations..."
                  className="min-w-0 flex-1 bg-transparent px-2 py-1 type-body-sm text-text-1 placeholder:text-text-3 focus:outline-none"
                />
                <div className="flex shrink-0 items-center gap-2">
                  <label htmlFor="paytable-amount" className="type-label-sm text-text-2">
                    USD
                  </label>
                  <input
                    id="paytable-amount"
                    type="number"
                    step="0.01"
                    min="1"
                    max="2000"
                    value={amountDraft}
                    onChange={(e) => setAmountDraft(e.target.value)}
                    className="field h-(--control-sm) w-24 px-2 type-code-sm text-text-1"
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    pending={staging}
                    pendingLabel="Staging"
                    data-testid="stage-intent-btn"
                  >
                    Stage intent
                  </Button>
                </div>
              </form>

              {/* Main Tabletop + Sodium Run Frame Workspace */}
              {activeRun && (
                <div
                  className={
                    variant === "focus"
                      ? "mx-auto flex w-full max-w-[780px] flex-col gap-5"
                      : "grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]"
                  }
                >
                  {/* Left: Collaborative Tabletop Artifact + Run Switcher */}
                  {variant !== "focus" && (
                    <div className="flex min-w-0 flex-col gap-4">
                      <TabletopWidget
                        run={activeRun}
                        wallet={snapshot.wallet}
                        onInspectReceipt={() => setReceiptOpen(true)}
                      />

                      <Frame aria-label="Recent tabletop runs">
                        <FrameHeader>
                          <FrameTitle>recent-runs</FrameTitle>
                          <FrameValue meta>{snapshot.runs.length} total</FrameValue>
                        </FrameHeader>
                        <FrameBody padding="none">
                          <div className="divide-y divide-line-faint">
                            {snapshot.runs.slice(0, 6).map((r) => (
                              <button
                                key={r.run_id}
                                type="button"
                                onClick={() => setSelectedRunId(r.run_id)}
                                className={`flex min-h-(--row) w-full cursor-pointer items-center justify-between gap-3 px-inset py-2 text-start transition-colors ${
                                  r.run_id === activeRun.run_id
                                    ? "selected"
                                    : "hover:bg-hover"
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="type-code-sm text-text-1">
                                      {r.run_id}
                                    </span>
                                    <span className="truncate type-caption text-text-2">
                                      {r.track_title}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-3">
                                  <span className="type-code-sm text-text-1">
                                    {formatUsd(r.amount_usd)}
                                  </span>
                                  <Status
                                    size="sm"
                                    status={
                                      r.status === "approved_settled"
                                        ? "ok"
                                        : r.status === "awaiting_approval"
                                          ? "warn"
                                          : r.status === "rejected"
                                            ? "paused"
                                            : "fail"
                                    }
                                  >
                                    {r.status === "approved_settled"
                                      ? "Settled"
                                      : r.status === "awaiting_approval"
                                        ? "Needs approval"
                                        : r.status === "rejected"
                                          ? "Stopped"
                                          : "Failed"}
                                  </Status>
                                </div>
                              </button>
                            ))}
                          </div>
                        </FrameBody>
                      </Frame>
                    </div>
                  )}

                  {/* Right: Signature Sodium Run Frame + ToolCallStack */}
                  <div className="flex min-w-0 flex-col gap-5">
                    <Frame
                      aria-label="Linked wallet approval gate and execution telemetry"
                      data-testid="sodium-run-frame"
                    >
                      <FrameHeader>
                        <FrameTitle>{activeRun.job_name}</FrameTitle>
                        <FrameStatus>
                          <Status
                            size="sm"
                            live
                            status={
                              activeRun.status === "approved_settled"
                                ? "ok"
                                : activeRun.status === "awaiting_approval"
                                  ? "running"
                                  : activeRun.status === "rejected"
                                    ? "paused"
                                    : "fail"
                            }
                          >
                            {activeRun.status === "approved_settled"
                              ? "Settled"
                              : activeRun.status === "awaiting_approval"
                                ? "Paused on owner"
                                : activeRun.status === "rejected"
                                  ? "Stopped"
                                  : "Failed"}
                          </Status>
                        </FrameStatus>
                        <FrameValue meta>
                          {formatElapsed(activeRun.elapsed_ms)}
                        </FrameValue>
                      </FrameHeader>

                      <FrameBody>
                        <Progress
                          value={activeRun.partitions_done}
                          min={0}
                          max={activeRun.partitions_total}
                          status={
                            activeRun.status === "failed"
                              ? "fail"
                              : activeRun.status === "awaiting_approval"
                                ? "warn"
                                : undefined
                          }
                          statusLabel={
                            activeRun.status === "awaiting_approval"
                              ? "Human gate"
                              : undefined
                          }
                        >
                          <ProgressLabel>Verification Gates</ProgressLabel>
                          <ProgressValue>
                            {() =>
                              `${activeRun.partitions_done} / ${activeRun.partitions_total}`
                            }
                          </ProgressValue>
                        </Progress>
                      </FrameBody>

                      {/* 2x2 Sodium Ruled Cells (matching sessions-rollup specimen) */}
                      <FrameBody padding="none">
                        <div className="grid grid-cols-2">
                          <div className="border-e border-b border-line p-inset">
                            <div className="type-label-sm text-text-2">Amount</div>
                            <div
                              data-testid="active-run-amount"
                              className="mt-0.5 truncate type-code text-text-1"
                            >
                              {activeRun.display_amount}
                            </div>
                          </div>
                          <div className="border-b border-line p-inset">
                            <div className="type-label-sm text-text-2">Workers</div>
                            <div className="mt-0.5 type-code text-text-1">
                              {activeRun.workers_active} / {activeRun.workers_total}
                            </div>
                          </div>
                          <div className="border-e border-line p-inset">
                            <div className="type-label-sm text-text-2">Failed</div>
                            <div className="mt-0.5 type-code text-text-1">
                              {activeRun.failed_checks}
                            </div>
                          </div>
                          <div className="p-inset">
                            <div className="type-label-sm text-text-2">Left</div>
                            <div className="mt-0.5 truncate type-code text-text-1">
                              {activeRun.left_label}
                            </div>
                          </div>
                        </div>
                      </FrameBody>

                      <FrameFooter>
                        <FrameMeta>{activeRun.run_id}</FrameMeta>
                        {activeRun.status === "awaiting_approval" ? (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={rejectRun}
                              data-testid="reject-purchase-btn"
                            >
                              Reject intent
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              pending={approving}
                              pendingLabel="Settling"
                              onClick={() => approveRun()}
                              data-testid="approve-purchase-btn"
                            >
                              {`Approve ${formatUsd(activeRun.amount_usd)} purchase`}
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setReceiptOpen(true)}
                            data-testid="inspect-settled-receipt-btn"
                          >
                            View mandate receipt
                          </Button>
                        )}
                      </FrameFooter>
                    </Frame>

                    {/* Sodium ToolCallStack (never nested inside a Frame) */}
                    <ToolCallStack
                      size={variant === "compact" ? "sm" : "default"}
                      typing={false}
                      clock={5000}
                      aria-label="Linked wallet execution steps"
                    >
                      {activeRun.steps.map((step) => (
                        <ToolCallRow
                          key={`${activeRun.run_id}-${step.id}-${step.state}`}
                          label={step.label}
                          detail={step.detail}
                          state={step.state}
                          tab={step.tab ?? undefined}
                          word={step.word ?? undefined}
                          duration={step.duration_ms ?? undefined}
                          defaultOpen={step.state === "waiting" || step.state === "failed"}
                        >
                          {step.output ? (
                            <div className="bg-well px-inset py-2.5 type-code-sm text-text-2 [overflow-wrap:anywhere]">
                              {step.output}
                            </div>
                          ) : undefined}
                        </ToolCallRow>
                      ))}
                    </ToolCallStack>
                  </div>
                </div>
              )}
            </div>
          </NumberedTabsContent>

          {/* [02] LEDGER */}
          <NumberedTabsContent value="ledger">
            <LedgerPanel
              rows={snapshot.ledger}
              theme={theme}
              onSelectRunId={(runId) => {
                setSelectedRunId(runId);
                setReceiptOpen(true);
              }}
            />
          </NumberedTabsContent>

          {/* [03] SCHEDULE & SDK */}
          <NumberedTabsContent value="schedule">
            <ScheduleSdkPanel
              schedule={snapshot.schedule}
              mcpTools={snapshot.mcp_tools}
            />
          </NumberedTabsContent>
        </NumberedTabs>
      </div>

      <ReceiptDialog
        run={activeRun ?? null}
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
      />
    </div>
  );
}
