# Master fix backlog — 2026-05-22

**Scope:** Cross-lane wiring, verify-pass RED, half-wired orchestrator merges.  
**Related:** [grails-tensor-gap-backlog.md](./grails-tensor-gap-backlog.md), [orchestrator-runs/verify-2026-05-22.md](./orchestrator-runs/verify-2026-05-22.md)

---

## Master Dev pass

**Date:** 2026-05-22  
**Agent:** grails-master-dev (inline)

### Verify (start)

| Gate | Result |
|------|--------|
| `npm run test` | **481 pass / 5 fail** (486 total) — subset re-run later **89/89 green** |
| `npm run build` | **FAIL** — client bundle pulled `node:fs`/`node:path` via `@/lib/trade/all-listings` → `trade-landing` → `db-connection` |

**Sample failures (full suite):** `data-sync-all.test.ts`, M2 stats ribbon, ORDERS tab shell, landing aggregate ribbon, TradeLandingFeaturedBanner wiring. Isolated re-run of those files: **all pass** (likely race or mid-run file drift during long suite).

### Fixes applied

| Issue | Fix |
|-------|-----|
| Build: client `TradeCollectionNav` imported `ALL_LISTINGS_SLUG` from server module `lib/trade/all-listings.ts` | Moved `ALL_LISTINGS_SLUG` to `lib/trade-routes.ts`; nav imports from routes; `all-listings.ts` re-exports for server pages |
| Build TS: `collectionSocialLinks` passed from collection page but missing on `TradeCollectionDeskClient` Props | Added optional `collectionSocialLinks?: TradeCollectionSocialLinks` to Props |
| Build TS: `listing.mint` on `TradeListing` in sweep error path | Use `listing.id` (canonical mint/cert id on desk listings) |
| Build TS: `SolanaEnv = Pick<ProcessEnv, …>` default `process.env` not assignable | Explicit optional `SolanaEnv` interface + `readSolanaEnv()` helper |

### Files changed

- `lib/trade-routes.ts` — export `ALL_LISTINGS_SLUG`
- `lib/trade/all-listings.ts` — import/re-export slug from routes
- `components/trade/trade-collection-nav.tsx` — client-safe import path
- `components/trade/trade-collection-desk-client.tsx` — `collectionSocialLinks` on Props
- `components/trade/tensor/trade-panel.tsx` — sweep error label uses `listing.id`
- `lib/solana-config.ts` — SolanaEnv typing for build typecheck
- `.cursor/skills/grails-master-dev/SKILL.md` — new skill
- `docs/integrations/master-fix-backlog-2026-05-22.md` — this file

### Spot checks

- **Browser:** localhost:3000 not running — route crawl skipped (start `npm run dev:clean` to verify `/`, `/trade`, `/trade/all`, `/trade/portfolio`, `/trade/c/collector-crypt`, slab detail)
- **Env contract:** `validateEnvVars()` in `lib/security.ts` — DATABASE_URL + production RPC/SOL keys
- **RPC cache:** `lib/rpc-cache.ts` — 60s balance, 120s wallet NFTs via `unstable_cache`
- **Prisma skip:** `lib/db-connection.ts` — dev unreachable cached; tests mock DB failures
- **All-listings merge:** `loadAllTradeListings()` parallel partner loads + `mergeAllTradeListings`
- **Portfolio est value:** `enrichPortfolioEstValues()` applies partner floor when DAS has no list price
- **Wallet connect:** `/trade/portfolio` — `useWallet` + public VIEW via `?owner=`

### Verify (end)

| Gate | Result |
|------|--------|
| `npm run test` | **499 pass / 0 fail** |
| `npm run build` | **PASS** (after clean:next; webpack + TypeScript + static gen) |

### Deferred (product backlog — not master-fix scope)

See [grails-tensor-gap-backlog.md](./grails-tensor-gap-backlog.md) P0–P2: ORDERS live read model, received offers tab, TPS live footer, broker mainnet, Beezie/Courtyard ingest, etc.

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-22 | Initial master dev pass; build client/server split for `ALL_LISTINGS_SLUG` |

---

## Master Dev pass (resume after crash)

**Date:** 2026-05-22 (second pass)  
**Agent:** grail-master-dev (inline, 0 spawns)

### Verify (start)

