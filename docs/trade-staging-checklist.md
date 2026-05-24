# Trade staging checklist — first mainnet fill

Use this before enabling on-chain buy/list on a **staging** deployment. Production should keep write paths off until partner sign-off.

**Related:** [partner-aggregation-quickest-path.md](./integrations/partner-aggregation-quickest-path.md) (aggregate ingest + `canBuyOnChain` gates) · [onchain-trade-stack.md § Aggregate ingest → buy-path enrichment](./integrations/onchain-trade-stack.md#aggregate-ingest--buy-path-enrichment-read--write-bridge)

## Pre-flight

- [ ] `/trade` loads with `TRADE_PLATFORM_ENABLED=true` (or dev default).
- [ ] Partner ingest returns listings for CC + Phygitals (`npm run sync:discover` or DB seed).
- [ ] Tensor seller enrichment shows matches in server logs or `tensorEnrichment` on partner list responses.
- [ ] Wallet connect works (`NEXT_PUBLIC_SOLANA_RPC` reachable from browser).
- [ ] Staging wallet funded with small SOL amount for tx fees.
- [ ] [M3 prep — aggregation alignment](#m3-prep--aggregation-alignment) complete (ingest, seller metadata, `canBuyOnChain` gates).

## M3 prep — aggregation alignment

Partner-first aggregation must succeed **before** enabling write flags or attempting a fill. Canonical data-plane + settlement split: [partner-aggregation-quickest-path.md](./integrations/partner-aggregation-quickest-path.md). After a successful staging fill, record tx + env snapshot in [staging-first-fill-record-template.md](./integrations/staging-first-fill-record-template.md).

### Aggregate ingest prerequisites

- [ ] **`npm run sync:discover`** with `DATABASE_URL` set — confirm `DB upsert count > 0` (or JSON seed populated for offline dev). See [Worker 1 — Data plane](./integrations/partner-aggregation-quickest-path.md#worker-1--data-plane-partner-ingest).
- [ ] **Partner ingest live** — `/trade/c/collector-crypt` and optional `/trade/all` show CC (+ Phygitals seed) rows without requiring live scrape on every page load.
- [ ] **Dedupe integrity** — `mergeAllTradeListings()` / `dedupePartnerTradeListings()` preserve `alternateVenueAsks` and richest `sellerWallet` / `listState` from colliding rows ([onchain-trade-stack.md § Aggregate ingest → buy-path enrichment](./integrations/onchain-trade-stack.md#aggregate-ingest--buy-path-enrichment-read--write-bridge)).

### Seller enrichment (`sellerWallet` / `listState`)

On-site buy needs **either** field on the listing row — merged via Tensor enrichment or ops seed ([Worker 2 § UI rules / `canBuyOnChain`](./integrations/partner-aggregation-quickest-path.md#2-cc-pnft-vs-phygitals-cnft--settlement-lanes-and-ui-routing)):

- [ ] `TENSOR_API_KEY` + `TENSOR_CC_COLLECTION_SLUGS` set; partner list BFF shows `tensorEnrichment.enrichedSeller > 0` for target CC mint.
- [ ] **Or** ops-seeded test mint with manual `sellerWallet` + `listState` on known staging inventory.
- [ ] Item detail shows seller wallet + list state when enrichment matched (see [Staging verification steps](#staging-verification-steps) step 1).

Rows missing both fields → partner deep link only; do not expect `/api/trade/tx/buy` to succeed.

### `canBuyOnChain` gates (client)

Match [partner-aggregation-quickest-path.md UI rules](./integrations/partner-aggregation-quickest-path.md#2-cc-pnft-vs-phygitals-cnft--settlement-lanes-and-ui-routing) before dry-run:

| Gate | Requirement |
|------|-------------|
| Settlement mode | `settlementMode !== "partner_site"` (`resolvesOnChainSettlement`) |
| Write flags | `NEXT_PUBLIC_TENSOR_TRADE_WRITE_ENABLED=true` on staging |
| Wallet | Connected + price + mint present |
| Listing metadata | `sellerWallet` **or** `listState` on row |

Verify write gate separately ([Staging verification steps](#staging-verification-steps) step 4): buttons disabled when server/client write flags off.

**Recommended test mint:** one CC pNFT with Tensor-indexed ask — [quickest path § 6](./integrations/partner-aggregation-quickest-path.md#6-recommended-stack--quickest-path-to-a-testable-buy-one-collection).

## Required environment variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `TENSOR_TRADE_WRITE_ENABLED` | Server | **Must be `true` on staging only.** Gates `/api/trade/tx/*` list/fill builders via Tensor SDK. Default `false` in production. |
| `NEXT_PUBLIC_TENSOR_TRADE_WRITE_ENABLED` | Client | Mirror of server flag — enables buy/list buttons in trade panel and modals. Keep `false` in production until Phase 2 reviewed. |
| `TENSOR_API_KEY` | Server | Tensor REST reads (collection stats, mint/list rows for seller enrichment) and tx builder routes. Request at [Tensor API docs](https://docs.tensor.trade/trade/api-and-sdk). |
| `TENSOR_CC_COLLECTION_SLUGS` | Server | Comma-separated Tensor collection slugs, e.g. `collector_crypt,phygitals`. Maps `/trade/c/collector-crypt` → first slug; other slugs match when listed here. |
| `HELIUS_API_KEY` | Server | Helius DAS cert↔mint fallback and collection asset reads when Tensor index lacks a row. |
| `SOLANA_RPC_URL` | Server | RPC for tx simulation, blockhash, and `/api/trade/tx/*` routes. Prefer Helius or dedicated mainnet endpoint. |
| `NEXT_PUBLIC_SOLANA_RPC` | Client | Browser wallet + client-side connection (can mirror server RPC or use public mainnet-beta). |

Optional but recommended:

| Variable | Purpose |
|----------|---------|
| `TENSOR_API_BASE_URL` | Defaults to `https://api.mainnet.tensordev.io`. |
| `DATABASE_URL` | Postgres cache for `ExternalListing` partner rows. |
| `PARTNER_LIVE_SCRAPE_ENABLED` | Live CC scrape on partner list loads (staging experiments). |
| `SVF_BROKER_PUBKEY` | Broker recipient on bid txs when set; if unset, bid route defaults to treasury in `data/site.json` (see [Bid route](#bid-route--default-makerbroker-engineering)). |

## Trusted origin gate (`TENSOR_TX_REQUIRE_TRUSTED_ORIGIN`)

GET `/api/trade/tx/*` routes build unsigned Solana transactions from query params. They are not covered by POST CSRF (`requireCsrfProtection` is POST-only). When write paths ship, enable this **server-only** flag in production to block cross-site abuse (third-party pages calling your BFF to obtain txs).

| Variable | Scope | Default | Purpose |
|----------|-------|---------|---------|
| `TENSOR_TX_REQUIRE_TRUSTED_ORIGIN` | Server | `false` (unset = off) | When `true`, `requireTrustedTensorTxOrigin` in `lib/onchain/tensor-tx-bff.ts` runs on every trade tx BFF handler before the write gate. |

**Routes wired:** `buy`, `list`, `bid`, `delist`, `cancel-bid` (`app/api/trade/tx/*/route.ts`).

**Behavior when enabled:**

- Compares `Origin` (or `Referer` origin) to `getTrustedOrigins()` in `lib/csrf.ts` — same set as marketplace CSRF: origins parsed from `NEXT_PUBLIC_SITE_URL` and `NEXTAUTH_URL`.
- In non-production, `http://localhost:3000` and `http://127.0.0.1:3000` are always trusted.
- Missing `Origin`/`Referer`: allows `sec-fetch-site` of `same-origin`, `same-site`, or `none`; otherwise rejects in production when trusted origins are configured.
- Rejects with `403` and code `TRADE_TX_ORIGIN_REJECTED` (not a write-gate `503`).
- Runs **before** `assertTensorTradeWriteEnabled()` so untrusted callers never reach tx simulation when the flag is on.

**Does not replace:** wallet challenge, rate limits, or keeping `TENSOR_TRADE_WRITE_ENABLED=false` until ops sign-off. See [SECURITY_CHECKLIST.md](../SECURITY_CHECKLIST.md) § GRAILS `/trade` tx BFF.

### Staging (first mainnet fill)

- [ ] Keep `TENSOR_TX_REQUIRE_TRUSTED_ORIGIN` **unset or `false`** while validating buy/list/delist/bid from the staging deployment URL.
- [ ] Confirm `NEXT_PUBLIC_SITE_URL` matches the staging hostname (scheme + host, no trailing path) — production enablement depends on this being correct.
- [ ] Optional hardening drill: set `TENSOR_TX_REQUIRE_TRUSTED_ORIGIN=true` on staging, reload `/trade`, connect wallet, run buy dry-run from the UI (should pass); `curl` the same buy URL with `Origin: https://evil.example` (should get `403` / `TRADE_TX_ORIGIN_REJECTED`).
- [ ] Guardrails: `npm run test:guardrails` includes `tests/api-trade-tx-guardrails.test.ts` for origin + write-gate ordering.

Record the flag in the first-fill env snapshot ([staging-first-fill-record-template.md](./integrations/staging-first-fill-record-template.md)).

### Production guidance

Enable **only after all** of the following:

1. Partner / ops sign-off on staging first fill (write flags intentionally enabled on staging only).
2. `TENSOR_TRADE_WRITE_ENABLED=true` and `NEXT_PUBLIC_TENSOR_TRADE_WRITE_ENABLED=true` are approved for production (Phase 2 reviewed).
3. `NEXT_PUBLIC_SITE_URL` (and `NEXTAUTH_URL` if used) are set to the canonical production origins before deploy.
4. Staging drill above passed with the flag on (or document why skipped).

**Recommended production value:** `TENSOR_TX_REQUIRE_TRUSTED_ORIGIN=true`.

**Deploy order:** ship the build with write flags as approved, set site URLs, then turn the origin gate on in the same release or immediately after — do not leave write enabled with trusted origins misconfigured (empty trusted set in production rejects cross-site `Origin` but is fragile; always set `NEXT_PUBLIC_SITE_URL` first).

**Rollback:** set `TENSOR_TX_REQUIRE_TRUSTED_ORIGIN=false` (or unset). Write gates and partner read paths are unchanged; only cross-site GET tx builder calls become allowed again.

## Broker fee PDA — ops checklist (operator-blocked)

**Operator-blocked:** Registering the SVF broker fee PDA on Tensor **Fees** (`TFEEgwDP6nn1s8mMX2tTNPPz8j2VomkphLUmyxKm17A`) requires a funded operator wallet (or partner co-sign on collection-owned configs). **Agents and CI must not** submit registration txs, deploy programs, or enable mainnet write paths to work around a missing PDA. Engineering wires `SVF_BROKER_PUBKEY` into tx builders only after ops confirms on-chain registration.

On-chain fills route protocol + broker shares through the Fees program. Account layout and fee-split targets: [onchain-trade-stack.md — Broker fee PDA table](./integrations/onchain-trade-stack.md#broker-fee-pda-table-ops).

### Registration (ops / partner)

- [ ] **Treasury pubkey** — `data/site.json` treasury (`2oRZe7z9Jx3rpoUWuidjGhpX9mxxhtps2JqQtdxLfHwg`) is the intended **broker fee recipient** (or document an approved hot wallet).
- [ ] **Broker record** — Operator registers SVF as broker on Tensor Fees (global and/or per-collection per [tensor-foundation/fees](https://github.com/tensor-foundation/fees) admin flow).
- [ ] **Collection scope** — For CC / Phygitals slugs in `TENSOR_CC_COLLECTION_SLUGS`, confirm whether partner co-sign is required (see open question in [onchain-trade-stack.md](./integrations/onchain-trade-stack.md#open-questions)); do not assume SVF can attach broker fees without partner approval.
- [ ] **Staging env** — Set `SVF_BROKER_PUBKEY` to the registered recipient if it differs from treasury display; leave unset to default to treasury.
- [ ] **Bps on-chain** — Actual broker bps live in Fees program state, not env. `SVF_BROKER_FEE_BPS` in this repo is **preview/UI only**.

### Bid route — default `makerBroker` (engineering)

`GET /api/trade/tx/bid` proxies Tensor `tx/bid` and always forwards a `makerBroker` when a broker pubkey is configured:

| Input | BFF behavior |
|-------|----------------|
| `makerBroker` query param omitted or blank | Set `makerBroker` to `getSvfBrokerPubkey()` — `SVF_BROKER_PUBKEY` if set, else `data/site.json` `vaultAddresses.treasury` (`2oRZe7z9Jx3rpoUWuidjGhpX9mxxhtps2JqQtdxLfHwg`). |
| `makerBroker` query param provided | Use the caller-supplied pubkey (staging overrides only). |

Required query params: `owner`, `mint`, `price` (lamports). Optional: `expireIn`, `rentPayer`. Gated by `TENSOR_TRADE_WRITE_ENABLED` and trusted-origin checks like other `/api/trade/tx/*` routes.

**Staging implication:** Collection bids built through GRAILS attach SVF as maker broker by default so broker fee share can route to the registered treasury (or `SVF_BROKER_PUBKEY` hot wallet). If the broker PDA is not registered on-chain, bid simulation may fail with marketplace/Fees errors — same class as buy dry-run failures; do not enable write flags until broker verification below passes.

### Verification (before first mainnet fill)

1. **Program ID** — Fees program on cluster matches `TFEEgwDP6nn1s8mMX2tTNPPz8j2VomkphLUmyxKm17A` ([PDA table](./integrations/onchain-trade-stack.md#broker-fee-pda-table-ops)).
2. **Code preview** — `getSvfBrokerPubkey()` / `previewFeeSplit()` in `lib/onchain/fees.ts` reports the same broker pubkey and Fees program id as staging env (read-only; not on-chain proof).
3. **Broker PDA exists** — Inspect broker / collection fee accounts for the SVF pubkey (e.g. Solana explorer, [eigen](https://github.com/tensor-foundation/eigen) CLI, or Fees program client once IDL codegen lands). Record PDA address(es) in the staging run log.
4. **Env alignment** — Staging `SVF_BROKER_PUBKEY` (if set) equals the on-chain broker recipient; otherwise defaults match treasury in `data/site.json`.
5. **Tx builder dry-run** — With `TENSOR_TRADE_WRITE_ENABLED=true` on staging:
   - **Buy** — `/api/trade/tx/buy` returns a serialized tx for an enriched listing; wallet simulation does **not** fail with missing broker / `maker broker not yet enabled` (see marketplace IDL errors in `lib/onchain/idl/`).
   - **Bid** — `/api/trade/tx/bid?owner=…&mint=…&price=…` returns a serialized tx; upstream Tensor request includes `makerBroker=` matching `SVF_BROKER_PUBKEY` or treasury default. Simulation must not fail for unregistered broker when the ops checklist above is complete.
6. **Post-fill (optional)** — After one staging fill, confirm broker lamports credited to treasury/hot wallet; attach tx signature to the staging run log. If blocked, document blocker (partner co-sign, whitelist, pNFT rules) and **keep write flags off**.

### If verification fails

- Do **not** enable `TENSOR_TRADE_WRITE_ENABLED` / `NEXT_PUBLIC_TENSOR_TRADE_WRITE_ENABLED` for production.
- Log blocker in ops runbook; engineering does not auto-register PDAs from this repo.
- Read path and partner ingest remain safe with write gates off ([Rollback](#rollback)).

### Engineering preview (`lib/onchain/fees.ts`) {#engineering-preview-libonchainfeests}

Read-only helpers — **not** on-chain proof of broker registration:

| Export / route | Purpose |
|----------------|---------|
| `getSvfBrokerPubkey()` | Broker recipient for fill/bid txs (`SVF_BROKER_PUBKEY` → else treasury in `data/site.json`) |
| `previewFeeSplit()` | `{ tensorFeesProgram, brokerPubkey, targetBrokerBps, note }` for ops |
| `GET /api/ops/fee-preview` | Admin-authenticated JSON mirror of `previewFeeSplit()` |

**Fill path:** SDK fill attaches `takerBroker` via `getSvfBrokerPubkey()` in `lib/onchain/clients/tensor-tcm-sdk.ts`. Explicit Fees-program account metas (`attachBrokerFeeAccounts` in `tensor-fees.ts`) remain stubbed until broker PDA is registered and IDL codegen lands (TC-075).

Before first fill, confirm `previewFeeSplit().brokerPubkey` matches the registered on-chain broker recipient (step 3 in [Verification](#verification-before-first-mainnet-fill) above).

## Staging verification steps

1. **Read path** — Open `/trade/c/collector-crypt`; listings show floor/ask from partner ingest; item detail shows seller wallet + list state when Tensor enrichment matched.
2. **Enrichment** — With `TENSOR_API_KEY` + `TENSOR_CC_COLLECTION_SLUGS` set, partner list API includes `tensorEnrichment.enrichedSeller > 0` for active CC inventory on Tensor.
3. **Buy dry-run** — Connect wallet on staging; click Buy on an enriched listing; confirm `/api/trade/tx/buy` returns a serialized tx (does not auto-send). Query param matrix, `writePath=sdk` vs REST, and M3 gate order: [onchain-trade-stack.md § Buy BFF — buildFillTransaction query matrix](./integrations/onchain-trade-stack.md#buy-bff-buildfilltransaction-query-matrix). Pre-reqs: [M3 prep](#m3-prep--aggregation-alignment) + [broker PDA verification](#verification-before-first-mainnet-fill) steps 1–4.
4. **Write gate** — With `TENSOR_TRADE_WRITE_ENABLED=false`, buy button shows disabled state / modal fallback message.
5. **Origin gate (optional)** — With `TENSOR_TX_REQUIRE_TRUSTED_ORIGIN=true`, in-app buy dry-run succeeds; cross-origin GET to `/api/trade/tx/buy` returns `TRADE_TX_ORIGIN_REJECTED`.
6. **Footer ticker** — `/trade` footer shows aggregate 24h vol (sum of per-collection Tensor statsV2) when API key is configured.

## Rollback

- Set `TENSOR_TRADE_WRITE_ENABLED=false` and `NEXT_PUBLIC_TENSOR_TRADE_WRITE_ENABLED=false`.
- Set `TENSOR_TX_REQUIRE_TRUSTED_ORIGIN=false` (or unset) if origin rejections block legitimate clients after a bad deploy.
- Partner ingest + read-only Tensor stats continue to work; on-chain buy/list buttons disable without redeploying programs.
