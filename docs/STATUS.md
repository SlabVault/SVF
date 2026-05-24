# SlabVaultFi — Project Status

**Last updated:** 2026-05-23  
**Audited against:** codebase (`app/trade/*`, `lib/partner-listings.ts`, `lib/nav.ts`, `next.config.ts`) + integration docs  
**North star:** [grails-north-star.md](./integrations/grails-north-star.md) — cert → listings → FMV spread (future) → best buy  
**Backlog IDs:** [mvp-backlog.md](./mvp-backlog.md) (~78 DONE / ~112 TODO / ~190 rows ≈ **41% by ticket count**)

This file is read by autonomous orchestration (`npm run orchestrate:next`). Update when lanes shift, blockers clear, or verification changes.

---

## Current product IA (Home · Trade · Vault)

Public nav (`lib/nav.ts`, flag `TRADE_PLATFORM_ENABLED` / legacy `RWA_TRADE_ENABLED`):

| Order | Route | Label | Role |
|-------|-------|-------|------|
| 1 | `/` | **Home** | Flywheel story, vault-first hero; GRAILS via Explore GRAILS + Browse all listings CTA |
| 2 | `/trade` | **GRAILS** | Trade landing + collection index — **Launch App CTA** (beta); aggregate desk at `/trade/all` |
| 3 | `/vault` | **Vault** | Inventory overview, proof, transparency — **no public checkout** |
| 4 | `/pulls` | **Pulls** | Pull history linked from vault narrative |
| — | *More* | Streams, $SVF, FAQ, Roadmap, Community | Secondary |

**Removed from public nav (archived May 2026):** `/discover`, `/marketplace/*`, `/vault/shop`, `/vault/purchases`.

### Trade desk routes (`/trade/*`)

| Route | Purpose | Today |
|-------|---------|-------|
| `/trade` | Landing — collection index + treasury desk preview | Live (treasury from DB; partner rows from ingest chain below) |
| `/trade/all` | Aggregate desk — merged CC + Phygitals + treasury (+ preview venues) | **Live** — `loadAllTradeListings` dedupe; BFF `GET /api/trade/all/listings` |
| `/trade/c/[slug]` | Collection desk — CC, Phygitals, `slabvault-treasury` | Treasury **live**; CC + Phygitals **live from partner ingest** (Postgres → API → JSON → scrape fallback) |
| `/trade/slab/[certOrMint]` | Item page — cert hero, traits, buy/offer CTAs | **Live** — `BuyNowModal` + `useTensorBuy`; on-chain when `TENSOR_TRADE_WRITE_ENABLED` + seller enrichment |
| `/trade/portfolio` | Wallet inventory, LIST/DELIST, open bids, shop history | **Partial** — sticky LIST/DELIST bar + modals wired; RECEIVED OFFERS / ACTIVITY tabs still `soon` |
| `/trade/item/[mint]` | Legacy | Redirects → `/trade/slab/[certOrMint]` |

### Vault routes (`/vault/*`)

| Route | Purpose | Today |
|-------|---------|-------|
| `/vault` | Public inventory + flywheel | **Live** |
| `/vault/proof` | Proof of reserves | **Live** |
| `/vault/shop/*`, `/vault/purchases/*` | Former shop | **301 → `/trade`** (+ portfolio for purchases) |
| Admin `/admin/transactions`, `/api/marketplace/*` | Legacy checkout fulfillment | **Live for ops** — not linked from public nav |

### Permanent redirects (`next.config.ts`)

- `/discover` → `/trade?from=discover`
- `/marketplace/*` → `/trade` or `/trade/portfolio`
- `/vault/shop/*` → `/trade?from=vault-shop`
- `/vault/purchases/*` → `/trade/portfolio?from=vault-purchases`

Archived-route banners: `ArchivedRouteNotice` + `lib/redirect-notices.ts`.

---

## Shipped vs stubbed (honest %)

Percentages reflect **user-visible capability**, not doc/ticket count.