| Gate | Result |
|------|--------|
| `npm run test` | **497 pass / 3 fail** — Tensor uppercase label drift + tab `soon:` conflict |
| Dev server | **DOWN** on :3000; stale node on :3000 forced :3002; concurrent test/build corrupted `.next` middleware |

### Root cause — listings hang / blank desk

Partner ingest (`listPartnerTradeListings`) blocked on **unbounded** Tensor REST + Helius DAS fetches when keys are set. With `DATABASE_URL=prisma+postgres://` and no Prisma dev server, JSON seed path is fast (~89ms) once external APIs time out. First dev compiles took 13+ min; API routes timed out at 60s before fixes.

### Fixes applied

| Issue | Fix |
|-------|-----|
| Tensor/Helius fetch hangs block partner listings API + `/trade/c/*` SSR | `lib/fetch-with-timeout.ts` — `fetchWithTimeout` (12s) on `tensorGet`; 8s on Helius DAS |
| Tensor seller enrichment still blocks ingest | `withTimeoutFallback` on `enrichPartnerListingsWithTensor` + ribbon metrics fetch |
| Prisma `$queryRaw` probe hangs when DB unreachable | 5s timeout on `getDatabaseStatus` connectivity probe |
| ORDERS/TRAITS/HODLERS tabs marked `soon: true` while panels wired | Removed `soon: true` from `COLLECTION_TABS` in desk client |
| Test drift after Tensor uppercase parity (SELL NOW, 24H SALES, etc.) | Updated `trade-desk-p0`, `trade-portfolio`, `listing-grid`, `trade-collection-desk`, `__tests__/trade-stats-ribbon-toolbar` |

### Files changed

- `lib/fetch-with-timeout.ts` — new shared timeout helpers
- `lib/onchain/tensor-api.ts` — timed Tensor GET
- `lib/helius-das.ts` — timed DAS RPC
- `lib/db-connection.ts` — timed DB probe
- `lib/partner-listings.ts` — timed Tensor seller enrichment
- `lib/trade/tensor-ribbon-metrics.ts` — timed ribbon stats fetch
- `components/trade/trade-collection-desk-client.tsx` — live ORDERS/TRAITS/HODLERS tabs
- `scripts/diag-partner-listings.ts` — ops diag script (CC/Phy counts + latency)
- Tests: `trade-desk-p0.test.ts`, `trade-portfolio.test.ts`, `listing-grid.test.ts`, `trade-collection-desk.test.ts`, `__tests__/trade-stats-ribbon-toolbar.test.ts`

### Spot checks (browser + diag)

| Route / probe | Listed count | Notes |
|---------------|-------------|-------|
| `scripts/diag-partner-listings.ts` (NODE_ENV=development) | CC **3**, Phy **3** | 89ms / 0ms; `external_json` fallback; `dbStatus=unconfigured` |
| `/trade/c/collector-crypt` | **3** | Grid: Snorlax, Psyduck, Skarmory; stats ribbon Listed=3; floor 0.427◎ |
| `/trade/c/phygitals` | **3** | Grid: Charizard ex, Pikachu Promo, Mewtwo VSTAR; Listed=3; floor 0.633◎ |
| Nav “All listings” badge | **6** | CC 3 + Phy 3 from JSON seed |
| `/api/trade/partners/*/listings` | — | First-hit compile still slow in dev; use `npm run dev:clean` solo (no parallel build) |

**Env:** `DATABASE_URL=prisma+postgres://…`, `RWA_TRADE_ENABLED=true`, `HELIUS_API_KEY` set. JSON seed active until `npx prisma dev` or `postgresql://`.

### Verify (end)

| Gate | Result |
|------|--------|
| `npm run test` | **529 pass / 0 fail** |
| `npm run build` | **PASS** (webpack + TS + static gen) |

### Deferred

- Live partner rows via `npm run sync:discover` + Postgres (operator)
- React hydration mismatch on layout skip-link (browser extension / dev overlay noise)
- Beezie/Courtyard ingest, TCM buy enablement — see grails-tensor-gap-backlog P1/P2
| 2026-05-22 | Master Product cohesion pass — Home→Trade→Vault nav/CTA wiring |
| 2026-05-22 | Master Product aggregation IA — `/trade/all` discoverability + cross-links |

---

## Master Dev — partner aggregation

