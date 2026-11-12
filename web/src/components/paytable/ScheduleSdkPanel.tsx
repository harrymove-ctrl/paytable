"use client";

import {
  Frame,
  FrameBody,
  FrameHeader,
  FrameTitle,
  FrameValue,
} from "@/components/sodium/ui/frame";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/sodium/ui/progress";
import { Status } from "@/components/sodium/ui/status";
import {
  formatUsd,
  type McpToolDescriptor,
  type ScheduleMilestone,
} from "@/lib/types";

interface ScheduleSdkPanelProps {
  schedule: ScheduleMilestone[];
  mcpTools: McpToolDescriptor[];
}

export function ScheduleSdkPanel({
  schedule,
  mcpTools,
}: ScheduleSdkPanelProps) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
      <Frame aria-label="Payment-gated milestone schedule">
        <FrameHeader>
          <FrameTitle id="schedule-heading">milestone-payout-schedule</FrameTitle>
          <FrameValue meta>Bryntum timeline model</FrameValue>
        </FrameHeader>
        <FrameBody padding="none">
          <div className="divide-y divide-line-faint">
            {schedule.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 p-inset">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 truncate type-code text-text-1">
                    [{item.track_code}] {item.milestone}
                  </span>
                  <Status
                    size="sm"
                    status={
                      item.gate_state === "Settled" ||
                      item.gate_state === "Protected"
                        ? "ok"
                        : item.gate_state === "Needs approval"
                          ? "warn"
                          : "queued"
                    }
                  >
                    {item.gate_state}
                  </Status>
                </div>
                <Progress value={item.progress_pct} min={0} max={100} size="sm">
                  <ProgressLabel>
                    {item.window} · {item.paypal_api}
                  </ProgressLabel>
                  <ProgressValue>
                    {() => `${formatUsd(item.amount_usd)} (${item.progress_pct}%)`}
                  </ProgressValue>
                </Progress>
              </div>
            ))}
          </div>
        </FrameBody>
      </Frame>

      <Frame aria-label="APIMatic typed SDK and PayPal MCP tool registry">
        <FrameHeader>
          <FrameTitle id="sdk-table-heading">paypal-mcp-apimatic-contracts</FrameTitle>
          <FrameValue meta>{mcpTools.length} tools</FrameValue>
        </FrameHeader>
        <FrameBody padding="none">
          <div
            tabIndex={0}
            role="region"
            aria-labelledby="sdk-table-heading"
            className="paytable-table-wrap max-h-[380px] w-full overflow-auto"
          >
            <table className="min-w-[520px] w-full table-fixed border-collapse text-start sm:min-w-0">
              <thead className="sticky top-0 z-10 bg-panel">
                <tr className="border-b border-line">
                  <th
                    scope="col"
                    className="w-[35%] px-inset py-2 text-start type-label-sm text-text-2"
                  >
                    MCP Tool
                  </th>
                  <th
                    scope="col"
                    className="w-[43%] px-inset py-2 text-start type-label-sm text-text-2"
                  >
                    REST & APIMatic SDK
                  </th>
                  <th
                    scope="col"
                    className="w-[22%] whitespace-nowrap px-inset py-2 text-start type-label-sm text-text-2"
                  >
                    Gate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-faint">
                {mcpTools.map((tool) => (
                  <tr key={tool.tool_name} className="align-top">
                    <th
                      scope="row"
                      className="break-all px-inset py-2.5 text-start type-code-sm font-normal text-text-1"
                    >
                      {tool.tool_name}
                    </th>
                    <td className="break-words px-inset py-2.5">
                      <div className="break-all type-code-sm text-text-1">
                        {tool.paypal_endpoint}
                      </div>
                      <div className="break-all type-caption text-text-2">
                        {tool.apimatic_method}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-inset py-2.5">
                      <Status
                        size="sm"
                        className="whitespace-nowrap"
                        status={tool.requires_human_approval ? "warn" : "ok"}
                      >
                        {tool.requires_human_approval ? "Human sign" : "Read safe"}
                      </Status>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FrameBody>
      </Frame>
    </div>
  );
}
