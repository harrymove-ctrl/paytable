import { expect, test } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const QA_DIR = path.resolve(__dirname, "../../docs/qa");
const PLATES_DIR = path.resolve(__dirname, "../../video/public/plates");

test.beforeAll(() => {
  fs.mkdirSync(QA_DIR, { recursive: true });
  fs.mkdirSync(PLATES_DIR, { recursive: true });
});

async function assertZeroHorizontalOverflowAndNoEmDashes(page: any) {
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const text = document.body.innerText || "";
    return {
      scrollWidth: doc.scrollWidth,
      innerWidth: window.innerWidth,
      hasEmDash: text.includes("\u2014") || text.includes("\u2013"),
    };
  });
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
  expect(metrics.hasEmDash).toBe(false);
}

test("PayTable linked wallet human approval, 5 PayPal tracks, QA guardrails, and responsive Sodium UI", async ({
  page,
  request,
}) => {
  // Reseed clean state first
  const reseed = await request.post("http://127.0.0.1:4184/api/state/reseed");
  expect(reseed.ok()).toBeTruthy();

  // Verify live PayPal Sandbox probe endpoint
  const probe = await request.post("http://127.0.0.1:4184/api/paypal/live-verify");
  expect(probe.ok()).toBeTruthy();
  const probeJson = await probe.json();
  fs.writeFileSync(
    path.join(QA_DIR, "paypal-sandbox-probe.json"),
    JSON.stringify(probeJson, null, 2)
  );

  // 1. Desktop Dark (1280x800): Initial pre-staged linked wallet purchase awaiting human approval
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/?theme=dark");
  await expect(page.getByRole("heading", { name: "PayTable" })).toBeVisible();
  await expect(page.getByTestId("approve-purchase-btn")).toContainText(
    "Approve $265.00 purchase"
  );
  await assertZeroHorizontalOverflowAndNoEmDashes(page);
  await page.screenshot({
    path: path.join(QA_DIR, "before-desktop.png"),
    fullPage: false,
  });

  // High-res 1920x1080 plate 01 for video: Awaiting Approval
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(180);
  await page.screenshot({
    path: path.join(PLATES_DIR, "plate-01-awaiting-approval.png"),
  });

  // 2. Approve linked-wallet purchase & verify SHA-256 mandate receipt dialog
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByTestId("approve-purchase-btn").click();
  await expect(page.getByTestId("status-banner")).toContainText(
    "Approved & settled"
  );
  await expect(page.getByTestId("inspect-settled-receipt-btn")).toBeVisible();
  await page.screenshot({
    path: path.join(QA_DIR, "after-desktop.png"),
    fullPage: false,
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(180);
  await page.screenshot({
    path: path.join(PLATES_DIR, "plate-02-approved-settled.png"),
  });

  // Open native <dialog> receipt and dismiss with Escape
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByTestId("inspect-settled-receipt-btn").click();
  await expect(
    page.getByRole("heading", { name: /mandate receipt/i })
  ).toBeVisible();
  await page.screenshot({
    path: path.join(PLATES_DIR, "plate-03-mandate-dialog.png"),
  });
  await page.keyboard.press("Escape");

  // 3. Cycle through remaining 4 official PayPal Developer Hackathon tracks
  await page.getByTestId("track-preset-group_dinner_split").click();
  await expect(page.getByTestId("approve-purchase-btn")).toContainText(
    "Approve $168.00 purchase"
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({
    path: path.join(PLATES_DIR, "plate-04-dinner-qr-split.png"),
  });
  await page.getByTestId("approve-purchase-btn").click();
  await expect(page.getByTestId("status-banner")).toContainText(
    "Approved & settled"
  );

  await page.getByTestId("track-preset-multi_currency_invoice").click();
  await expect(page.getByTestId("approve-purchase-btn")).toContainText(
    "Approve $453.60 purchase"
  );
  await page.screenshot({
    path: path.join(PLATES_DIR, "plate-05-fx-creator-split.png"),
  });

  await page.getByTestId("track-preset-consumer_budget_shield").click();
  await expect(page.getByTestId("approve-purchase-btn")).toContainText(
    "Approve $74.00 purchase"
  );

  await page.getByTestId("track-preset-community_solar_pool").click();
  await expect(page.getByTestId("approve-purchase-btn")).toContainText(
    "Approve $240.00 purchase"
  );

  // 4. Verify [02] Ledger (AG Grid v36) & [03] Schedule & SDK tabs
  await page.getByTestId("tab-ledger").click();
  await expect(page.getByText("sandbox-reconciliation-ledger")).toBeVisible();
  await page.screenshot({
    path: path.join(PLATES_DIR, "plate-06-aggrid-ledger.png"),
  });

  await page.getByTestId("tab-schedule").click();
  await expect(page.getByText("milestone-payout-schedule")).toBeVisible();
  await expect(page.getByText("paypal-mcp-apimatic-contracts")).toBeVisible();
  await page.screenshot({
    path: path.join(PLATES_DIR, "plate-07-schedule-sdk.png"),
  });

  // 5. Light mode + Adversarial QA guardrails (?debug=1)
  await page.getByTestId("tab-tabletop").click();
  await page.getByTestId("theme-toggle-btn").click();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(380);
  await assertZeroHorizontalOverflowAndNoEmDashes(page);
  await page.screenshot({
    path: path.join(QA_DIR, "desktop-light.png"),
  });
  await page.getByTestId("theme-toggle-btn").click();
  await page.waitForTimeout(380);

  await page.getByTestId("qa-toggle-btn").click();
  await expect(page.getByTestId("qa-debug-bar")).toBeVisible();

  await page.getByTestId("qa-overspend-btn").click();
  await expect(page.getByTestId("status-banner")).toContainText(
    "SINGLE_PURCHASE_CAP_EXCEEDED"
  );

  await page.getByTestId("qa-stress-btn").click();
  await assertZeroHorizontalOverflowAndNoEmDashes(page);

  await page.getByTestId("qa-decline-btn").click();
  await expect(page.getByTestId("status-banner")).toContainText(
    "INSTRUMENT_DECLINED"
  );

  // 6. Mobile viewport (390x844) Before & After
  await page.getByTestId("reseed-btn").click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  await assertZeroHorizontalOverflowAndNoEmDashes(page);
  await page.screenshot({
    path: path.join(QA_DIR, "before-mobile.png"),
  });
  await page.getByTestId("approve-purchase-btn").click();
  await expect(page.getByTestId("status-banner")).toContainText(
    "Approved & settled"
  );
  await assertZeroHorizontalOverflowAndNoEmDashes(page);
  await page.screenshot({
    path: path.join(QA_DIR, "after-mobile.png"),
  });
});