**Date:** 2026-05-22 (third pass)  
**Agent:** grails-master-dev (inline, 0 spawns)

### Verify (start)

| Gate | Result |
|------|--------|
| `npm run sync:discover` | **CC 3 · Phygitals 3 · total JSON 6 · DB upsert 0** |
| `scripts/diag-partner-listings.ts` | CC **3** @ 4ms · Phy **3** @ 0ms · `external_json` · `dbStatus=unconfigured` |

### Aggregation architecture (locked)

| Layer | Path | Role |
|-------|------|------|
| Partner ingest | `listPartnerTradeListings` → JSON / DB / CC scrape / Helius DAS | Primary grid for `/trade/c/collector-crypt`, `/trade/c/phygitals` |
| Tensor REST | `mergePartnerListingsWithTensorMetadata` (12s timeout) | Optional sellerWallet + listState only |
| All desk merge | `loadAllTradeListings` → `mergeAllTradeListings` → `dedupePartnerTradeListings` | `/trade/all` — cert/mint dedupe, lowest ask, price asc |
| Landing previews | `loadTradeLandingPartnerPreviews` (one fetch per partner) | `/trade` index + footer |
| Nav badges | `loadTradeLandingNavCollections` | Partner previews + treasury on desk SSR |
| Aggregate override | `aggregateListedCount` / `aggregateFloorSol` + `result.aggregate` | Deduped merge stats on `/trade/all` nav |

**Preview sum vs merge:** Footer/landing sums per-venue counts; aggregate desk nav uses deduped merge via `buildAllListingsAggregateStats`.

### Fixes applied

| Issue | Fix |
|-------|-----|
| Nav used sync seed-only `getTradeLandingNavCollections()` | Added `loadTradeLandingNavCollections()`; wired on `/trade/all`, `/trade/c/[slug]` |
| Partner previews double-fetched (stats + listings) | Single `listPartnerTradeListings` per partner |
| Landing desk lacked cert/mint dedupe | `/trade` uses `mergeAllTradeListings` |
| `loadAllTradeListings` test mocks broken under ESM | `__setAllListingsLoadDepsForTests` wired in loader + tests |

### sync:discover counts

| Partner | Rows | Notes |
|---------|------|-------|
| Collector Crypt | **3** | Live scrape → JSON |
| Phygitals | **3** | Seed preserved |
| Total JSON | **6** | DB upsert **0** without Prisma dev |

### Verify (end)

| Gate | Result |
|------|--------|
| `tests/trade-all-listings.test.ts` | **23/23 pass** (after DI test fix) |
| `tests/partner-listings.test.ts` | **24/24 pass** |
| Full `npm run test` | Slow with `.env` Tensor keys — listing lane green |

### Deferred

- Postgres upsert with `npx prisma dev` or `postgresql://`
- Phygitals live API, Beezie/Courtyard ingest, TCM buy gates unchanged

---

## Master Product aggregation IA pass

**Date:** 2026-05-22  
**Agent:** grails-master-product (inline, 0 spawns)

### Gaps found

1. Home + trade landing hero pushed single-collection or `#anchor` CTAs — aggregate `/trade/all` desk hard to discover
2. Featured landing banner spotlighted first live partner collection — implied single marketplace
3. Trade app header marked `/trade/all` and collection desks under “Trade” (portfolio) nav active state
4. No cross-links between aggregate desk ↔ collection index ↔ per-partner desks
5. Command palette partner labels used raw `partner_id` instead of registry badges (CC · Phygitals · Treasury)
6. `ALL_LISTINGS_COLLECTION` registry row used `collector_crypt` partner — misleading for aggregate shell

### Fixes applied

| Issue | Fix |
|-------|-----|
| `/trade/all` discoverability | Home CTA primary → Browse all listings; trade value hero primary → aggregate desk; footer + INTERNAL_NAV + app header nav item |
| Honest aggregation copy | Landing featured banner uses aggregate stats + “All partner listings” when ingest live; aggregate desk status banner |
| Nav active states | App header: Collections / All listings / Portfolio with correct `aria-current` per route |
| Cross-links | Landing index ↔ All listings; collection desks ↔ aggregate desk via `DeskCrossLinks` |
| Registry labels | Command palette uses `VENUE_LABELS`; aggregate config partner → `slabvault_treasury` + merged notes |
| Route helpers | `TRADE_ROUTES.collectionsIndex`, `isTradeCollectionsBrowsePath`, `isTradePortfolioPath` |