| Lane | Shipped | Stubbed / missing | Honest % |
|------|---------|-------------------|----------|
| **Home** | Landing, carousel, CTAs, growth events, mobile nav | Stream embed depth, programmatic SEO | **~85%** |
| **Vault** | Overview, proof, pulls, treasury stats, admin slab CRUD | Per-partner verification labels; shop UI retired | **~70%** |
| **Trade — IA & shell** | Routes, `/trade/all` aggregate desk, cross-links, app header nav, desk shell, filters, grid/table, item layout, redirects, item venue compare strip (when multi-venue cert) | Cert-unified index + mint search (M5 Soon), mobile bottom bar, Unified-Wallet-Kit isolation | **~60%** |
| **Trade — read path** | DB/API-first ingest (`Postgres → partner API → JSON → scrape fallback`), `/trade/all` merge + dedupe, CC sync cron, Phygitals ingest, Helius DAS cert↔mint, optional Tensor enrichment, treasury from Postgres | Live Phygitals API; on-chain TCM fill for partner asks; BFF cache table | **~72%** (code) / **~60%** (prod with DB or JSON seed; Tensor key optional) |
| **Trade — write path** | BFF tx routes (`/api/trade/tx/buy|list|delist|bid|cancel-bid`); SDK builders (`buildFillTransaction`, `buildListTransaction`); write gate; buy/list/delist modals + hooks; portfolio LIST/DELIST; collection BIDS panel; Tensor seller enrichment (`sellerWallet`, `listState`) | No verified staging mainnet fill; CSRF not on write routes; Postgres orders/idempotency missing; production flag stays off | **~45%** (code) / **~25%** (verified e2e) |
| **Discover (archived)** | Model, sync script, tests | Public page redirects; not a buyer lane | **N/A — archived** |
| **Ops / security** | CSRF, checkout guardrails, crons, 154 unit tests | Durable rate limit, Sentry, prod wallet challenge, E2E | **~55%** P0 |

**Weighted public product (Home + Vault narrative + Trade usable today): ~55–59%.**  
**Backlog ticket completion: ~41%** (78/190 in [mvp-backlog.md](./mvp-backlog.md)).

**Ingest truth (2026-05-23):** Request paths read `ExternalListing` from Postgres when reachable; CC live scrape is fallback-only (`PARTNER_LIVE_SCRAPE_ENABLED`). See [partner-aggregation-quickest-path.md](./integrations/partner-aggregation-quickest-path.md) and [local-dev-database.md](./runbooks/local-dev-database.md).

### What is genuinely shipped

- Three-lane IA decision executed: **Trade = buy**, **Vault = proof/inventory**, **Discover/shop archived**
- Trade desk UI scaffold (`TradeDeskShell`, `CollectionStatsRibbon`, `TradeListingGrid`, item page)
- Treasury collection on `/trade/c/slabvault-treasury` from `listMarketplaceSlabs`
- DB/API-first partner ingest: Postgres `ExternalListing` → partner API → JSON → CC scrape fallback (`lib/partner-listings.ts`)
- Aggregate desk `/trade/all`: cert/mint dedupe, lowest ask, venue badges, nav/footer discoverability
- Tensor read stack (optional enrichment): REST client, collection depth mapper, CC slug resolution, Helius DAS fallback
- On-chain stack: `lib/onchain/clients/tensor-tcm.ts` SDK fill/list builders; `lib/onchain/tensor-tx-bff.ts`; five BFF tx routes under `app/api/trade/tx/*`
- Write gating: `TENSOR_TRADE_WRITE_ENABLED` (server) + `NEXT_PUBLIC_TENSOR_TRADE_WRITE_ENABLED` (UI); honest disabled states when off
- Collection **BIDS** tab: `CollectionBidsPanel` + `GET /api/trade/collection-bids` (Tensor index when keyed)
- Portfolio **LIST/DELIST**: `TradePortfolioStickyBar`, `ListForSaleModal`, `DelistModal`, `useTensorDelist`
- Seller enrichment: partner listings merge Tensor `sellerWallet` + `listState` for on-chain buy path (`lib/partner-listings.ts`)
- Buy flow UI: `BuyNowModal`, `useTensorBuy` on grid tiles, trade panel, and item page
- Legacy marketplace checkout **still works for admin ops** behind redirects

