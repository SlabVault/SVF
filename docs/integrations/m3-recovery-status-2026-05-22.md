# M3 recovery status — 2026-05-22

**Context:** Session crash mid-orchestrator loop. User priorities: reduce Tensor REST dependency, fix listing population (P0), honest M3/on-chain status, resume workers.

**Verify:** `npm run db:preflight:warn` → `npm run sync:discover` → `npm run test` → **500 pass / 0 fail** (post-recovery).

---

## Capability matrix

| Capability | Status | Blocker | Next step |
|------------|--------|---------|-----------|
| **Partner listing read (CC)** | **Working (API-first ingest)** | DB upsert skipped in `isPrismaProxyJsonSeedMode()` when `prisma+postgres://` without `npx prisma dev` | `npm run db:preflight:warn` → `npm run sync:discover`; CC live scrape is fallback-only (`PARTNER_LIVE_SCRAPE_ENABLED` or stale/empty seed) |
| **Partner listing read (Phygitals)** | **Working (JSON seed)** | No public listing API yet (`PHYGITALS_LIVE_INGEST_AVAILABLE=false`) | Manual seed rows in `data/external-listings.json` or partner API contract |
| **Tensor REST for grids** | **Optional enrichment only** | Not required for desk tiles — used for `sellerWallet` + `listState` merge | Keep `TENSOR_API_KEY` off for grid tests; enable only for buy-path enrichment experiments |
| **Helius DAS fallback** | **Stubbed** | `collectionMint: null` on CC + Phygitals registry rows | Set collection mints in `lib/onchain/collections.ts` + `HELIUS_API_KEY` for cert↔mint backfill |
| **Trade desk UI (`/trade/c/*`)** | **Working with seed** | Buy requires on-chain metadata most seed rows lack | Browse + deep-link buy works; on-site TCM fill blocked (see below) |
| **Aggregate desk (`/trade/all`)** | **Working** | Beezie/Courtyard preview collections empty by design; ME depth needs `TENSOR_API_KEY` | `loadAllTradeListings()` → `mergeAllTradeListings()` dedupes by cert/mint; lowest ask wins; `alternateVenueAsks` keeps losing partner ask |
| **TCM SDK tx builders** | **Code complete, gated** | `TENSOR_TRADE_WRITE_ENABLED=false` (correct default) | Staging checklist steps 1–5 before any mainnet fill |
| **Broker fee PDA (ops)** | **Not registered** | Operator wallet + Tensor Fees program registration | [trade-staging-checklist.md](../trade-staging-checklist.md) § Broker fee PDA — **do not enable writes until done** |
| **`attachBrokerFeeAccounts`** | **Stub** | No fees program JS client / IDL codegen wired | Implement after broker PDA confirmed on-chain (TC-075) |
| **`SVF_BROKER_PUBKEY` env** | **Placeholder / treasury default** | On-chain broker account not registered | Ops sets pubkey after Fees program registration |
| **Buy without Tensor REST** | **Partially feasible** | Needs mint + `listState` + seller from chain (SDK/DAS), not cert UUID externalIds | Helius DAS + TCM SDK read path; CC scrape rows use UUID ids until mint backfill |
| **Verified staging fill** | **Not done** | Listings + broker PDA + write flags + wallet SOL | Complete staging checklist; one small mainnet-beta fill with ops sign-off |
| **Orchestrator 45m loop** | **Not running at recovery** | Prior sentinel PID 2988 from 2026-05-21 not present in terminals | Restart `/loop 45m scripts/orchestrator/run-all-lanes.md` (see below) |

---

## Listing counts (recovery run)

Command: `npm run sync:discover` (2026-05-22)

| Source | Active rows | Notes |
|--------|-------------|-------|
| Collector Crypt (scrape → JSON) | **3** | Live scrape succeeded; written to `data/external-listings.json` |
| Phygitals (seed preserved) | **3** | Manual seed rows refreshed (`indexedAt` bumped) |
| **Total JSON seed** | **6** | DB upsert **0** — Prisma proxy fetch failed (expected without `npx prisma dev`) |
| CC desk (`listPartnerTradeListings`) | **3** | `sources: [external_json]`, floor ~0.427 SOL |
| Phygitals desk | **3** | `sources: [external_json]`, floor ~0.633 SOL |
| `/trade/all` merge | **10** | CC + Phygitals + treasury/partner batches |

**Root cause of “empty listings” reports:**

1. **Stale seed** — CC rows had `staleAfter` in the past until sync refreshed them.
2. **Prisma proxy `DATABASE_URL`** — without `npx prisma dev`, DB path fails; JSON fallback works in Next dev but sync logged scary Prisma errors and non-dev scripts showed `dbStatus: unreachable`.
3. **Buy vs browse confusion** — grids can show 6 listings while **on-site buy** stays disabled without `sellerWallet`/`listState` (Tensor enrichment or on-chain read).

**Fix applied:** `isPrismaProxyJsonSeedMode()` — non-production + `prisma+postgres://` skips DB probe/upsert and serves JSON with `dbStatus: unconfigured` (no false “unreachable” on partner desks).

---

## Tensor API vs partner-native paths