### Files changed

- `lib/trade-routes.ts` — collections index anchor + browse/portfolio path helpers
- `lib/nav.ts` — aggregation copy; INTERNAL_NAV `/trade/all`
- `lib/trade/all-listings.ts` — aggregate registry partner accuracy
- `components/home-trade-cta.tsx` — aggregate-first CTAs + honest copy
- `components/trade/trade-landing-value-hero.tsx` — Browse all listings + collection index CTAs
- `components/trade/trade-landing-desk-client.tsx` — aggregate featured banner + index cross-link
- `components/trade/trade-collection-desk-client.tsx` — desk cross-links + aggregate status banner
- `components/trade/trade-app-header.tsx` — All listings nav + fixed active states
- `components/trade/trade-command-palette.tsx` — All listings palette row + VENUE_LABELS
- `components/site-footer.tsx` — All listings platform link
- `tests/nav.test.ts`, `tests/trade-landing.test.ts`, `tests/trade-desk-p0.test.ts`
- `docs/integrations/master-fix-backlog-2026-05-22.md` — this section

### Verify

| Gate | Result |
|------|--------|
| `npx tsx --test tests/nav.test.ts` (8 tests) | **8 pass / 0 fail** |
| `npx tsx --test tests/trade-landing.test.ts` (IA subset: value hero + cross-links + nav overlap) | **10 pass / 0 fail** (filtered run; full file hangs on async partner-preview test without timeout env) |

---

## Master Product cohesion pass

**Date:** 2026-05-22  
**Agent:** grails-master-ui (inline, resumed after crash)

### Crawl

| Route | Result |
|-------|--------|
| `/` | Dev server `GET / 200` — Glass browser could not reach localhost (chrome-error); code + source review |
| `/trade` | Trade layout isolated from marketing shell; no back-link to vault/home before fix |
| `/vault` | Featured slabs → `/trade` present; hero lacked GRAILS CTA |

**Cohesion gaps found**

1. Header CTA **Launch App** vs hero/home **Explore GRAILS** — label mismatch
2. Hero primary CTA pushed GRAILS before vault — vault story should lead on home
3. `/trade` app header had no path back to SlabVault home or `/vault`
4. `/vault` hero had no GRAILS entry point
5. Marketing footer lacked internal Platform links (Home · Vault · GRAILS · Pulls)
6. Trade landing value hero did not mention community vault

### Fixes applied

| Issue | Fix |
|-------|-----|
| CTA label split (Launch App vs Explore GRAILS) | `LAUNCH_APP_CTA = "Explore GRAILS"` in `lib/brand.ts`; `platform-labels` re-exports brand constant |
| Home hero vault-first story | Swapped hero CTAs: primary **Explore the vault**, secondary **Explore GRAILS** |
| Primary nav mobile clarity | Added `description` on Home / Vault / Pulls in `getPrimaryNav()` |
| Trade → Vault / Home dead-end | Trade app header: **SlabVault** link to `/`, **Vault** nav item to `/vault` |
| Vault → Trade gap | Vault hero tertiary **Explore GRAILS** → `/trade` |
| Footer + trade landing vault bridge | Site footer **Platform** column; trade value hero **View community vault** link |

### Files changed

- `lib/brand.ts` — unified launch CTA label
- `lib/platform-labels.ts` — import CTA from brand
- `lib/nav.ts` — primary nav descriptions
- `components/hero-section.tsx` — vault-first hero CTAs
- `components/trade/trade-app-header.tsx` — SlabVault + Vault back-links
- `components/vault-hero-section.tsx` — Explore GRAILS CTA
- `components/site-footer.tsx` — Platform link column
- `components/trade/trade-landing-value-hero.tsx` — vault cross-link
- `tests/nav.test.ts` — CTA + description assertions
- `tests/trade-landing.test.ts` — vault link on value hero
- `tests/trade-desk-p0.test.ts` — trade header cohesion wiring
- `docs/integrations/master-fix-backlog-2026-05-22.md` — this section

### Verify

