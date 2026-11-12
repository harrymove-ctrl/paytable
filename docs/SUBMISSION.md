# PayPal AI Hackathon Submission Checklist (PayTable)

## Devpost Submission Fields

1. **Project Title**: PayTable: Linked PayPal Wallets for AI Agents
2. **Tagline**: Collaborative Sodium AI tabletop where linked PayPal agent wallets shop, split bills, and settle across all 5 tracks with human approval on every purchase.
3. **Public Repository**: `https://github.com/harrymove-ctrl/paytable`
4. **Open-Source License**: `MIT` (`LICENSE` at repository root)
5. **Demo Video**: `paytable-hackathon-master.mp4` (`1:20`, `1920x1080 @ 30fps`, strictly under the `3:00` limit)

## Stackable Prize Alignment

1. **Grand Prize & Best PayPal + AI Integration**: Full server-to-server Rust PayPal Sandbox gateway (`OAuth2`, `Orders v2`, `Invoicing v2 + QR`, `Batch Payouts v1`, `Shipment Tracking v1`, `Reporting v1`, `HMAC Webhooks`) paired with `@paypal/agent-toolkit` MCP contracts and Linked Agent Wallet per-purchase human mandates.
2. **Best Agentic Commerce Experience**: Channel3 multi-vendor product discovery (`DELL-U2723QE`), A2A price negotiation (`$310.00` to `$265.00`), cryptographic SHA-256 approval mandates, and replay-safe idempotency.
3. **Best Use of AG Grid**: Live `[02] LEDGER` reconciliation grid built on `ag-grid-react` v36 inside a custom zero-radius Sodium Quartz theme (`dark` and `light`) with instant filtering, row-click mandate inspection, and CSV export.
4. **Best Use of Channel3**: Verified merchant SKU discovery and quote comparison inside Track `01`.
5. **Best Use of APIMatic & Bryntum Schedule Model**: `[03] SCHEDULE & SDK` surfaces payment-gated milestone timelines alongside APIMatic typed controller signatures (`ordersController`, `invoicesController`, `payoutsController`, `transactionSearchController`, `trackersBatchController`).
6. **Render Deployment Blueprint**: Root `render.yaml` and multi-stage `Dockerfile` package both `paytable-api` (Rust) and `paytable-web` (Next.js 16) for one-click cloud hosting.
