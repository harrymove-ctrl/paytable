"use client";

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
import { Meter, MeterLabel, MeterStack, MeterValue } from "@/components/sodium/ui/meter";
import { Status } from "@/components/sodium/ui/status";
import { Button } from "@/components/sodium/ui/button";
import { formatUsd, type LinkedWallet, type TabletopRun } from "@/lib/types";

interface TabletopWidgetProps {
  run: TabletopRun;
  wallet: LinkedWallet;
  onInspectReceipt: () => void;
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

export function TabletopWidget({
  run,
  wallet,
  onInspectReceipt,
}: TabletopWidgetProps) {
  const w = run.widget as Record<string, any>;
  const projectedDaily =
    run.status === "approved_settled"
      ? wallet.daily_spent_usd
      : wallet.daily_spent_usd + run.amount_usd;

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

      {w.kind === "agent_linked_checkout" && Array.isArray(w.quotes) && (
        <FrameBody padding="none">
          <div className="divide-y divide-line-faint">
            {w.quotes.map((q: any, idx: number) => (
              <div
                key={idx}
                className={`flex min-h-(--row) items-center justify-between gap-3 px-inset py-2 ${
                  q.selected ? "selected" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate type-code text-text-1">{q.vendor}</div>
                  <div className="truncate type-caption text-text-2">
                    {q.shipping} {q.selected ? "· A2A negotiated winner" : ""}
                  </div>
                </div>
                <span className="shrink-0 type-code text-text-1">
                  {formatUsd(Number(q.quote_usd))}
                </span>
              </div>
            ))}
          </div>
        </FrameBody>
      )}

      {w.kind === "group_dinner_split" && Array.isArray(w.shares) && (
        <FrameBody>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <GeometricQrSvg seed={run.run_id} />
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
        </FrameBody>
      )}

      {w.kind === "multi_currency_invoice" && Array.isArray(w.splits) && (
        <FrameBody>
          <div className="flex flex-wrap items-baseline justify-between gap-2 border border-line bg-well px-inset py-2">
            <span className="type-label-sm text-text-2">Pay Later 4x Schedule</span>
            <span className="type-code text-text-1">
              4 x {formatUsd(Number(w.pay_later_installment_usd))} (EUR{" "}
              {Number(w.invoice_eur).toFixed(2)})
            </span>
          </div>
          <MeterStack
            label="Creator marketplace revenue split"
            parts={w.splits.map((s: any) => ({
              label: `${s.role} (${s.pct}%)`,
              value: Number(s.usd),
              display: formatUsd(Number(s.usd)),
            }))}
          />
        </FrameBody>
      )}

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
        </FrameBody>
      )}

      {w.kind === "community_solar_pool" && Array.isArray(w.causes) && (
        <FrameBody>
          <MeterStack
            label="Community multi-cause donation split"
            parts={w.causes.map((c: any) => ({
              label: `${c.cause} (${c.pct}%)`,
              value: Number(c.usd),
              display: formatUsd(Number(c.usd)),
            }))}
          />
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