| Layer | Primary path today | Tensor REST role |
|-------|-------------------|------------------|
| Grid / floor / count | `listPartnerTradeListings` → Postgres → partner API → JSON → CC scrape fallback | Optional `mergePartnerListingsWithTensorMetadata` when keyed |
| Item page resolver | Cert or mint from ingest + Helius DAS | Shortcut when slug + key resolve |
| Collection bids | `GET /api/trade/collection-bids` | Tensor index when keyed |
| Fill tx build | `@tensor-oss/tensorswap-sdk` via BFF | REST for list row metadata only — **not** for settlement CPI |

**Strategic order (locked, `lib/partner-listings.ts`):** Postgres `ExternalListing` → partner API (CC) → JSON seed → CC live scrape fallback → Helius DAS merge → Tensor REST enrichment last.

---

## What you can test today vs not

| Test | Ready? | How |
|------|--------|-----|
| Browse `/trade`, `/trade/c/collector-crypt`, `/trade/c/phygitals` | **Yes** | `npm run dev` — expect 3 listings each from JSON seed |
| Run `npm run sync:discover` | **Yes** | Refreshes CC scrape + Phygitals timestamps; JSON always writes |
| Wallet connect on `/trade/portfolio` | **Yes** | Read-only inventory when RPC configured |
| Deep-link to partner checkout | **Yes** | Settlement mode `partner_site` on seed rows |
| On-site Buy Now (TCM fill) | **No** | Needs `settlementMode !== "partner_site"` + write flags + `sellerWallet`/`listState` + broker PDA + staging sign-off | `canBuyOnChain` in `use-tensor-buy.ts` — browse + deep link always available |
| List / delist from portfolio | **No** | Write gate off; vault list tx not verified |
| Broker fee to SVF treasury on fill | **No** | PDA not registered; `attachBrokerFeeAccounts` is stub |
| Production trade nav | **No** | Keep `TRADE_PLATFORM_ENABLED` staging-only until checklist done |

---

## Orchestrator / worker state

| Item | Status |
|------|--------|
| Meta tick log | `docs/integrations/orchestrator-runs/meta-2026-05-22.md` — tick 3 @ 20:45Z spawned 6 lanes |
| 45m loop sentinel (PID 2988) | **Dead** — not in process list at recovery |
| Dev server | **Not running** in tracked terminals |
| Master dev pass | Build + test green per `master-fix-backlog-2026-05-22.md` |

**Resume:** `/loop 45m scripts/orchestrator/run-all-lanes.md` — focus M3 + listing ingest P0 + partner APIs over Tensor REST. Global cap **24** fix workers.

---

## Related docs

- [onchain-trade-stack.md](./onchain-trade-stack.md)
- [trade-staging-checklist.md](../trade-staging-checklist.md)
- [tensor-repo-vendoring.md](./tensor-repo-vendoring.md)
- [master-fix-backlog-2026-05-22.md](./master-fix-backlog-2026-05-22.md)
- [partner-aggregation-quickest-path.md](./partner-aggregation-quickest-path.md) — § M5 compare honesty (item strip vs cert-unified index)

---

## Alignment update — 2026-05-23

Docs drift fix (segment 3, operator priority #6). Code is source of truth. **2026-05-24:** `alternateVenueAsks` item-strip row synced to `ItemVenueCompareStrip`; M5 compare honesty → [partner-aggregation-quickest-path.md § M5 compare honesty](./partner-aggregation-quickest-path.md#m5-compare-honesty--item-strip-vs-cert-unified-index).

| Topic | Accurate as of 2026-05-23 |
|-------|---------------------------|
| **Ingest priority** | `aggregatePartnerExternalListings()` in `lib/partner-listings.ts`: DB → partner API → JSON → CC scrape fallback (stale/empty or `?live=1`) → Helius DAS → Tensor enrichment |
| **`/trade/all` merge** | `lib/trade/all-listings.ts` — `AGGREGATE_COLLECTION_SLUGS`, parallel `loadCollectionListings`, `mergeAllTradeListings` + `dedupePartnerTradeListings`, nav stats via `buildAllListingsAggregateStats` |
| **`alternateVenueAsks`** | Preserved in `mergeTradeListingFields` / `mergeAlternateVenueAsks` when same cert/mint lists on CC + Phygitals; **item-page strip live** — `ItemVenueCompareStrip` in `components/trade/trade-item-detail-client.tsx` when ≥2 venue asks (`buildVenueCompareRows` in `lib/trade/venue-compare.ts`); cert-unified index + ⌘K mint search still **M5 Soon** — see [partner-aggregation § M5 compare honesty](./partner-aggregation-quickest-path.md#m5-compare-honesty--item-strip-vs-cert-unified-index) |
| **DB preflight** | `npm run db:preflight:warn` (`scripts/db-preflight.ts --warn-only`) before `sync:discover` when `DATABASE_URL` is set |
| **Buy gates** | `canBuyOnChain`: `resolvesOnChainSettlement` (not `partner_site`) + client write flag + wallet + price + mint + seller **or** listState |
| **Prisma proxy dev** | `isPrismaProxyJsonSeedMode()` skips DB probe/upsert in non-prod with `prisma+postgres://`; JSON seed serves with `dbStatus: unconfigured` |

Recovery-era listing counts (2026-05-22 table above) remain historical snapshot; re-run `sync:discover` for current counts.
