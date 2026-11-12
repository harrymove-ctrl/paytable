# PayPal AI Hackathon Submission Checklist (PayTable v2.0)

## Devpost Submission Fields

1. **Project Title**: PayTable: Linked PayPal Wallets for AI Agents
2. **Tagline**: Collaborative Sodium + asciicn AI tabletop where linked PayPal agent wallets shop, calculate group splits, and settle across all 5 tracks with human approval on every purchase.
3. **Public Repository**: `https://github.com/harrymove-ctrl/paytable`
4. **Open-Source License**: `MIT` (`LICENSE` at repository root)
5. **Product Launch Video**: `paytable-hackathon-master.mp4` (`1:32`, `1920x1080 @ 60fps`, 2-voice conversational launch film with rigged 2D characters and `asciicn` 3D shaders, strictly under the `3:00` limit)

## Stackable Prize Alignment

1. **Grand Prize & Best PayPal + AI Integration**: Full server-to-server Rust PayPal Sandbox gateway (`OAuth2`, `Orders v2`, `Invoicing v2 + QR`, `Batch Payouts v1`, `Shipment Tracking v1`, `Reporting v1`, `HMAC Webhooks`), live wallet policy tuning (`POST /api/wallet/policy`), `@paypal/mcp` + `elevenlabs-mcp` `.mcp.json` integration, and interactive calculators across all 5 tracks.
2. **Best Agentic Commerce Experience**: Channel3 multi-vendor product discovery (`DELL-U2723QE`), A2A price negotiation (`$310.00` down to `$265.00`), 4-step guided approval UX, cryptographic SHA-256 mandates, and replay-safe idempotency.
3. **Best Use of AG Grid**: Live `[02] LEDGER` reconciliation grid built on `ag-grid-react` v36 inside a custom zero-radius Sodium Quartz theme (`dark` and `light`) with instant filtering, row-click mandate inspection, and CSV export.
4. **Best Use of Channel3**: Verified merchant SKU discovery and interactive vendor quote switching inside Track `01`.
5. **Best Use of APIMatic & Bryntum Schedule Model**: `[03] SCHEDULE & SDK` surfaces payment-gated milestone timelines alongside APIMatic typed controller signatures (`ordersController`, `invoicesController`, `payoutsController`, `transactionSearchController`, `trackersBatchController`).
6. **Render Deployment Blueprint**: Root `render.yaml` and multi-stage `Dockerfile` package both `paytable-api` (Rust) and `paytable-web` (Next.js 16) for one-click cloud hosting.