### What is still stubbed

- **Verified staging fill** — code path exists; no signed-off mainnet buy/list gate ([trade-staging-checklist.md](./trade-staging-checklist.md))
- Portfolio tabs RECEIVED OFFERS · ACTIVITY · ORDERS & BIDS — marked `soon: true` in `lib/trade/portfolio.ts`
- Vault wallet TCM list/delist (`lib/trade/vault-listings.ts` returns errors until M4)
- CSRF + wallet challenge on `/api/trade/tx/*` (legacy checkout only today)
- `vendor/tensor-idls` submodule not initialized (IDL JSON present in-repo)
- Item venue compare strip — **partial live** when `alternateVenueAsks` exist post-merge; empty state when single venue only
- Cert-unified compare index + mint search (M5 — ⌘K cert prefix works; full cert index + mint resolver **Soon**)
- FMV / insured spread vs ask (future north-star layer — no product UI yet)
- Cross-venue best-price graph UI (M4 partial — merge logic + item strip exist; cert index + ME depth not shipped)
- Beezie/Courtyard live ingest (M6 preview lanes only)

---

## GRAILS delivery lane (sequential)

**Rule (M0):** One segment per session on the trade lane — no parallel agents on `app/trade/*`, `components/trade/*`, or `lib/partner-listings.ts`. Use `npm run dev:clean` for local dev. Walkthrough: [grails-step-by-step-plan.md](./integrations/grails-step-by-step-plan.md).

| Segment | Milestone | Status | Next |
|---------|-----------|--------|------|
| 1 Foundation & docs truth | M0 | **Done** (2026-05-21) | — |
| 2 Live listing data | M1 | **Done** (DB/API-first ingest) | Prod DB upsert + Phygitals live API |
| 3 Trade desk UX shell | M2 | Partial | Item compare strip partial; cert index Soon labels; mobile bottom bar |
| 4 On-chain Solana writes | M3 | Partial | Staging mainnet fill verification |

Non-trade lanes (Home, Vault, Ops) can proceed independently. Sync on env vars and route IA only.

**Strategic decision locked:** Treasury slabs sell **only** via `/trade` Tensor listings — no parallel `/vault/shop` checkout ([vault-to-trade-listings.md](./integrations/vault-to-trade-listings.md)).

---

## P0 / P1 / P2 parallel work matrix

**Rule:** Rows in the same column can run **now** without blocking each other. Rows marked **blocked by** need the dependency first.

### Can run NOW (no cross-lane blockers)

| Priority | Track | Work | Blocks |
|----------|-------|------|--------|
| **P0** | Security | Reconcile `SECURITY_CHECKLIST.md` (P0-SEC-13) | Nothing |
| **P0** | Security | Enable `RESERVE_REQUIRE_WALLET_CHALLENGE` on **staging** (P0-SEC-10) | Staging env only |
| **P0** | Ops | Wire `qa:ci` on every PR (P0-OPS-06) | Nothing |
| **P0** | Ops | Staging purchase + fulfill rehearsal doc (P0-OPS-07) | Staging DB + RPC |
| **P0** | Ops | Apply / verify `ExternalListing` migration on prod (P0-OPS-09) | DB access |
| **P0** | Ops | Sentry / Vercel monitoring project (P0-OPS-10) | Account signup |
| **P0** | Infra | Upstash durable rate limit spike (P0-SEC-08) | Redis creds |
| **P1** | Admin UX | Admin pricing UI form (P1-MKT-13) | Uses existing API |
| **P1** | UX | Order status deep links, carousel a11y polish | Nothing |
| **P1** | Data | CC API contract outreach (P1-DAT-07) | Partner response |
| **P2** | Trade read | Helius DAS cert↔mint backfill; optional Tensor API shortcut for ME depth | **Blocked by:** `HELIUS_API_KEY` for mint resolution (P2-INT-T10) |
| **P2** | Trade read | Cron `sync:discover` → DB upsert | Migration applied |
| **P2** | Trade UI | `BuyNowModal` layout-only + wallet gate | Does not need write txs |
| **P2** | Trade UI | `TradeFilterRail` URL sync, mobile filter drawer | Nothing |
| **P2** | On-chain | Pin IDLs submodule + `idl-lock.json` (P2-INT-OC05) | Git submodule init |
| **P2** | On-chain | SDK-examples read-only spike on CC mint | RPC + wallet |
| **P2** | Discover data | Wire `sync:discover` → DB upsert + cron (P2-INT-D09/D10) | Migration applied |

