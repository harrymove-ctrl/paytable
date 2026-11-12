# PayPal AI Hackathon Complete Devpost Submission Kit (PayTable v2.0)

## 1. Project Overview Tab

1. **Project Name**: `PayTable: Linked PayPal Wallets for AI Agents`
2. **Elevator Pitch (Under 200 Characters)**: `Collaborative AI tabletop where linked PayPal agent wallets shop, split group bills, and settle across all 5 tracks with Rust spend caps and human approval on every purchase.`

## 2. Project Details Tab (`About the project`, `Built with`, `Try it out`, `Project Media`)

### About the project (Copy and Paste Markdown)

```markdown
## Inspiration

People and teams want AI agents to compare vendor prices, split dinner receipts, send multi-currency invoices, and dispatch contributor payouts automatically. Yet nobody wants to hand an LLM an unguarded PayPal account or payment card, because autonomous tool loops can retry into duplicate charges, hallucinate quantities, or blow past a team budget.

We built **PayTable** to make agentic commerce safe, collaborative, and transparent. Inspired by collaborative tabletop interfaces and engineered with the **Sodium** infrastructure design system (`0px` telemetry frames), **Bjork UI**, and **asciicn** 3D ASCII shaders, PayTable gives `@paytable` a **Linked PayPal Agent Wallet** where the AI prepares every quote, split, and invoice while a deterministic Rust engine enforces **human approval on every purchase** before PayPal Sandbox funds move.

## What it does

PayTable is a collaborative AI commerce tabletop that unifies **all 5 PayPal Developer Hackathon inspiration tracks** on one shared surface:

1. **Track 01 (Linked Wallet Agent Checkout)**: `@paytable` queries **Channel3** verified merchant SKUs (`DELL-U2723QE`), negotiates quotes from `$310.00` down to `$265.00`, enforces live tunable Single (`$500.00`) and Daily (`$1,500.00`) wallet caps via `POST /api/wallet/policy`, pauses in `AwaitingApproval`, and settles via **PayPal Orders v2** (`PayPal-Request-Id` UUID idempotency) plus **Shipment Tracking v1** once the human owner clicks **Approve Purchase**.
2. **Track 02 (Receipt Scan & Dinner Split)**: Interactive `2` to `8` diner and `0% / 15% / 18% / 20%` tip calculator that drafts itemized **PayPal Invoicing v2** requests, generates scannable **PayPal QR codes**, and triggers **Instant Payouts v1**.
3. **Track 03 (Multi-Currency & Creator Split)**: Live `EUR / GBP / JPY / CAD` FX invoice calculator with `4x` **PayPal Pay Later** installment previews, **Subscriptions v1**, and multi-party **Batch Payouts v1** splits.
4. **Track 04 (Budget & Dispute Shield)**: Audits **PayPal Reporting v1** (`31-day` RFC 3339 compliant windows), generates **Payment Links**, and toggles **Disputes v1** holds against duplicate recurring SaaS charges (`$29.00` CloudRender).
5. **Track 05 (Neighborhood Solar Co-op Pool)**: Community `$120 / $240 / $360` contribution calculator allocating `40% / 35% / 25%` across neighborhood solar, microloans, and coastal cleanup with automated recurring **Payouts v1**.

Beyond the main tabletop (`[01] TABLETOP`), operators audit live SHA-256 mandate chains inside `[02] LEDGER` powered by **AG Grid v36**, inspect milestone payment gates and **APIMatic** typed controller signatures in `[03] SCHEDULE & SDK`, and render or export 7 interactive 3D ASCII scenes (`.txt`, `.svg`, `.png`, `.webm`) plus `.mcp.json` agent skill configs (`@paypal/mcp` + `elevenlabs-mcp`) in `[04] LAUNCH & ASCII STUDIO`.

## How we built it

1. **High-Assurance Rust Settlement & Policy Engine (`backend-rust/`)**: Built with `axum`, `tokio`, `reqwest` (`rustls-tls`), `hmac`, `sha2`, and `thiserror` under `#![forbid(unsafe_code)]`. Before any request reaches `https://api-m.sandbox.paypal.com`, Rust enforces per-purchase and daily spend caps (`422 Unprocessable Entity` on overspend), `EVERY_PURCHASE` human approval state transitions, replay-safe idempotency keys (`409 DUPLICATE_APPROVAL_KEY`), cryptographic `SHA-256` mandate chaining across runs, `31-day` RFC 3339 timestamp sanitization for Reporting v1, and constant-time `HMAC-SHA256` webhook signature verification.
2. **PayPal Developer Platform & Agent Tooling**: Integrates **PayPal Sandbox** (`OAuth 2.0`, `Orders v2`, `Invoicing v2 + QR`, `Batch Payouts v1`, `Shipment Tracking v1`, `Transaction Search / Reporting v1`, and `Webhooks`) alongside `@paypal/agent-toolkit` (`^1.11.0`) and `@paypal/mcp` configured in `.mcp.json`.
3. **Next.js 16 Sodium Tabletop, Sponsor Stack & Web Audio (`web/`)**: Built with React 19, TypeScript, Tailwind CSS v4, **AG Grid v36** (`ag-grid-react` custom zero-radius Sodium Quartz dark and light themes with quick filter, mandate inspection, and CSV export), **Channel3** verified SKU quote comparison, **APIMatic** typed SDK controller contracts (`ordersController`, `invoicesController`, `payoutsController`, `transactionSearchController`, `trackersBatchController`), **Bryntum**-modeled milestone escrow timelines, tactile Web Audio SFX (`92 BPM` `D Dorian` ambient score), and **asciicn** 3D canvas shaders.
4. **Cloud Packaging & 60 FPS Dual-Voice Launch Film (`render.yaml`, `Dockerfile`, `video/`)**: Packaged with a multi-stage `Dockerfile` and declarative **Render** Blueprint (`render.yaml`) for `paytable-api` and `paytable-web`, paired with a Remotion `1920x1080 @ 60fps` (`-14.05 LUFS`) dual-host launch film (`1:32`) featuring word-synced 2D character rigs (`Pip` and `Vaulty`) and real captured UI plates.

