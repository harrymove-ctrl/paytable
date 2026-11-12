FROM rust:1.85-bookworm AS rust-builder
WORKDIR /app/backend-rust
COPY backend-rust/Cargo.toml ./Cargo.toml
COPY backend-rust/src ./src
RUN cargo build --release

FROM node:22-bookworm-slim AS web-builder
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM node:22-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=rust-builder /app/backend-rust/target/release/paytable-api /usr/local/bin/paytable-api
COPY --from=web-builder /app/web ./web

ENV PORT=4184
ENV PAYTABLE_API_ORIGIN=http://127.0.0.1:4184
EXPOSE 4104 4184

CMD ["sh", "-c", "paytable-api & cd /app/web && npx next start --port 4104"]