### Sequential chains (do not parallelize internals)

```text
Partner ingest (CC + Phygitals) → live grids on /trade/c/* without Tensor API
     ↓
Helius DAS cert↔mint → item page resolver
     ↓
SDK fill tx builder → BuyNowModal sign flow → TENSOR_TRADE_WRITE_ENABLED staging
     ↓
Vault list tx → treasury slabs on TCM → admin fulfillment on fill events
```

```text
Whitelist txs (week 3) → fee PDA broker config → optional SVF overlay bps
```

### Lane collision notes

| Collision | Resolution |
|-----------|------------|
| UI clone vs SDK integration | UI owns `components/trade/*`; SDK owns `lib/onchain/clients/*` + future `/api/trade/*` |
| Site cleanup vs Trade beta | Enable `TRADE_PLATFORM_ENABLED=true` in prod only when CC read path or treasury desk is acceptable |
| Legacy marketplace APIs vs Trade-only narrative | Keep admin APIs; do not re-expose shop in nav |

---

## Top 15 next tasks (ordered)

1. **Set staging env:** `TRADE_PLATFORM_ENABLED=true`, `HELIUS_API_KEY` — cert↔mint + DAS fallback ([P2-INT-T10](./mvp-backlog.md)). Optional: `TENSOR_API_KEY` for ME depth experiments only.
2. **Verify `/trade/c/collector-crypt` and `/trade/c/phygitals`** show partner ingest listings ([tensor-tradesite-ux-audit.md](./integrations/tensor-tradesite-ux-audit.md)).
3. **Wire cron `sync:discover` → DB upsert** — keep JSON seed fresh ([P2-INT-D09](./mvp-backlog.md)).
4. **Wire `BuyNowModal` UI** (price breakdown, royalty copy, wallet gate) — hook to stub tx builder ([UX audit #6](./integrations/tensor-tradesite-ux-audit.md)).
5. **Implement `buildFillTransaction`** via `@tensor-oss/tensorswap-sdk` for one CC pNFT ask — devnet/small mainnet-beta ([P2-INT-OC07](./mvp-backlog.md), week 2 vendoring plan).
6. **Enable production Trade nav** — `TRADE_PLATFORM_ENABLED=true` on Vercel after staging sign-off.
7. **Reconcile `SECURITY_CHECKLIST.md`** with shipped CSRF + wallet challenge ([P0-SEC-13](./mvp-backlog.md)).
8. **Wire Sentry** (or Vercel monitoring) + failed checkout/verify alerts ([P0-OPS-10](./mvp-backlog.md), [P0-MKT-04](./mvp-backlog.md)).
9. **Staging purchase rehearsal** — legacy admin fulfill path still needed until TCM fills replace `Transaction` ([P0-OPS-07](./mvp-backlog.md)).
10. **Init `vendor/tensor-idls` submodule** + pin SHA in `programs/idl-lock.json` ([P2-INT-OC05](./mvp-backlog.md)).
11. **Cert ↔ mint table** (`CertMintLink`) + Helius backfill for item page resolver ([P2-INT-T13](./mvp-backlog.md), [gacha-nft-metadata.md](./integrations/gacha-nft-metadata.md)).
12. ~~**Replace stub activity feed** with cached Tensor events~~ **DONE** — `GET /api/trade/activity`, `TradeActivityPanel` on collection desk ([TC-103–106](./tensor-clone-epics.md)).
13. **Vault list tx** — `buildVaultListTx` via TCM client; list one treasury slab on staging ([vault-to-trade-listings.md](./integrations/vault-to-trade-listings.md)).
14. **Upstash rate limiting** on write APIs ([P0-SEC-08](./mvp-backlog.md)).
15. **CI: `qa:ci` on every PR** — lint + test + build gate ([P0-OPS-06](./mvp-backlog.md)).

---

## Verification (last run)

**2026-05-23 (re-run):** Master Product pass — IA Home→Trade→Vault→All listings verified; item venue compare strip partial (M5 index still Soon). `npx tsx --test tests/nav.test.ts tests/trade-desk-p0.test.ts tests/trade-item-navigation.test.ts` → **58 pass / 0 fail** (nav IA chain test added).

**2026-05-23:** Master Product pass — `npx tsx --test tests/nav.test.ts` → **8 pass**; `tests/trade-desk-p0.test.ts` → **32 pass**; `tests/trade-item-navigation.test.ts` → **14 pass** (compare Soon IA)

**2026-05-21:** `npm run test` → **283 tests pass** (0 fail; partner ingest + trade tx BFF + desk suite green)

```bash
npm run lint
npm run test
npm run build
npm run ops:env:production    # prod contract
npm run ops:verify -- --base-url https://slabvault.xyz
npm run qa:ci                 # lint + test + build
```

| Check | Status |
|-------|--------|
| Unit/guardrail tests | **Green** (283) |
| CSRF + checkout guardrails | Covered |
| Nav + redirect notices | `tests/nav.test.ts`, `tests/redirect-notices.test.ts` |
| Trade landing / tensor-tcm | `tests/trade-landing.test.ts`, `tests/tensor-tcm.test.ts` |
| E2E purchase smoke | **Not wired** (P0-TST-05) |

---

## Blockers

1. **`TENSOR_API_KEY` + CC slugs** — live partner depth on `/trade` (UI ready; data gated).
2. **P0-SEC-08** — Durable rate limiting not in production.
3. **P0-OPS-10** — No error monitoring / paging.
4. **Write path verification** — BFF + SDK wired; `TENSOR_TRADE_WRITE_ENABLED` off in prod; no signed-off staging fill yet.
5. **Mainnet `slabvault-broker` deploy** — audit required (P3-SEC-01); use Tensor mainnet programs in v1.

---

## Related docs

| Doc | Topic |
|-----|-------|
| [mvp-backlog.md](./mvp-backlog.md) | Full P0–P4 backlog |
| [rwa-trading-platform.md](./integrations/rwa-trading-platform.md) | `/trade` product spec |
| [tensor-fork-feasibility.md](./integrations/tensor-fork-feasibility.md) | Integrate vs fork, ME aggregation |
| [tensor-tradesite-ux-audit.md](./integrations/tensor-tradesite-ux-audit.md) | UI clone gap matrix |
| [tensor-repo-vendoring.md](./integrations/tensor-repo-vendoring.md) | Week 1–4 integration order |
| [onchain-trade-stack.md](./integrations/onchain-trade-stack.md) | Programs, PDAs, phases |
| [vault-to-trade-listings.md](./integrations/vault-to-trade-listings.md) | Treasury → TCM only |
| [grails-north-star.md](./integrations/grails-north-star.md) | Cert → listings → FMV → best buy |
| [grails-step-by-step-plan.md](./integrations/grails-step-by-step-plan.md) | Segment walkthrough M0–M6 |
| [partner-aggregation-quickest-path.md](./integrations/partner-aggregation-quickest-path.md) | DB/API-first ingest priority |
| [m-milestone-status.md](./integrations/m-milestone-status.md) | Milestone snapshot |

---

## Orchestration

- Next task: `npm run orchestrate:next`
- Lanes: `npm run orchestrate:lanes`
- Runbook: [runbooks/autonomous-orchestration.md](./runbooks/autonomous-orchestration.md)

When completing backlog items, update [mvp-backlog.md](./mvp-backlog.md) and refresh **Current focus** / **Blockers** here.