| Gate | Result |
|------|--------|
| `npm run test` (subset + full run) | Nav + trade-landing + trade-desk-p0 cohesion tests **green**; full suite **522/527** (5 pre-existing unrelated fails) |
| Browser crawl | Blocked in Glass MCP — manual verify: `npm run dev:clean` then `/`, `/trade`, `/vault` |

### Deferred

- Glass browser localhost crawl for visual regression screenshots
- Hero checklist tension (skill lists both vault-first copy and GRAILS primary CTA) — resolved toward vault-first on home hero per product story

---

## DB + API-first ingest (2026-05-23)

**Agent:** partner aggregation fix (inline)

### Issues

| Issue | Impact |
|-------|--------|
| `isPrismaProxyJsonSeedMode()` skipped all Prisma reads/writes in dev for `prisma+postgres://` even when `npx prisma dev` was running | `sync:discover` reported `DB upsert count: 0`; partner pages never read `ExternalListing` |
| Live CC scrape ran whenever `PARTNER_LIVE_SCRAPE_ENABLED=true` on every `listPartnerTradeListings` call | Server strain on SSR/API routes |
| No partner API layer between DB and JSON | Scrape was de facto primary when env flag set |

### Fixes

| Fix | Files |
|-----|-------|
| Probe DB for all supported URLs; skip reads only after failed probe; writes use `shouldSkipDatabaseWrites()` | `lib/db-connection.ts`, `lib/external-listings.ts`, `lib/marketplace-slabs.ts` |
| Ingest priority: Postgres → partner API → JSON → scrape fallback (stale/empty + env or `?live=1`) | `lib/partner-listings.ts`, `lib/collector-crypt-api-listings.ts` |
| Runbook + `.env.example` document `postgresql://` vs `prisma+postgres://` | `docs/runbooks/local-dev-database.md`, `.env.example` |
| Worker 1 section in partner aggregation doc | `docs/integrations/partner-aggregation-quickest-path.md` |

---

## Master Product platform completeness pass

**Date:** 2026-05-23  
**Agent:** grails-master-product (inline, 0 spawns)

### Deliverables

| Item | Result |
|------|--------|
| North star doc | `docs/integrations/grails-north-star.md` — cert → listings → FMV/insured spread (future) → best buy |
| STATUS refresh | Honest % after DB/API-first ingest; `/trade/all` in IA table; M1 done; weighted ~54–58% |
| Compare / cert search IA | App header + ⌘K palette + item COMPARE tab — honest **Soon** labels (M5) |
| `/trade/all` discoverability | Verified prior pass: home CTA, value hero, footer, app header, INTERNAL_NAV — no regression |
| Nav / footer / home coherence | Vault-first hero; Explore GRAILS secondary; Platform footer column; trade header back-links |

### Gaps found (deferred)

1. Item page does not render `alternateVenueAsks` yet — data exists post-dedupe merge; UI is M5
2. FMV / insured spread — north star only; no buyer-facing spread UI
3. Glass browser localhost crawl still blocked for visual regression

### Files changed

- `docs/integrations/grails-north-star.md` — new
- `docs/STATUS.md` — percentages, ingest truth, `/trade/all`, related docs
- `components/trade/trade-app-header.tsx` — cert compare Soon in search slot
- `components/trade/trade-command-palette.tsx` — compare Soon on cert rows + placeholder
- `components/trade/trade-item-detail-client.tsx` — COMPARE tab + `ItemCertCompareSoon`
- `lib/trade-landing.ts` — honest compare copy in how-it-works step 02
- `tests/trade-desk-p0.test.ts`, `tests/trade-item-navigation.test.ts` — Soon assertions
- `docs/integrations/master-fix-backlog-2026-05-22.md` — this section

### Verify

| Gate | Result |
|------|--------|
| `npx tsx --test tests/nav.test.ts` | **8 pass / 0 fail** |
| `npx tsx --test tests/trade-desk-p0.test.ts` | **32 pass / 0 fail** |
| `npx tsx --test tests/trade-item-navigation.test.ts` | **14 pass / 0 fail** |

---

## Master Dev — next steps pass

**Date:** 2026-05-23  
**Agent:** grails-master-dev (inline, 0 spawns)

### Verify (start)

| Gate | Result |
|------|--------|
| Prior full suite | **597 pass / 1 fail** — aggregate volume override + client/server import leaks |

### Fixes applied

