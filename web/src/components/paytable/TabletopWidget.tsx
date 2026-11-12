"use client";

import { useState } from "react";
import {
  Frame,
  FrameBody,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FrameMeta,
  FrameStatus,
  FrameTitle,
} from "@/components/sodium/ui/frame";
import {
  Meter,
  MeterLabel,
  MeterStack,
  MeterValue,
} from "@/components/sodium/ui/meter";
import { Status } from "@/components/sodium/ui/status";
import { Button } from "@/components/sodium/ui/button";
import {
  formatUsd,
  type LinkedWallet,
  type TabletopRun,
  type TrackSlug,
} from "@/lib/types";
import { soundEngine } from "@/lib/sound-engine";

interface TabletopWidgetProps {
  run: TabletopRun;
  wallet: LinkedWallet;
  onInspectReceipt: () => void;
  onRestageScenario: (
    track: TrackSlug,
    prompt: string,
    amountUsd: number
  ) => Promise<void>;
  onUpdateWalletPolicy: (
    maxSingleUsd: number,
    dailyCapUsd: number
  ) => Promise<void>;
}

function GeometricQrSvg({ seed }: { seed: string }) {
  const cells: boolean[] = [];
  for (let i = 0; i < 81; i++) {
    const code = seed.charCodeAt(i % seed.length) + i * 17;
    const row = Math.floor(i / 9);
    const col = i % 9;
    const finder =
      (row < 3 && col < 3) || (row < 3 && col > 5) || (row > 5 && col < 3);
    cells.push(finder || code % 3 === 0);
  }
  return (
    <svg
      viewBox="0 0 90 90"
      className="size-20 shrink-0 border border-line-control bg-page p-1 text-text-1"
      role="img"
      aria-label="PayPal Invoicing v2 QR code"
    >
      {cells.map((lit, idx) =>
        lit ? (
          <rect
            key={idx}
            x={(idx % 9) * 10}
            y={Math.floor(idx / 9) * 10}
            width="8.5"
            height="8.5"
            fill="currentColor"
          />
        ) : null
      )}
    </svg>
  );
}

const FX_RATES: Record<"EUR" | "GBP" | "JPY" | "CAD", number> = {
  EUR: 1.08,
  GBP: 1.27,
  JPY: 0.0067,
  CAD: 0.73,
};

