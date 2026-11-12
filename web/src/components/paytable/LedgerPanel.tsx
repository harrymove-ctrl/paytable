"use client";

import { useMemo, useState } from "react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { Button } from "@/components/sodium/ui/button";
import {
  Frame,
  FrameActions,
  FrameBody,
  FrameFooter,
  FrameHeader,
  FrameMeta,
  FrameTitle,
  FrameValue,
} from "@/components/sodium/ui/frame";
import { formatUsd, type LedgerRow } from "@/lib/types";

ModuleRegistry.registerModules([AllCommunityModule]);

interface LedgerPanelProps {
  rows: LedgerRow[];
  theme: "dark" | "light";
  onSelectRunId: (runId: string) => void;
}

export function LedgerPanel({ rows, theme, onSelectRunId }: LedgerPanelProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.run_id.toLowerCase().includes(q) ||
        r.track_title.toLowerCase().includes(q) ||
        r.counterparty.toLowerCase().includes(q) ||
        r.paypal_ref.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
    );
  }, [rows, query]);

  const gridTheme = useMemo(() => {
    return themeQuartz.withParams(
      theme === "dark"
        ? {
            backgroundColor: "#141412",
            headerBackgroundColor: "#1c1b19",
            oddRowBackgroundColor: "#161614",
            foregroundColor: "#f5f3ee",
            borderColor: "#2c2a25",
            borderRadius: 0,
            wrapperBorderRadius: 0,
            fontFamily: '"Commit Mono", ui-monospace, monospace',
            fontSize: 12,
          }
        : {
            backgroundColor: "#ffffff",
            headerBackgroundColor: "#fafaf7",
            oddRowBackgroundColor: "#fbfbf8",
            foregroundColor: "#161512",
            borderColor: "#e2dfd5",
            borderRadius: 0,
            wrapperBorderRadius: 0,
            fontFamily: '"Commit Mono", ui-monospace, monospace',
            fontSize: 12,
          }
    );
  }, [theme]);

  const cols = useMemo<ColDef<LedgerRow>[]>(
    () => [
      { field: "run_id", headerName: "RUN", width: 128, pinned: "left" },
      { field: "track_code", headerName: "TRK", width: 72 },
      { field: "track_title", headerName: "WORKFLOW", minWidth: 190, flex: 1 },
      { field: "counterparty", headerName: "COUNTERPARTY", minWidth: 190, flex: 1 },
      {
        field: "amount_usd",
        headerName: "USD",
        width: 112,
        valueFormatter: (p) => formatUsd(Number(p.value ?? 0)),
      },
      { field: "approval_gate", headerName: "HUMAN GATE", width: 175 },
      { field: "paypal_ref", headerName: "PAYPAL REF", width: 155 },
      { field: "status", headerName: "STATUS", width: 145 },
    ],
    []
  );

  const exportCsv = () => {
    const header = [
      "run_id",
      "track_code",
      "track_title",
      "counterparty",
      "amount_usd",
      "approval_gate",
      "paypal_ref",
      "mandate_hash",
      "status",
    ];
    const lines = [
      header.join(","),
      ...filtered.map((r) =>
        [
          r.run_id,
          r.track_code,
          `"${r.track_title.replace(/"/g, '""')}"`,
          `"${r.counterparty.replace(/"/g, '""')}"`,
          r.amount_usd.toFixed(2),
          `"${r.approval_gate}"`,
          r.paypal_ref,
          r.mandate_hash,
          r.status,
        ].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "paytable-sandbox-ledger.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Frame aria-label="PayPal Sandbox AG Grid reconciliation ledger">
      <FrameHeader>
        <FrameTitle id="ledger-grid-title">sandbox-reconciliation-ledger</FrameTitle>
        <FrameValue meta>{filtered.length} rows · AG Grid v36</FrameValue>
        <FrameActions>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter run, ref, status"
            aria-label="Filter reconciliation ledger"
            className="field h-(--control-sm) w-44 px-2 type-code-sm text-text-1 placeholder:text-text-3"
          />
          <Button variant="secondary" size="sm" onClick={exportCsv}>
            Export CSV
          </Button>
        </FrameActions>
      </FrameHeader>
      <FrameBody padding="none">
        <div
          tabIndex={0}
          role="region"
          aria-labelledby="ledger-grid-title"
          className="h-[360px] w-full min-w-0 overflow-x-auto"
        >
          <AgGridReact<LedgerRow>
            theme={gridTheme}
            rowData={filtered}
            columnDefs={cols}
            rowHeight={38}
            headerHeight={34}
            onRowClicked={(e) => {
              if (e.data?.run_id) onSelectRunId(e.data.run_id);
            }}
          />
        </div>
      </FrameBody>
      <FrameFooter>
        <FrameMeta>Click any ledger row to inspect its SHA-256 mandate receipt</FrameMeta>
      </FrameFooter>
    </Frame>
  );
}