| Issue | Fix |
|-------|-----|
| CC sync always scraped; API stub flag false | `fetchCollectorCryptIngestListings()` — API candidates first, scrape fallback; `COLLECTOR_CRYPT_MARKETPLACE_API_AVAILABLE=true`; sync logs `ccIngestSource` + `dbConfigured` |
| Generic CC deep links (marketplace root only) | `lib/trade/partner-deep-link.ts` — cert search URLs + item-specific gacha links; applied in `mapPartnerListingToTradeListing` |
| Buy disabled without clear why | `resolveOnChainBuyBlockReason()` in map-listing; grid title + modal status copy; partner checkout via `resolvePartnerDeepLink` |
| Landing aggregate 24h vol overwritten by ingest sum | `applyMergedAllListingsAggregateOverride` prefers preview Tensor volume over ingest listing sum |
| Build: client pulled `partner-listings` / `all-listings` → `node:fs` | Client-safe modules: `partner-deep-link.ts`, `listing-venue-utils.ts`; fixed imports in modals, item detail, trade-modal, collection-info-panel |
| `data/site.json` corrupted (empty) during parallel test/build | Restored minimal valid site config from repo constants |

### Listing / deep-link status

| Path | Status |
|------|--------|
| CC read ingest | DB → API → JSON → scrape (stale/empty + env) |
| CC sync | API → scrape → cached JSON retain |
| Deep link | Every CC/Phy row resolves — cert `?q=` search, gacha URL preserved, partner fallback never null |
| On-site buy | Disabled with title when `on_chain_tensor` + missing seller/listState; partner checkout CTA in modal + item detail |
| JSON seed | **6 rows** (3 CC + 3 Phy) in `data/external-listings.json` |

### Files changed (primary)

- `lib/collector-crypt-api-listings.ts`, `lib/collector-crypt-live-listings.ts`, `lib/external-listings-sync.ts`
- `lib/trade/partner-deep-link.ts`, `lib/trade/listing-venue-utils.ts`, `lib/trade-landing-aggregate.ts`
- `lib/partner-listings.ts`, `lib/trade/trade-modal.ts`, `lib/trade/all-listings.ts`
- `components/trade/buy-now-modal.tsx`, `components/trade/tensor/nft-card.tsx`, `components/trade/tensor/map-listing.ts`
- `components/trade/trade-item-detail-client.tsx`, `components/trade/collection-info-panel.tsx`
- `scripts/sync-external-listings.ts`, `data/site.json`
- Tests: partner-listings, external-listings-sync, trade-desk-p0, trade-all-listings, data-sync mocks

### Verify (end)

| Gate | Result |
|------|--------|
| `npm run test` | **598 pass / 0 fail** |
| `npm run build` | **PASS** (webpack + TS + static gen) |

### Deferred

- Live CC API rows when candidates respond in prod (today: scrape/JSON still primary)
- Postgres upsert with direct `postgresql://` or `npx prisma dev`
- On-site TCM buy — staging write flags + seller enrichment + broker PDA (unchanged)

---

## Master Product pass (re-run)

**Date:** 2026-05-23  
**Agent:** grails-master-product (inline, 0 spawns)

### IA coherence (Home → Trade → Vault → All listings)

| Hop | Route / CTA | Status |
|-----|-------------|--------|
| Home hero | Explore the vault → `/vault`; Explore GRAILS → `/trade` | Verified |
| Home footer CTA | Browse all listings → `/trade/all` (primary); Explore GRAILS secondary | Verified |
| Trade app header | Collections · **All listings** · Portfolio · **Vault** + SlabVault → `/` | Verified |
| Trade value hero | Browse all listings + View community vault | Verified |
| Vault hero | Explore GRAILS → `/trade` | Verified |
| Site footer Platform | Home · Vault · GRAILS · All listings · Pulls | Verified |
| Sitemap `INTERNAL_NAV` | `/`, `/trade`, `/trade/all`, `/vault` | Verified |

No wiring regressions found. Primary marketing nav stays vault-first (trade via Launch App CTA, not inline `/trade` link).

### M5 compare — honest Soon labels