## Challenges we ran into

1. **Preventing Duplicate Captures & Unguarded Retries**: Autonomous agent loops frequently retry tool calls on network jitter. Moving idempotency tracking and `AwaitingApproval` state enforcement into our Rust `RwLock` store guaranteed that replaying an approval key immediately returns `409 DUPLICATE_APPROVAL_KEY` without double-charging the linked PayPal wallet, while keeping external HTTP calls strictly outside lock critical sections.
2. **Headless Judge Verification Without Sandbox Credential Friction**: Standard PayPal Checkout flows block automated tests on browser login popups, and judges reviewing dozens of projects need instant verification. We engineered a dual-mode `PayPalGateway`: when `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are set, it executes live OAuth2 and REST calls against `https://api-m.sandbox.paypal.com`; when unset, **1-Click Judge Sandbox Mode** runs identical Rust policy gates, SHA-256 mandate hashes, and negative `INSTRUMENT_DECLINED` simulations out of the box.
3. **PayPal Reporting v1 RFC 3339 Strictness & 60 FPS WebGL Rendering**: PayPal's `/v1/reporting/transactions` rejects timestamps with fractional milliseconds or windows above 31 days, which we solved via a dedicated Rust timestamp sanitizer. On the video pipeline, rendering `60fps` `asciicn` shaders in headless Chromium hit session limits until we built an isolated `920`-frame Metal ANGLE chunked stitcher (`render-videos.mjs`).

## Accomplishments that we're proud of

