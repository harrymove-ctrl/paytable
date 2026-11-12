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

test("PayTable v2 linked wallet policy, 4-step guide, sound/music, interactive calculators, asciicn studio, and responsive Sodium UI", async ({
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

  // 1. Desktop Dark (1280x800): Initial pre-staged linked wallet purchase, 4-step guide, sound/score toggles
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/?theme=dark");
  await expect(page.getByRole("heading", { name: "PayTable" })).toBeVisible();
  await expect(page.getByTestId("how-it-works-guide")).toBeVisible();
  await expect(page.getByTestId("sfx-toggle-btn")).toBeVisible();
  await expect(page.getByTestId("music-toggle-btn")).toBeVisible();
  await expect(page.getByTestId("approve-purchase-btn")).toContainText(
    "Approve $265.00 purchase"
  );
  await assertZeroHorizontalOverflowAndNoEmDashes(page);
  await page.screenshot({
    path: path.join(QA_DIR, "before-desktop.png"),
    fullPage: false,
  });

  // Toggle ambient score and SFX safely
  await page.getByTestId("music-toggle-btn").click();
  await expect(page.getByTestId("music-toggle-btn")).toContainText("Score Playing");
  await page.getByTestId("music-toggle-btn").click();
  await expect(page.getByTestId("music-toggle-btn")).toContainText("Play Score");

  // High-res 16:9 plate 01 for video: Awaiting Approval + 4-Step Guide + ASCII Hero Backdrop
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(220);
  await page.screenshot({
    path: path.join(PLATES_DIR, "plate-01-awaiting-approval.png"),
  });

  // Collapse onboarding banner after plate-01 so plates 02..08 show full uncropped workspace panels
  await page.getByTestId("guide-toggle-btn").click();
  await expect(page.getByTestId("how-it-works-guide")).toBeHidden();

  // Live Linked-Wallet Policy Cap tuner (POST /api/wallet/policy)
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByTestId("policy-single-cap-input").fill("900");
  await page.getByTestId("policy-daily-cap-input").fill("2500");
  await page.getByTestId("apply-wallet-policy-btn").click();
  await expect(page.getByTestId("status-banner")).toContainText(
    "Updated Linked Wallet caps: $900.00 per purchase, $2,500.00 daily."
  );

  // Reseed back to canonical $500/$1,500 caps before approving purchase
  await page.getByTestId("reseed-btn").click();
  await expect(page.getByTestId("approve-purchase-btn")).toContainText(
    "Approve $265.00 purchase"
  );

  // 2. Approve linked-wallet purchase & verify SHA-256 mandate receipt dialog
  await page.getByTestId("approve-purchase-btn").click();
  await expect(page.getByTestId("status-banner")).toContainText(
    "Approved & settled"
  );
  await expect(page.getByTestId("inspect-settled-receipt-btn")).toBeVisible();
  await page.screenshot({
    path: path.join(QA_DIR, "after-desktop.png"),
    fullPage: false,
  });

  await page.setViewportSize({ width: 1600, height: 900 });
  await page.waitForTimeout(200);
  await page.screenshot({
    path: path.join(PLATES_DIR, "plate-02-approved-settled.png"),
  });

  // Open native <dialog> receipt and dismiss with Escape
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByTestId("inspect-settled-receipt-btn").click();
  await expect(
    page.getByRole("heading", { name: /mandate receipt/i })
  ).toBeVisible();
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.screenshot({
    path: path.join(PLATES_DIR, "plate-03-mandate-dialog.png"),
  });
  await page.keyboard.press("Escape");

  // 3. Cycle through remaining 4 official PayPal Developer Hackathon tracks + interactive calculators
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByTestId("track-preset-group_dinner_split").click();
  await expect(page.getByTestId("approve-purchase-btn")).toContainText(
    "Approve $168.00 purchase"
  );
  // Test interactive Dinner QR Split calculator (6 diners -> $28.00/person)
  await page.getByTestId("dinner-count-select").selectOption("6");
  await expect(page.getByText("$28.00/person")).toBeVisible();
  await page.getByTestId("restage-dinner-split-btn").click();
  await expect(page.getByTestId("approve-purchase-btn")).toContainText(
    "Approve $168.00 purchase"
  );

  await page.setViewportSize({ width: 1600, height: 900 });
  await page.waitForTimeout(180);
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
  await page.waitForTimeout(180);
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

  // 4. Verify [02] Ledger (AG Grid v36), [03] Schedule & SDK, and [04] Launch & ASCII Studio tabs
  await page.getByTestId("tab-ledger").click();
  await expect(page.getByText("sandbox-reconciliation-ledger")).toBeVisible();
  await page.waitForTimeout(180);
  await page.screenshot({
    path: path.join(PLATES_DIR, "plate-06-aggrid-ledger.png"),
  });

  await page.getByTestId("tab-schedule").click();
  await expect(page.getByText("milestone-payout-schedule")).toBeVisible();
  await expect(page.getByText("paypal-mcp-apimatic-contracts")).toBeVisible();
  await page.waitForTimeout(180);
  await page.screenshot({
    path: path.join(PLATES_DIR, "plate-07-schedule-sdk.png"),
  });

  // [04] Launch & ASCII Studio (asciicn 3D scenes, shaders, .txt/.svg/.png/.webm export, agent prompt)
  await page.getByTestId("tab-studio").click();
  await expect(page.getByTestId("ascii-studio-frame")).toBeVisible();
  await page.getByTestId("ascii-scene-donut").click();
  await page.waitForTimeout(260);
  await page.getByTestId("ascii-scene-globe").click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(PLATES_DIR, "plate-08-ascii-studio.png"),
  });

  await page.getByTestId("export-ascii-txt-btn").click();
  await expect(page.getByTestId("ascii-txt-preview")).toBeVisible();
  const txtPreview = await page.getByTestId("ascii-txt-preview").innerText();
  expect(txtPreview.trim().length).toBeGreaterThan(20);
  await page.getByTestId("copy-agent-prompt-btn").click();
  await assertZeroHorizontalOverflowAndNoEmDashes(page);

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
  await page.waitForTimeout(180);
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