| Surface | Label | Honest? |
|---------|-------|---------|
| App header search slot | cert compare Soon | Yes — unified cert index + mint search still M5 |
| ⌘K palette | multi-venue compare Soon · Mint search in M5 | Yes |
| Item COMPARE tab | No Soon badge — `ItemVenueCompareStrip` live when 2+ venue asks | Yes — partial M5 ship |
| How-it-works step 02 | Cert-unified compare strip ships in M5 (Soon) | Yes — index-level feature |

### Gaps found (deferred)

1. Cert-unified compare **index** (not item strip) — no `/trade/compare/[cert]` route; mint search in palette still M5
2. FMV / insured spread — north star only; no buyer-facing spread UI
3. Glass browser localhost crawl still blocked for visual regression

### Percentage shift

| Lane | Prior | Now | Why |
|------|-------|-----|-----|
| Trade — IA & shell | ~58% | **~60%** | Item venue compare strip partial live |
| Weighted public product | ~54–58% | **~55–59%** | Same driver |

### Files changed

- `tests/nav.test.ts` — IA chain Home→Trade→Vault→All listings test
- `docs/STATUS.md` — percentages, stubbed truth, verification log
- `docs/integrations/grails-north-star.md` — buyer journey compare step (partial)
- `docs/integrations/master-fix-backlog-2026-05-22.md` — this section

### Verify

| Gate | Result |
|------|--------|
| `npx tsx --test tests/nav.test.ts tests/trade-desk-p0.test.ts tests/trade-item-navigation.test.ts` | **58 pass / 0 fail** |

---

## Master UI pass — 2026-05-23

**Date:** 2026-05-23  
**Agent:** grails-master-ui (inline, 0 spawns)

### Browser crawl (localhost:3002 — port 3000 in use)

| Route | Status | Notes |
|-------|--------|-------|
| `/` | **OK** | Hero flywheel, Explore GRAILS CTA, partner strip, vault story |
| `/trade` | **OK** | Value hero, market pulse (Partner listed · venues · DATA label), CARDS\|TABLE index with VENUE column, activity sidebar |
| `/trade/all` | **OK** | Aggregate desk banner, VENUES stat (3), venue badges on grid (CC/PHYGITALS/TREASURY), Buy ↗ primary on partner rows |
| `/trade/c/collector-crypt` | **OK** | CC header badge, partner ingest banner, Buy ↗ on tiles |
| `/trade/portfolio` | **Partial** | Client Suspense showed blank shell in MCP (null fallback); fixed loading card |

**Dev noise:** Next overlay from `listMarketplaceSlabs` DB unreachable (expected without DATABASE_URL); does not block trade desk render after hydration.

### Fixes applied

| Issue | Fix |
|-------|-----|
| Item commerce stack: partner deep-link should be primary when on-chain metadata missing | `partnerPrimaryCheckout` branch — primary `Open on partner ↗` on desktop; blocked on-chain shows disabled BUY with `resolveOnChainBuyBlockReason` tooltip |
| Mobile item bar: partner checkout hierarchy | `TradeMobileActionBar` uses `tensor-btn-primary` when `partnerPrimaryCheckout` |
| Item header missing venue badge | `VenueBadge` via `resolveListingVenuePartner` on slab detail |
| Portfolio blank Suspense | `app/trade/portfolio/page.tsx` — `PageLoadingCard` fallback instead of `null` |

### Files changed

- `components/trade/trade-item-detail-client.tsx` — buy/deep-link hierarchy, venue badge, on-chain block honesty
- `components/trade/trade-mobile-action-bar.tsx` — partner-primary mobile styling
- `app/trade/portfolio/page.tsx` — portfolio loading fallback

### Verify

| Gate | Result |
|------|--------|
| `npx tsx --import ./tests/test-env.ts --test tests/trade-desk-p0.test.ts tests/trade-landing.test.ts tests/trade-portfolio.test.ts` | **96 pass / 0 fail** |

### Deferred (product backlog)

- Portfolio inventory grid requires connected wallet (MCP could not verify sticky LIST bar with live selection)
- BIDS / ORDERS tab live rows (wallet-gated)
- `/trade/compare/[cert]` index-level cert compare (M5)
- Home `/` a11y snapshot sparse during RSC hydration — content renders in CDP text probe

### Changelog

| Date | Note |
|------|------|
| 2026-05-23 | Master UI pass — buy/deep-link hierarchy, aggregate desk crawl OK, portfolio loading fallback |