1. Shipping all **5 PayPal hackathon tracks** as live interactive calculators on a single cohesive tabletop with zero horizontal overflow across `1600px`, `1280x800`, and `390x844` mobile viewports.
2. Enforcing `#![forbid(unsafe_code)]` in Rust with full automated coverage across live wallet cap updates, `409` replay blocks, `422` overspend rejections, `INSTRUMENT_DECLINED` rollbacks, and Playwright E2E flows.
3. Crafting a `1:32` `60fps` conversational launch film with rigged characters, custom Web Audio synthesis, and live `asciicn` 3D exports strictly under the 3-minute ceiling.

## What we learned

Designing for agentic finance means treating **human intent verification** as a first-class UI and systems problem. Pairing fast AI preparation (catalog discovery, bill math, FX conversion) with an unmistakable human approval gate and cryptographic `SHA-256` audit mandates builds far more user confidence than opaque autonomous execution.

## What's next for PayTable

1. **Multi-Owner Team Quorum Policies**: Require `2-of-3` Slack or Passkey approvals on linked PayPal team wallets when staged purchases exceed `$1,000`.
2. **Automated Seller Dispute Defense Bundles**: Attach signed `SHA-256` PayTable buyer mandates and carrier delivery proofs directly to PayPal Disputes v1 evidence endpoints.
3. **Live Multiplayer WebSocket Cursors**: Let households and finance teams adjust group splits and approve vendor milestones together in real time.
```

### Built with (Up to 25 Tags)

`paypal`, `paypal-sandbox`, `paypal-agent-toolkit`, `paypal-mcp`, `rust`, `axum`, `tokio`, `nextjs`, `react`, `typescript`, `tailwindcss`, `ag-grid`, `channel3`, `apimatic`, `bryntum`, `render`, `elevenlabs`, `remotion`, `webgl`, `mcp`, `docker`, `playwright`

### Try it out Links

1. **Live Production Application**: `https://paytable-production-9863f23a.up.railway.app`
2. **Source Code Repository**: `https://github.com/harrymove-ctrl/paytable`
3. **v2.0.0 Release & 60 FPS Videos**: `https://github.com/harrymove-ctrl/paytable/releases/tag/v2.0.0`
4. **1-Click Render Blueprint (`render.yaml`)**: `https://dashboard.render.com/blueprint/new?repo=https://github.com/harrymove-ctrl/paytable`

### Project Media

1. **Image Gallery (Upload up to 8 PNGs, all under 250 KB)**:
   1. `video/public/plates/plate-01-awaiting-approval.png`
   2. `video/public/plates/plate-02-approved-settled.png`
   3. `video/public/plates/plate-03-mandate-dialog.png`
   4. `video/public/plates/plate-04-dinner-qr-split.png`
   5. `video/public/plates/plate-06-aggrid-ledger.png`
   6. `video/public/plates/plate-07-schedule-sdk.png`
   7. `video/public/plates/plate-08-ascii-studio.png`
   8. `docs/qa/desktop-light.png`
2. **Demonstration Video (`< 3:00` Public YouTube URL)**: Upload `video/out/paytable-hackathon-master.mp4` (`1:32`, `1920x1080 @ 60fps`) to YouTube as **Public** and paste the `https://www.youtube.com/watch?v=...` URL.

## 3. Additional Info Tab (Exact Field-by-Field Answers)

1. **Submitter Type**: `Individual`
2. **Submitter Country of Residence**: `Vietnam`
3. **Canada Province**: `N/A`
4. **Organization Name**: `N/A`
5. **New or Existing (before Oct 1, 2026)**: `New`
6. **If Existing, Explain Changes**: `N/A`
7. **Main Technology Requirement (PayPal + AI)**:
   `PayPal Tools (Sandbox https://api-m.sandbox.paypal.com): PayPal OAuth 2.0, Checkout Orders v2 (with PayPal-Request-Id UUID idempotency), Invoicing v2 + QR Code generation, Batch Payouts v1, Shipment Tracking v1, Transaction Search / Reporting v1 (with 31-day RFC 3339 sanitizer), HMAC-SHA256 Webhooks, @paypal/agent-toolkit (^1.11.0), and PayPal MCP Server (@paypal/mcp in .mcp.json). AI Tools & Models: Channel3 AI Product Discovery & A2A Quote Negotiation, Claude / Gemini coding & MCP tool-calling agents wired via @paypal/mcp + elevenlabs-mcp, and ElevenLabs neural dual-voice synthesis. A Rust (Axum/Tokio) policy engine gates every AI-staged run behind live spend caps ($500 single / $1,500 daily), SHA-256 mandates, and mandatory human approval before funds move.`