export function TabletopWidget({
  run,
  wallet,
  onInspectReceipt,
  onRestageScenario,
  onUpdateWalletPolicy,
}: TabletopWidgetProps) {
  const w = run.widget as Record<string, any>;
  const projectedDaily =
    run.status === "approved_settled"
      ? wallet.daily_spent_usd
      : wallet.daily_spent_usd + run.amount_usd;

  // Interactive Track 01 state: vendor choice & live policy cap tuner
  const [selectedVendorIdx, setSelectedVendorIdx] = useState<number>(0);
  const [singleCapInput, setSingleCapInput] = useState<string>(
    wallet.max_per_purchase_usd.toFixed(0)
  );
  const [dailyCapInput, setDailyCapInput] = useState<string>(
    wallet.daily_cap_usd.toFixed(0)
  );

  // Interactive Track 02 state: receipt subtotal, diners, tip %
  const [dinnerSubtotal, setDinnerSubtotal] = useState<number>(142.37);
  const [dinerCount, setDinerCount] = useState<number>(4);
  const [tipPct, setTipPct] = useState<number>(18);

  // Interactive Track 03 state: currency & foreign amount
  const [fxCurrency, setFxCurrency] = useState<"EUR" | "GBP" | "JPY" | "CAD">(
    "EUR"
  );
  const [fxAmount, setFxAmount] = useState<number>(420);

  // Interactive Track 04 state: household request link + dispute shield
  const [requestUsd, setRequestUsd] = useState<number>(74);
  const [disputeHold, setDisputeHold] = useState<boolean>(true);

  // Interactive Track 05 state: community pool amount
  const [poolUsd, setPoolUsd] = useState<number>(240);

  const dinnerTotal =
    Math.round(dinnerSubtotal * (1 + tipPct / 100) * 100) / 100;
  const perDinerUsd = Math.round((dinnerTotal / dinerCount) * 100) / 100;
  const convertedFxUsd =
    Math.round(fxAmount * FX_RATES[fxCurrency] * 100) / 100;

  return (
    <Frame aria-label="Collaborative tabletop artifact">
      <FrameHeader>
        <FrameTitle>{run.track_title}</FrameTitle>
        <FrameStatus>
          <Status
            size="sm"
            status={
              run.status === "approved_settled"
                ? "ok"
                : run.status === "awaiting_approval"
                  ? "warn"
                  : "fail"
            }
          >
            {run.track_category}
          </Status>
        </FrameStatus>
      </FrameHeader>

      <FrameBody>
        <FrameDescription>{run.prompt}</FrameDescription>

        <div className="flex flex-wrap gap-1.5">
          {run.paypal_capabilities.map((cap) => (
            <span
              key={cap}
              className="border border-line bg-well px-2 py-0.5 type-micro text-text-2"
            >
              {cap}
            </span>
          ))}
        </div>

        <Meter
          value={Math.min(projectedDaily, wallet.daily_cap_usd)}
          min={0}
          max={wallet.daily_cap_usd}
          warnAt={0.8}
          failAt={1}
        >
          <MeterLabel>Projected daily linked-wallet utilization</MeterLabel>
          <MeterValue>
            {() =>
              `${formatUsd(projectedDaily)} / ${formatUsd(wallet.daily_cap_usd)}`
            }
          </MeterValue>
        </Meter>
      </FrameBody>

      {/* Track 01: Interactive Vendor Quote Selector + Live Linked-Wallet Policy Tuner */}
      {w.kind === "agent_linked_checkout" && Array.isArray(w.quotes) && (
        <FrameBody padding="none">
          <div className="divide-y divide-line-faint">
            {w.quotes.map((q: any, idx: number) => {
              const active = idx === selectedVendorIdx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick("light");
                    setSelectedVendorIdx(idx);
                  }}
                  className={`flex min-h-(--row) w-full cursor-pointer items-center justify-between gap-3 px-inset py-2 text-start transition-colors ${
                    active ? "selected" : "hover:bg-hover"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate type-code text-text-1">
                      {q.vendor}
                    </div>
                    <div className="truncate type-caption text-text-2">
                      {q.shipping} {q.selected ? "· A2A negotiated best" : "· Click to select"}
                    </div>
                  </div>
                  <span className="shrink-0 type-code text-text-1">
                    {formatUsd(Number(q.quote_usd))}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 border-t border-line bg-well p-inset">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="type-label-sm text-text-2">
                Interactive Spend Policy & Vendor Controls
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const chosen = w.quotes[selectedVendorIdx] ?? w.quotes[0];
                  void onRestageScenario(
                    "agent_linked_checkout",
                    `@paytable Purchase Dell UltraSharp 27 USB-C Monitor via ${chosen.vendor} at ${formatUsd(Number(chosen.quote_usd))} and hold for owner approval`,
                    Number(chosen.quote_usd)
                  );
                }}
              >
                Stage selected quote
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="flex items-center justify-between gap-2 border border-line bg-panel px-2.5 py-1.5">
                <span className="type-label-sm text-text-2">Single Cap</span>
                <input
                  type="number"
                  min={50}
                  max={5000}
                  value={singleCapInput}
                  onChange={(e) => setSingleCapInput(e.target.value)}
                  aria-label="Single purchase cap USD"
                  data-testid="policy-single-cap-input"
                  className="w-20 bg-transparent text-end type-code-sm text-text-1 focus:outline-none"
                />
              </label>
              <label className="flex items-center justify-between gap-2 border border-line bg-panel px-2.5 py-1.5">
                <span className="type-label-sm text-text-2">Daily Cap</span>
                <input
                  type="number"
                  min={100}
                  max={10000}
                  value={dailyCapInput}
                  onChange={(e) => setDailyCapInput(e.target.value)}
                  aria-label="Daily spend cap USD"
                  data-testid="policy-daily-cap-input"
                  className="w-20 bg-transparent text-end type-code-sm text-text-1 focus:outline-none"
                />
              </label>
              <Button
                variant="secondary"
                size="sm"
                data-testid="apply-wallet-policy-btn"
                onClick={() =>
                  void onUpdateWalletPolicy(
                    Number(singleCapInput) || 500,
                    Number(dailyCapInput) || 1500
                  )
                }
              >
                Save wallet caps
              </Button>
            </div>
          </div>
        </FrameBody>
      )}

      {/* Track 02: Interactive Dinner Receipt & Tip QR Split Calculator */}
      {w.kind === "group_dinner_split" && Array.isArray(w.shares) && (
        <FrameBody>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <GeometricQrSvg seed={`${run.run_id}-${dinerCount}-${tipPct}`} />
            <div className="min-w-0 flex-1 divide-y divide-line-faint border border-line">
              {w.shares.map((s: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 px-3 py-1.5"
                >
                  <span className="truncate type-body-sm text-text-1">
                    {s.member}
                  </span>
                  <span className="shrink-0 type-code text-text-1">
                    {formatUsd(Number(s.share_usd))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 border border-line bg-well p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="type-label-sm text-text-2">
                Live Receipt Split Calculator ({dinerCount} diners · {tipPct}% tip = {formatUsd(perDinerUsd)}/person)
              </span>
              <Button
                variant="secondary"
                size="sm"
                data-testid="restage-dinner-split-btn"
                onClick={() =>
                  void onRestageScenario(
                    "group_dinner_split",
                    `@paytable Split ${formatUsd(dinnerTotal)} dinner receipt (${tipPct}% tip) across ${dinerCount} friends (${formatUsd(perDinerUsd)} each) via PayPal QR`,
                    dinnerTotal
                  )
                }
              >
                Stage {formatUsd(dinnerTotal)} QR split
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <label className="flex items-center justify-between border border-line bg-panel px-2 py-1">
                <span className="type-label-sm text-text-2">Diners</span>
                <select
                  value={dinerCount}
                  onChange={(e) => {
                    soundEngine.playClick("light");
                    setDinerCount(Number(e.target.value));
                  }}
                  data-testid="dinner-count-select"
                  className="bg-transparent type-code-sm text-text-1 focus:outline-none"
                >
                  {[2, 3, 4, 5, 6, 8].map((n) => (
                    <option key={n} value={n} className="bg-panel text-text-1">
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center justify-between border border-line bg-panel px-2 py-1">
                <span className="type-label-sm text-text-2">Tip</span>
                <select
                  value={tipPct}
                  onChange={(e) => {
                    soundEngine.playClick("light");
                    setTipPct(Number(e.target.value));
                  }}
                  className="bg-transparent type-code-sm text-text-1 focus:outline-none"
                >
                  {[0, 15, 18, 20].map((pct) => (
                    <option key={pct} value={pct} className="bg-panel text-text-1">
                      {pct}%
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center justify-between border border-line bg-panel px-2 py-1">
                <span className="type-label-sm text-text-2">Bill</span>
                <input
                  type="number"
                  min={20}
                  max={400}
                  step={1}
                  value={dinnerSubtotal}
                  onChange={(e) => setDinnerSubtotal(Number(e.target.value) || 0)}
                  className="w-16 bg-transparent text-end type-code-sm text-text-1 focus:outline-none"
                />
              </label>
            </div>
          </div>
        </FrameBody>
      )}

      {/* Track 03: Interactive Multi-Currency & Pay Later Creator Split */}
      {w.kind === "multi_currency_invoice" && Array.isArray(w.splits) && (
        <FrameBody>
          <div className="flex flex-wrap items-baseline justify-between gap-2 border border-line bg-well px-inset py-2">
            <span className="type-label-sm text-text-2">Pay Later 4x Schedule</span>
            <span className="type-code text-text-1">
              4 x {formatUsd(convertedFxUsd / 4)} ({fxCurrency} {fxAmount.toFixed(0)} = {formatUsd(convertedFxUsd)})
            </span>
          </div>
          <MeterStack
            label="Creator marketplace revenue split (60 / 30 / 10)"
            parts={w.splits.map((s: any) => ({
              label: `${s.role} (${s.pct}%)`,
              value: Number(s.usd),
              display: formatUsd(Number(s.usd)),
            }))}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border border-line bg-well p-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {(["EUR", "GBP", "JPY", "CAD"] as const).map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick("light");
                    setFxCurrency(cur);
                    setFxAmount(cur === "JPY" ? 58000 : 420);
                  }}
                  className={`cursor-pointer border px-2 py-1 type-label-sm ${
                    fxCurrency === cur
                      ? "selected border-accent-edge text-text-1"
                      : "border-line bg-panel text-text-2"
                  }`}
                >
                  {cur}
                </button>
              ))}
              <input
                type="number"
                value={fxAmount}
                onChange={(e) => setFxAmount(Number(e.target.value) || 100)}
                aria-label="Foreign currency invoice amount"
                className="h-7 w-24 border border-line bg-panel px-2 type-code-sm text-text-1"
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                void onRestageScenario(
                  "multi_currency_invoice",
                  `@paytable Bill overseas client ${fxCurrency} ${fxAmount} (${formatUsd(convertedFxUsd)}) with Pay Later 4x and split 60/30/10`,
                  Math.min(convertedFxUsd, wallet.max_per_purchase_usd)
                )
              }
            >
              Stage {fxCurrency} invoice
            </Button>
          </div>
        </FrameBody>
      )}

      {/* Track 04: Interactive Budget Audit & Dispute Shield */}
      {w.kind === "consumer_budget_shield" && Array.isArray(w.categories) && (
        <FrameBody>
          <div className="flex flex-wrap items-center justify-between gap-2 border border-warn bg-warn-tint px-inset py-2">
            <span className="type-label-sm text-warn-text">
              Duplicate subscription flagged
            </span>
            <span className="type-code text-warn-text">
              Saved {formatUsd(Number(w.duplicate_saved_usd))}/mo
            </span>
          </div>
          <MeterStack
            label="30-day PayPal spend categories"
            parts={w.categories.map((c: any) => ({
              label: c.category,
              value: Number(c.spent_usd),
              display: formatUsd(Number(c.spent_usd)),
            }))}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border border-line bg-well p-2.5">
            <label className="flex cursor-pointer items-center gap-2 type-caption text-text-1">
              <input
                type="checkbox"
                checked={disputeHold}
                onChange={(e) => setDisputeHold(e.target.checked)}
                className="accent-[#ffd400]"
              />
              <span>Auto-hold duplicate $29 CloudRender charge</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={10}
                max={400}
                value={requestUsd}
                onChange={(e) => setRequestUsd(Number(e.target.value) || 50)}
                aria-label="Household request money USD"
                className="h-7 w-20 border border-line bg-panel px-2 type-code-sm text-text-1"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  void onRestageScenario(
                    "consumer_budget_shield",
                    `@paytable Scan 30-day Reporting v1${disputeHold ? ", hold duplicate $29 subscription," : ""} and create ${formatUsd(requestUsd)} Request Money link`,
                    requestUsd
                  )
                }
              >
                Stage Request Link
              </Button>
            </div>
          </div>
        </FrameBody>
      )}

      {/* Track 05: Interactive Community Solar Co-op Pool */}
      {w.kind === "community_solar_pool" && Array.isArray(w.causes) && (
        <FrameBody>
          <MeterStack
            label="Community multi-cause donation split (40 / 35 / 25)"
            parts={w.causes.map((c: any) => ({
              label: `${c.cause} (${c.pct}%)`,
              value: Number(c.usd),
              display: formatUsd(Number(c.usd)),
            }))}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border border-line bg-well p-2.5">
            <div className="flex items-center gap-1.5">
              {[120, 240, 360].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick("light");
                    setPoolUsd(amt);
                  }}
                  className={`cursor-pointer border px-2.5 py-1 type-label-sm ${
                    poolUsd === amt
                      ? "selected border-accent-edge text-text-1"
                      : "border-line bg-panel text-text-2"
                  }`}
                >
                  {formatUsd(amt)}
                </button>
              ))}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                void onRestageScenario(
                  "community_solar_pool",
                  `@paytable Pool ${formatUsd(poolUsd)} community grant across Block 14 Solar (40%), Microloans (35%), and Harbor Cleanup (25%)`,
                  poolUsd
                )
              }
            >
              Stage {formatUsd(poolUsd)} pool
            </Button>
          </div>
        </FrameBody>
      )}

      <FrameFooter>
        <FrameMeta>{run.merchant}</FrameMeta>
        <Button variant="secondary" size="sm" onClick={onInspectReceipt}>
          Inspect mandate
        </Button>
      </FrameFooter>
    </Frame>
  );
}
