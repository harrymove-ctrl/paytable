#!/usr/bin/env bash
set -euo pipefail

echo "[paytable] Starting Rust Settlement & Policy Engine on 127.0.0.1:4184..."
PORT=4184 \
PAYPAL_BASE_URL="${PAYPAL_BASE_URL:-https://api-m.sandbox.paypal.com}" \
/usr/local/bin/paytable-api &

for _ in {1..30}; do
  if curl -sf http://127.0.0.1:4184/api/health >/dev/null 2>&1; then
    echo "[paytable] Rust Engine (:4184) is ONLINE."
    break
  fi
  sleep 0.25
done

WEB_PORT="${PORT:-4104}"
echo "[paytable] Starting Next.js 16 Sodium Tabletop on 0.0.0.0:${WEB_PORT} (proxying /api/* -> http://127.0.0.1:4184)..."
cd /app/web
exec ./node_modules/.bin/next start --hostname 0.0.0.0 --port "${WEB_PORT}"