8. **Additional Sponsor Tools Checked**: `AG Grid`, `APIMatic`, `Bryntum`, `Channel3`, `Render`
9. **Public Code Repository URL**: `https://github.com/harrymove-ctrl/paytable`
10. **Working Demo / Test Build URL**: `https://paytable-production-9863f23a.up.railway.app`
11. **Testing Instructions / Credentials**:
    `Live Hosted Demo (zero credentials or setup required): Open https://paytable-production-9863f23a.up.railway.app (or https://paytable-production-9863f23a.up.railway.app/?debug=1 for the adversarial QA guardrail bar). Click any of the 5 PayPal tracks, stage a $265 Dell monitor checkout, and click Approve Purchase to settle with a SHA-256 mandate receipt. Test >$500 overspend (422 block), 409 replay protection, INSTRUMENT_DECLINED rollback, [02] LEDGER (AG Grid v36 + CSV export), [03] SCHEDULE & SDK, and [04] LAUNCH & ASCII STUDIO. Render Blueprint: https://dashboard.render.com/blueprint/new?repo=https://github.com/harrymove-ctrl/paytable. Local run: "cargo run --manifest-path backend-rust/Cargo.toml" (:4184) and "cd web && npm install && npm run dev" (:4104).`
12. **Overall Experience Integrating PayPal (1 to 10)**: `9`
13. **Overall Experience Feedback**:
    `Integrating PayPal Sandbox across OAuth 2.0, Orders v2, Invoicing v2 QR codes, Batch Payouts v1, Shipment Tracking v1, and @paypal/mcp was clean and predictable from Rust and TypeScript. PayPal-Request-Id idempotency headers and negative Sandbox error simulation made it straightforward to test replay protection and card declines deterministically. Adding native Batch Payouts v1 and Dispute evidence submission tools directly into the official @paypal/mcp and @paypal/agent-toolkit packages would make multi-party agentic workflows even smoother.`
14. **Open to Contact for Feedback**: `Yes`
15. **APIMatic Context Plugin Experience**:
    `Using APIMatic's typed SDK controller patterns (ordersController, invoicesController, payoutsController, transactionSearchController, trackersBatchController) kept our Rust-to-TypeScript request/response payloads and OpenAPI parameters aligned across all five PayPal endpoints. Surfacing those exact typed signatures inside Tab [03] SCHEDULE & SDK eliminated manual JSON field mismatches, especially around PayPal-Request-Id headers and Reporting v1 query parameters, which was noticeably faster and less error-prone than hand-rolling untyped REST wrappers.`
16. **AG Grid Experience**:
    `AG Grid v36 (ag-grid-react) made building our live [02] LEDGER financial reconciliation surface fast and rock-solid. Customizing themeQuartz for both our zero-radius Sodium dark and light themes took minutes, and built-in quick filtering, status badges, row-click SHA-256 mandate inspection, and 1-click CSV export handled multi-currency PayPal Sandbox settlements cleanly at zero layout shift.`
17. **Eligibility Checkboxes (Age of Majority, Eligible Jurisdiction, Not an Employee)**: Check all 3 boxes.
18. **AI Tools Used Question**:
    `PayPal MCP Server (@paypal/mcp), PayPal Agent Toolkit (@paypal/agent-toolkit), Channel3 AI Search API, Google Antigravity (Gemini) & Claude Code for Rust/Next.js engineering and Playwright QA, and ElevenLabs MCP (elevenlabs-mcp) for dual-voice narration synthesis.`
19. **Level of Learning Derived**: `Significant`
20. **Did You Gain Career AI Value**: `Yes`

