"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/sodium/ui/button";
import {
  DataList,
  DataListItem,
  DataListLabel,
  DataListValue,
} from "@/components/sodium/ui/data-list";
import { Status } from "@/components/sodium/ui/status";
import { formatUsd, type TabletopRun } from "@/lib/types";

interface ReceiptDialogProps {
  run: TabletopRun | null;
  open: boolean;
  onClose: () => void;
}

export function ReceiptDialog({ run, open, onClose }: ReceiptDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Safari / older browser light-dismiss fallback when closedBy is unsupported
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = () => onClose();
    dialog.addEventListener("close", handleCancel);

    let pointerStartedInside = false;
    const onPointerDown = (e: PointerEvent) => {
      const rect = dialog.getBoundingClientRect();
      pointerStartedInside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
    };
    const onClick = (e: MouseEvent) => {
      if ("closedBy" in HTMLDialogElement.prototype) return;
      if (e.target !== dialog || pointerStartedInside) return;
      const rect = dialog.getBoundingClientRect();
      const outside =
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom;
      if (outside) dialog.close("dismiss");
    };

    dialog.addEventListener("pointerdown", onPointerDown);
    dialog.addEventListener("click", onClick);
    return () => {
      dialog.removeEventListener("close", handleCancel);
      dialog.removeEventListener("pointerdown", onPointerDown);
      dialog.removeEventListener("click", onClick);
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="receipt-dialog-title"
      className="paytable-dialog m-auto w-[min(calc(100vw-24px),var(--overlay-lg))] border border-line bg-panel p-0 text-text-1"
    >
      {run && (
        <div className="flex min-w-0 flex-col">
          <header className="panel-head justify-between">
            <h2
              id="receipt-dialog-title"
              className="min-w-0 truncate type-code text-text-1"
            >
              {run.run_id} · mandate receipt
            </h2>
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
              {run.status === "approved_settled"
                ? "Settled"
                : run.status === "awaiting_approval"
                  ? "Needs approval"
                  : "Halted"}
            </Status>
          </header>
          <div className="p-inset">
            <DataList variant="plain">
              <DataListItem>
                <DataListLabel>Track</DataListLabel>
                <DataListValue>{run.track_title}</DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Merchant</DataListLabel>
                <DataListValue>{run.merchant}</DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Authorized USD</DataListLabel>
                <DataListValue>{formatUsd(run.amount_usd)}</DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Human Approver</DataListLabel>
                <DataListValue>{run.approver ?? "Pending signature"}</DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Execution Mode</DataListLabel>
                <DataListValue>{run.execution_mode}</DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>PayPal Order / Invoice</DataListLabel>
                <DataListValue>
                  {run.paypal_order_id ?? run.paypal_invoice_id ?? "None"}
                </DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>PayPal Capture / Payout</DataListLabel>
                <DataListValue>
                  {[run.paypal_capture_id, run.paypal_payout_batch_id, run.paypal_tracker_id]
                    .filter(Boolean)
                    .join(" · ") || "None"}
                </DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>SHA-256 Mandate</DataListLabel>
                <DataListValue className="break-all">
                  {run.mandate_hash ?? "Unsigned until human owner approves"}
                </DataListValue>
              </DataListItem>
            </DataList>
          </div>
          <footer className="flex items-center justify-end gap-2 border-t border-line p-inset">
            <span className="me-auto type-code-sm text-text-2">
              Esc or backdrop click closes
            </span>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close receipt
            </Button>
          </footer>
        </div>
      )}
    </dialog>
  );
}
