# SlabVaultFi MVP backlog

**Path:** `docs/mvp-backlog.md`  
**Last audited:** 2026-05-21 (vault shop archived → `/trade`; treasury listings on trade desk)

**Archive note (2026-05-21):** Public vault shop (`/vault/shop`, legacy `/marketplace/*`) is retired from nav. Permanent redirects send buyers to `/trade`; purchase history to `/trade/portfolio`. Admin fulfillment (`/admin/transactions`, `/api/marketplace/*`) and checkout code remain for operations.  
**Item count:** ~200 actionable rows across P0–P4

**Legend:** `DONE` · `TODO` · `IN PROGRESS` · `BLOCKED`

**How to read IDs:** `P{n}-{CAT}-{nn}` — priority, category (`PRD` product, `UX`, `MKT` marketplace, `WAL` wallet, `SEC` security, `DAT` data, `OPS` ops, `TST` testing, `GRW` growth, `INT` integrations), sequence.

**Audit highlights (codebase vs prior notes):**

| Claim | Audit result |
|-------|----------------|
| CSRF on write APIs | **DONE** — `lib/csrf.ts`, `requireWriteAuth`, `tests/csrf.test.ts` |
| Recent pulls carousel | **DONE** — `components/recent-pulls-carousel.tsx`, home wiring |
| Guardrail / API tests | **DONE** — 19 `tests/*.test.ts` including checkout, sync, CSRF, wallet |
| Order status page | **DONE** — `/marketplace/order/[id]`, `MarketplaceOrderStatus`, status API + guardrail tests |
| Buyer order history UI | **DONE** — `/marketplace/orders` + `MarketplacePurchasesClient` (not `/account/transactions`) |
| `/discover` aggregator | **PARTIAL** — page + schema + JSON sync; **TODO** prod flag, DB cron upsert, detail route, Phygitals ingest |
| `/trade` Tensor aggregator | **PLANNED** — stub page only; strategy in [tensor-fork-feasibility.md](./integrations/tensor-fork-feasibility.md) |
| Route IA `/vault/*` vs `/trade/*` | **DONE (2026-05-21)** — Public vault shop archived; `/marketplace/*`, `/vault/shop`, `/vault/purchases` redirect to `/trade` and `/trade/portfolio`; treasury lists on trade desk via Tensor (coming soon). Admin checkout APIs unchanged. |
| `SECURITY_CHECKLIST.md` | **STALE** — several items implemented but still unchecked |

---

## Verification commands

```bash
npm run lint
npm run test
npm run build
npm run db:preflight:warn      # when DATABASE_URL is set
npm run qa:ci                  # lint + test + build
npm run ops:env:production
npm run ops:verify -- --base-url https://slabvault.xyz
npm run sync                   # vault slabs/pulls
npm run sync:discover          # external listings JSON seed
```

---

## 72-hour kickoff plan

| Window | Focus | Exit criteria |
|--------|--------|---------------|
| **Hour 0–8** | Production contract + DB truth | `ops:env:production` green; `db:preflight` OK on target DB; `db:baseline:plan` reviewed if `_prisma_migrations` missing; `ExternalListing` migration applied |
| **Hour 8–24** | Marketplace smoke on staging | One full reserve → checkout → `/marketplace/order/[id]` path; admin fulfill from `/admin/transactions`; crons fire with `CRON_SECRET` |
| **Hour 24–40** | Security + observability gap closure | Enable `RESERVE_REQUIRE_WALLET_CHALLENGE` on staging; reconcile `SECURITY_CHECKLIST.md`; open Sentry (or Vercel monitoring) project; document rate-limit upgrade path |
| **Hour 40–56** | Discover lane decision | Run `sync:discover`; seed 50+ rows; enable `DISCOVER_AGGREGATOR_ENABLED` on staging only; legal copy review for outbound deep links |
| **Hour 56–72** | Partner ingest + Tensor spike | CC sync health in admin ops-status; Phygitals partner outreach logged; **Tensor template spike** (`marketplace-nextjs-template`); backlog P0 items assigned owners; `qa:ci` green in CI |

---

## 7-sprint sequence (2 weeks each)

| Sprint | Theme | Primary outcomes |
|--------|--------|------------------|
| **S1** | Production safety | P0 security/ops closed; staging purchase rehearsal; checklist reconciled |
| **S2** | Marketplace loop hardening | Wallet challenge prod; purchases UX polish; admin pricing UI; reconciliation runbooks exercised |
| **S3** | Discover MVP (read-only) | Prod-flagged `/discover`; CC ingest → DB; stale badges; deep-link analytics |
| **S4** | Partner data + Tensor spike | CC API contract; Phygitals ingest; DAS cert↔mint; **Tensor SDK spike** (CC pNFT + Phygitals cNFT) |
| **S5** | `/trade` beta (Tensor integrate) | Follow [STATUS.md](../STATUS.md) + [tensor-clone-epics.md](./tensor-clone-epics.md) week 1–4; ME+Tensor depth; `RWA_TRADE_ENABLED` staging |
| **S6** | Trust & transparency | Vault proof per partner; FMV labeling; fee PDA config; `/vault/*` IA migration |
| **S7** | Growth & scale | CTA analytics; SEO/sitemap; E2E suite; multichain roadmap spike (experimental) |

---

# P0 — Production safety (ship blockers)

## Security (`SEC`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P0-SEC-01 | DONE | Production env contract | `npm run ops:env:production` |
| P0-SEC-02 | DONE | CSRF on browser write APIs | `lib/csrf.ts`, marketplace + admin writes |
| P0-SEC-03 | DONE | Admin session hardening | Short JWT, `proxy.ts`, `session-hardening.test.ts` |
| P0-SEC-04 | DONE | Sync/cron bearer auth | Structured 401/503; `ops:verify` |
| P0-SEC-05 | DONE | Payment signature replay protection | Checkout guardrail tests |
| P0-SEC-06 | DONE | Reservation TTL + expire cron | `vercel.json` */10 |
| P0-SEC-07 | DONE | Security headers + in-memory rate limit | `proxy.ts`, `lib/security.ts` |
| P0-SEC-08 | TODO | Durable rate limiting (Upstash/Redis) | `SECURITY_CHECKLIST.md` — in-memory only today |
| P0-SEC-09 | TODO | Wallet-signed access to transaction status | Today `buyerWallet` query param; restrict signatures |
| P0-SEC-10 | TODO | Enable `RESERVE_REQUIRE_WALLET_CHALLENGE` in production | Implemented; defaults off unless env set |
| P0-SEC-11 | TODO | Per-user admin accounts + hashed credentials | Shared `ADMIN_PASSWORD` still primary |
| P0-SEC-12 | DONE | Role-based authorization on all admin handlers | All 6 routes wired; bearer bypass transitional until P0-SEC-11 |
| P0-SEC-13 | DONE | Reconcile `SECURITY_CHECKLIST.md` with implementation | CSRF N/A, wallet challenge all routes, tx access signature doc |
| P0-SEC-14 | DONE | Quarterly secret rotation automation | Runbook §6 + `npm run ops:rotation:check` (`OPS_*_ROTATED_AT`) |
| P0-SEC-15 | DONE | Custody / fulfillment incident runbook | [`docs/runbooks/custody-fulfillment-incidents.md`](runbooks/custody-fulfillment-incidents.md); cross-link in ops-hardening |

## Operations (`OPS`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P0-OPS-01 | DONE | Schema preflight before checkout | `db:preflight`, `lib/schema-health.ts` |
| P0-OPS-02 | DONE | Migration baseline runbook | `docs/runbooks/migration-baseline.md` |
| P0-OPS-03 | DONE | PaymentSplit drift repair plan | `db:repair:payment-split:plan` |
| P0-OPS-04 | DONE | Deploy sequence documented | `operations-hardening.md` |
| P0-OPS-05 | DONE | Post-deploy smoke | `ops:verify` |
| P0-OPS-06 | TODO | Run `qa:ci` on every PR in CI | Confirm GitHub/Vercel pipeline wiring |
| P0-OPS-07 | TODO | Staging purchase rehearsal checklist | End-to-end with real RPC + DB |
| P0-OPS-08 | TODO | Production backup verification before migrate | Runbook step; operator sign-off |
| P0-OPS-09 | TODO | Apply `ExternalListing` migration on prod | Migration exists; verify deploy |
| P0-OPS-10 | TODO | Error monitoring + paging | Sentry/Datadog/Vercel — not wired |

## Data (`DAT`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P0-DAT-01 | DONE | Prisma marketplace schema | Slab, Transaction, PricingHistory |
| P0-DAT-02 | DONE | `paymentSplit` column + drift detection | `api-schema-drift.test.ts` |
| P0-DAT-03 | DONE | Transaction reconciliation script | `npm run tx:reconcile` |
| P0-DAT-04 | TODO | Prod DB: confirm no missing columns | Run `db:preflight` on production URL |

## Testing (`TST`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P0-TST-01 | DONE | CSRF unit tests | `tests/csrf.test.ts` |
| P0-TST-02 | DONE | Checkout/reserve guardrails | `api-marketplace-*-guardrails.test.ts` |
| P0-TST-03 | DONE | Sync/cron guardrails | `api-sync-cron-guardrails.test.ts` |
| P0-TST-04 | DONE | Session hardening tests | `session-hardening.test.ts` |
| P0-TST-05 | TODO | E2E purchase smoke on deploy | No Playwright yet |
| P0-TST-06 | TODO | Route-level `POST /api/admin/pricing` test | Auth via session-hardening only |

## Marketplace (`MKT`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P0-MKT-01 | DONE | Reserve → checkout server verification | SOL + SVF on-chain |
| P0-MKT-02 | DONE | Checkout idempotency under replay | Guardrail tests |
| P0-MKT-03 | DONE | Schema-drift 503 envelopes | Checkout/reserve/status |
| P0-MKT-04 | TODO | Failed chain verification alerting | No monitoring hooks |

**P0 exit criteria:** `qa:ci` green; `db:preflight` OK; `ops:verify` passes; staging purchase + fulfill documented; P0-SEC-08/09/10/11 and P0-OPS-10 addressed or explicitly waived.

---

# P1 — Core MVP (live marketplace loop)

## Product (`PRD`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P1-PRD-01 | DONE | Home landing + flywheel story | `app/page.tsx` |
| P1-PRD-02 | DONE | Vault overview | `/vault` |
| P1-PRD-03 | DONE | Pull history | `/pulls` |
| P1-PRD-04 | DONE | FAQ / community / roadmap | Static JSON-driven |
| P1-PRD-05 | DONE | Treasury transparency | `data/site.json` + env |
| P1-PRD-06 | DONE | Streams page scaffold | `/streams` |
| P1-PRD-07 | DONE | $SVF ecosystem page | `/svf` |
| P1-PRD-08 | TODO | Vault proof: per-partner verification labels | `phygitals-collectorcrypt.md` Phase 4 |
| P1-PRD-09 | TODO | Experimental pull labeling in UI | Partner stub requirement |
| P1-PRD-10 | TODO | Buy-from-vault pricing rules beyond presets | `deriveReservePricing` only |

## UX (`UX`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P1-UX-01 | DONE | Mobile-first nav | `site-nav.tsx`, `getPublicNav()` |
| P1-UX-02 | DONE | Recent pulls carousel (horizontal scroll) | A11y list + snap |
| P1-UX-03 | DONE | Marketplace loading skeleton | `app/marketplace/loading.tsx` |
| P1-UX-04 | DONE | Vault loading skeleton | `app/vault/loading.tsx` |
| P1-UX-05 | DONE | Breadcrumbs on key flows | Marketplace, discover, orders |
| P1-UX-06 | DONE | Empty/error states on marketplace | `EmptyState` patterns |
| P1-UX-07 | DONE | Order status page | `/marketplace/order/[id]` |
| P1-UX-08 | DONE | My purchases page | `/marketplace/orders` |
| P1-UX-09 | TODO | Link order status from email/share deep link | No transactional email |
| P1-UX-10 | TODO | Checkout → order status auto-redirect option | CTA exists; optional auto-nav |
| P1-UX-11 | TODO | `/account/transactions` alias or redirect | Roadmap route; use `/marketplace/orders` |
| P1-UX-12 | TODO | Discover loading skeleton | Only marketplace/vault today |
| P1-UX-13 | TODO | Admin dedicated pricing workflow page | API only; `/admin/pricing` in roadmap |
| P1-UX-14 | TODO | Carousel reduced-motion / keyboard focus | Enhance beyond scroll-snap |

## Marketplace (`MKT`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P1-MKT-01 | DONE | Browse `/marketplace` | DB + `data/slabs.json` fallback |
| P1-MKT-02 | DONE | Slab detail `/marketplace/[id]` | |
| P1-MKT-03 | DONE | Checkout `/marketplace/checkout/[id]` | Split payment UX |
| P1-MKT-04 | DONE | Reserve API | TTL + challenge optional |
| P1-MKT-05 | DONE | Status API | `GET /api/marketplace/status/:id` |
| P1-MKT-06 | DONE | Purchases API | `GET /api/marketplace/transactions` |
| P1-MKT-07 | DONE | Admin fulfill | `/api/admin/transactions/[id]/fulfill` |
| P1-MKT-08 | DONE | Admin slab CRUD | `/admin/slabs` |
| P1-MKT-09 | DONE | Admin pricing API + history | `POST /api/admin/pricing` |
| P1-MKT-10 | DONE | Manual admin fulfillment UI | `/admin/transactions` |
| P1-MKT-11 | DONE | Pricing derivation unit tests | `marketplace-pricing.test.ts` |
| P1-MKT-12 | DONE | Split preset tests | `marketplace-split.test.ts` |
| P1-MKT-13 | TODO | Admin pricing UI (form + history timeline) | Use existing API |
| P1-MKT-14 | TODO | Buyer-visible fulfillment signature on order page | Partial fields on status API |
| P1-MKT-15 | TODO | Reservation expiry UX countdown polish | Order page has basics |

## Wallet (`WAL`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P1-WAL-01 | DONE | Wallet adapter on checkout | Phantom/Solflare |
| P1-WAL-02 | DONE | Wallet connect UX tests | `wallet-connect-ux.test.ts` |
| P1-WAL-03 | DONE | Reserve wallet challenge (optional) | `wallet-challenge.test.ts` |
| P1-WAL-04 | DONE | Challenge payload client wiring | `slab-detail-client.tsx` |
| P1-WAL-05 | TODO | Require challenge in production | Env flag |
| P1-WAL-06 | TODO | SIWS / signed session for purchases list | Wallet-only auth for orders API |
| P1-WAL-07 | TODO | Disconnect/reconnect edge cases on checkout | Document in runbook |

## Data (`DAT`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P1-DAT-01 | DONE | JSON fallback for slabs | `data/slabs.json` |
| P1-DAT-02 | DONE | Sync cron 30m | `vercel.json` |
| P1-DAT-03 | DONE | Data sync guardrails | `data-sync-guardrails.test.ts` |
| P1-DAT-04 | DONE | Collector Crypt scraper | `collector-crypt-scraper.ts` |
| P1-DAT-05 | DONE | Vollector/Vaulted fallbacks | `data-sync.ts` |
| P1-DAT-06 | TODO | Reduce manual `data/slabs.json` edits | Automate ingest |
| P1-DAT-07 | TODO | CC API contract (stable pulls endpoint) | `phygitals-collectorcrypt.md` Phase 1 |
| P1-DAT-08 | TODO | Clip URL → replay ID dedupe | Partner stub |

## Ops (`OPS`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P1-OPS-01 | DONE | Admin ops-status endpoint | Schema + sync hints |
| P1-OPS-02 | DONE | Admin observability tests | `admin-ops-observability.test.ts` |
| P1-OPS-03 | TODO | Operator dashboard for sync source health | Extend admin UI |
| P1-OPS-04 | TODO | Document CC rate limits in ops runbook | Partner stub open item |

## Growth (`GRW`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P1-GRW-01 | DONE | `data-growth-event` on key CTAs | Checkout, marketplace, carousel |
| P1-GRW-02 | DONE | Growth instrumentation component | `growth-instrumentation.tsx` |
| P1-GRW-03 | TODO | Export growth events to analytics backend | Client-side attributes only |
| P1-GRW-04 | TODO | Partner referral UTM conventions | CC + Phygitals links |

**P1 exit criteria:** Staging purchase + admin fulfill; purchases page works with connected wallet; crons healthy; admin can price without raw API calls.

---

# P2 — Trust, ops, discover lane, integrations

## Integrations — On-chain trade stack (`INT`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P2-INT-OC01 | DONE | Architecture doc | [onchain-trade-stack.md](./integrations/onchain-trade-stack.md) |
| P2-INT-OC02 | DONE | `programs/` Anchor scaffold (`slabvault-broker` stub) | Devnet only; no mainnet deploy |
| P2-INT-OC03 | DONE | `lib/onchain/` program IDs + client stubs | Tensor TCM/fees/escrow/WL/AMM |
| P2-INT-OC04 | DONE | `tests/onchain-program-ids.test.ts` | Mainnet ID contract |
| P2-INT-OC05 | TODO | Pin tensor-foundation/IDLs commit in `programs/idl-lock.json` | Codegen clients |
| P2-INT-OC06 | TODO | Devnet spike: configure broker fee PDA → SVF treasury | `tensor-foundation/fees` |
| P2-INT-OC07 | TODO | Phase 1: TCM fill tx + fees accounts on CC collection | `lib/onchain/clients/tensor-tcm.ts` |
| P2-INT-OC08 | TODO | Whitelist CC + Phygitals collection mints on TL1ST | DAS-confirmed mints |
| P2-INT-OC09 | TODO | Deploy `slabvault-broker` to devnet + update program id env | After Anchor CI |
| P2-INT-OC10 | TODO | Phase 2: Geyser/webhook trade indexer | `CertMintLink` + fill cache |
| P2-INT-OC11 | TODO | Phase 3: Tensor AMM sweep on `/trade` | `tensor-amm.ts` stub |
| P2-INT-OC12 | TODO | Multichain settlement map (Beezie Base, Courtyard) | Non-Tensor deep links |

## Integrations — Tensor `/trade` aggregator (`INT`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P2-INT-T01 | DONE | Feasibility doc | [tensor-fork-feasibility.md](./integrations/tensor-fork-feasibility.md) |
| P2-INT-T02 | DONE | RWA trade spec (Tensor-first) | [rwa-trading-platform.md](./integrations/rwa-trading-platform.md) |
| P2-INT-T03 | TODO | Fork `marketplace-nextjs-template` under `app/trade/*` | Apache-2.0 |
| P2-INT-T04 | TODO | Integrate `Unified-Wallet-Kit` on `/trade` route group | Isolate from vault checkout wallet |
| P2-INT-T05 | TODO | CC collection read-only depth (`tensorswap-sdk`) | `/trade/c/collector-crypt`; ME venue badges |
| P2-INT-T06 | TODO | Phygitals cNFT depth (`tcomp-sdk` + DAS) | [gacha-nft-metadata.md](./integrations/gacha-nft-metadata.md) |
| P2-INT-T07 | TODO | Tensor API key application (optional websockets) | SDK-only fallback |
| P2-INT-T08 | TODO | Whitelist CC + Phygitals collections | `tensor-foundation/whitelist` |
| P2-INT-T09 | TODO | Fee PDA → SVF treasury spike | `tensor-foundation/fees` |
| P2-INT-T10 | TODO | `/vault/marketplace/*` aliases + redirects | IA from feasibility doc |
| P2-INT-T11 | TODO | Cross-lane cert badges (vault / trade / discover) | Cert dedupe |
| P2-INT-T12 | TODO | Enable `RWA_TRADE_ENABLED` on staging | Replace stub `app/trade/page.tsx` |

## Integrations — Discover aggregator (`INT`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P2-INT-D01 | DONE | Research doc | `solana-marketplace-aggregator.md` |
| P2-INT-D02 | DONE | `ExternalListing` Prisma model + migration | `20260521120000_external_listings` |
| P2-INT-D03 | DONE | Feature flag `DISCOVER_AGGREGATOR_ENABLED` | Default off in prod |
| P2-INT-D04 | DONE | `/discover` page (grid + platform filter) | `app/discover/page.tsx` |
| P2-INT-D05 | DONE | External listing card + deep link CTA | `cta_discover_deep_link` |
| P2-INT-D06 | DONE | `npm run sync:discover` → JSON seed | `data/external-listings.json` |
| P2-INT-D07 | DONE | Normalizer + stale helper tests | `external-listings.test.ts` |
| P2-INT-D08 | DONE | `upsertExternalListings` DB path | Called from `syncExternalListingsToJson` when `DATABASE_URL` set |
| P2-INT-D09 | DONE | Wire sync script to upsert DB + JSON | `lib/external-listings-sync.ts` upserts active rows + writes JSON |
| P2-INT-D10 | DONE | Cron job for external listing refresh | `vercel.json` cron `POST /api/sync` every 30m |
| P2-INT-D11 | TODO | Enable discover in production (flag + legal) | Outbound link disclaimers |
| P2-INT-D12 | TODO | `/discover/[id]` detail sheet | Aggregator doc Phase 1 |
| P2-INT-D13 | TODO | Stale badge UI (>24h `indexedAt`) | Helper exists; verify all cards |
| P2-INT-D14 | DONE | Cert-number dedupe across CC + Phygitals | `mergePartnerExternalListings` + `dedupePartnerTradeListings` in partner-listings.ts |
| P2-INT-D15 | TODO | “Also in SlabVault shop” cross-badge | Match vault `Slab` inventory |
| P2-INT-D16 | TODO | Magic Eden CC collection ingest | Phase 4 aggregator |
| P2-INT-D17 | TODO | FMV column from Collectr cross-ref | Optional Phase 2 |
| P2-INT-D18 | TODO | Admin CSV import for external listings | Aggregator doc |
| P2-INT-D19 | TODO | Nav copy: “Vault shop” vs “Discover” vs “Trade” | Tensor-first IA |
| P2-INT-D20 | TODO | Compare up to 3 slabs (poke6900-inspired) | Phase 3 aggregator |

## Integrations — Collector Crypt (`INT`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P2-INT-CC01 | DONE | Pull + slab scrape/API | `collector-crypt-scraper.ts` |
| P2-INT-CC02 | DONE | Treasury + deployer account config | `data/site.json` |
| P2-INT-CC03 | DONE | CC → external listings (account slabs) | `sync:discover` |
| P2-INT-CC04 | TODO | Stable marketplace search API (partner) | Open question in aggregator doc |
| P2-INT-CC05 | TODO | Replace SPA scrape where API exists | Partner stub Phase 1 |
| P2-INT-CC06 | TODO | Map listings → marketplace URLs accurately | Heuristic `itemUrl` today |
| P2-INT-CC07 | TODO | Magic Eden distribution listings | Not implemented |

## Integrations — Phygitals (`INT`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P2-INT-PG01 | DONE | Referral link in site config | `links.gachaPhygitals` |
| P2-INT-PG02 | DONE | Phygitals platform filter on discover | Manual seed rows only |
| P2-INT-PG03 | TODO | Partner API or export for pulls | `phygitals-collectorcrypt.md` |
| P2-INT-PG04 | TODO | `PHYGITALS_SYNC_ENABLED` gate | Env stub in partner doc |
| P2-INT-PG05 | TODO | Phygitals listing ingest (not link-only) | Scrape TOS review |
| P2-INT-PG06 | TODO | `PhygitalsPull` types + normalizer | Planned in stub |
| P2-INT-PG07 | TODO | Show Phygitals pulls on `/pulls` when enabled | Feature flag |
| P2-INT-PG08 | TODO | Attribution: invite code vs wallet | Open question |

## Integrations — Vaulted / Collectr (`INT`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P2-INT-V01 | DONE | Vaulted scraper (Vollector format) | `vaulted-scraper.ts` |
| P2-INT-V02 | TODO | Vaulted API integration (roadmap Phase 0) | Scrapers remain fallback |
| P2-INT-V03 | TODO | Collectr FMV cross-reference for listings | `collectrUrl` on slabs |

## Integrations — Tensor fork (`/trade`) (`INT`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P2-INT-T01 | DONE | RWA trade vision + Tensor fork strategy doc | `rwa-trading-platform.md` |
| P2-INT-T02 | DONE | Tensor feasibility (pNFT/cNFT, no full clone) | `gacha-nft-metadata.md` |
| P2-INT-T03 | DONE | `/trade` route stub + `RWA_TRADE_ENABLED` | `app/trade/page.tsx`, `lib/trade-config.ts` |
| P2-INT-T04 | DONE | `lib/integrations/tensor.ts` env stub + repo links | Re-exports `lib/onchain/program-ids` |
| P2-INT-T05 | DONE | Env contract: `TENSOR_API_KEY`, `TENSOR_CC_COLLECTION_SLUGS`, `TENSOR_TRADE_WRITE_ENABLED` | `.env.example` |
| P2-INT-T06 | TODO | **Phase 1:** Tensor API read — CC collection grid on `/trade` | Replace coming-soon stub; no `TradeListing` migration |
| P2-INT-T07 | TODO | **Phase 1:** `/trade/c/[slug]` collection page from Tensor indexer | Floor, filters, listings; optional template fork |
| P2-INT-T08 | TODO | **Phase 1:** Item deep links + cert cross-badges (vault shop, discover) | Dedupe via cert # |
| P2-INT-T09 | TODO | **Phase 1:** BFF or server route cache for Tensor REST | Rate limits; server-only key |
| P2-INT-T10 | TODO | **Phase 1:** `HELIUS_API_KEY` DAS fallback for cert↔mint gaps | `gacha-nft-metadata.md` |
| P2-INT-T11 | TODO | Request Tensor API key + confirm CC collection slugs | Partner + Tensor approval |
| P2-INT-T12 | TODO | **Phase 2:** Install `@tensor-oss/tensorswap-sdk`; list vault pNFT slabs | `TENSOR_TRADE_WRITE_ENABLED` staging only |
| P2-INT-T13 | TODO | **Phase 2:** `CertMintLink` model + map `Slab` → mint | Prisma side table |
| P2-INT-T14 | TODO | **Phase 2:** Wallet challenge + CSRF on list/delist routes | Reuse marketplace patterns |
| P2-INT-T15 | TODO | **Phase 3:** Item bids via tensorswap / tcomp SDK | pNFT vs cNFT paths |
| P2-INT-T16 | TODO | **Phase 3:** Buy now / accept bid tx build + verify | `marketplace-payment-verify.ts` |
| P2-INT-T17 | PARTIAL | **Phase 3:** Activity tab from Tensor API / websocket | Collection desk BFF + `TradeActivityPanel` done (TC-103–106); item tab + websocket TODO |
| P2-INT-T18 | TODO | Evaluate [marketplace-nextjs-template](https://github.com/tensor-foundation/marketplace-nextjs-template) vs custom UI | UI fork decision |
| P2-INT-T19 | TODO | Ops: extend `ops:env:production` for Tensor + Helius vars | Phase 1 gate |
| P2-INT-T20 | TODO | Do **not** ship custom `TradeListing` Postgres book unless Tensor blocked | Deferred in rwa-trading-platform.md |

## Security (`SEC`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P2-SEC-01 | DONE | Webhook auth for partner ingest | `lib/partner-webhook-auth.ts`, guardrail tests, `ops:env` secret warning; route wiring when webhooks ship |
| P2-SEC-02 | DONE | Cap scraper response sizes | `SCRAPER_MAX_RESPONSE_BYTES` (5 MB) in `lib/scrapers/scraper-utils.ts` |
| P2-SEC-03 | TODO | Robots/TOS compliance per external source | Aggregator Phase 4 |

## Ops (`OPS`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P2-OPS-01 | DONE | Operations hardening runbook | `operations-hardening.md` |
| P2-OPS-02 | DONE | Performance hygiene runbook | `performance-hygiene.md` |
| P2-OPS-03 | DONE | Perf guardrail tests | `perf-hygiene.test.ts` |
| P2-OPS-04 | TODO | Sync health dashboard in admin | Extend ops-status UI |
| P2-OPS-05 | TODO | Public runbook for sync failure backfill | Partner stub Phase 4 |

## Testing (`TST`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P2-TST-01 | DONE | External listings unit tests | |
| P2-TST-02 | TODO | Discover page smoke (flag on) | |
| P2-TST-03 | TODO | Sync external listings integration test | Mock HTTP |
| P2-TST-04 | TODO | Proxy/middleware integration test | Optional |

## UX (`UX`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P2-UX-01 | TODO | Discover empty state after sync failure | Copy exists; test UX |
| P2-UX-02 | TODO | Platform fee / buyback % disclaimer on discover cards | Trust copy |
| P2-UX-03 | TODO | FMV movers widget (24h/7d) | Aggregator Phase 3 |

**P2 exit criteria:** Discover enabled on staging with 100+ listings; CC sync reliable; Phygitals path documented; monitoring live.

---

# P3 — Product expansion (post-MVP)

## Product (`PRD`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P3-PRD-01 | TODO | On-chain burn + purchase program | `VAULT_MARKETPLACE_ROADMAP.md` — **vault lane only** |
| P3-PRD-02 | TODO | Auto-fulfillment via `SERVER_WALLET_SECRET` | v1 manual deployer transfer |
| P3-PRD-03 | TODO | Community voting / partner pools | Reserved in product rules |
| P3-PRD-04 | TODO | Giveaway / campaign flows | — |
| P3-PRD-05 | TODO | Stream-integrated live pull events | Home embed |
| P3-PRD-06 | TODO | Buy-from-vault mechanics | Pricing rules engine |
| P3-PRD-07 | TODO | Referral / affiliate program | — |
| P3-PRD-08 | TODO | Roadmap CMS or admin-editable roadmap | Static `/roadmap` |
| P3-PRD-09 | TODO | Partner `PartnerSource` enum ingest | Unified pulls |
| P3-PRD-10 | TODO | Admin verify/dispute pull before proof claims | Partner stub Phase 3 |

## Marketplace (`MKT`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P3-MKT-01 | TODO | Tensor program settlement on `/trade` | [onchain-trade-stack.md](./integrations/onchain-trade-stack.md) Phase 1 |
| P3-MKT-02 | TODO | Escrow via `tensor-foundation/escrow` | Bid escrow on trade lane; see onchain doc |
| P3-MKT-03 | TODO | NFT/cNFT ownership verification | DAS + gacha-nft-metadata |
| P3-MKT-04 | TODO | Inventory hold during stream events | — |
| P3-MKT-05 | TODO | Tensor AMM v2 (`tensor-foundation/amm`) | Post-MVP sweep / instant sell |

## Wallet (`WAL`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P3-WAL-01 | TODO | Unified Wallet Kit on `/trade` | vs wallet-adapter on `/vault/*` checkout |
| P3-WAL-02 | TODO | Social login embedded wallets | Phantom skill path |
| P3-WAL-03 | TODO | Token-gated community features | SVF balance checks |

## Data (`DAT`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P3-DAT-01 | TODO | Webhook ingest from partners | Phase 4 aggregator |
| P3-DAT-02 | TODO | Historical vault growth time series | Analytics |
| P3-DAT-03 | TODO | Pull ROI / FMV delta tracking | poke6900-style movers |

## Growth (`GRW`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P3-GRW-01 | TODO | Community prediction polls | Optional; non-commerce |
| P3-GRW-02 | TODO | SVF price strip on discover | Dexscreener embed |
| P3-GRW-03 | TODO | Live stream schedule + status | `/streams` enhancement |

## Security (`SEC`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P3-SEC-01 | TODO | Smart contract audit | Blocks mainnet programs |
| P3-SEC-02 | TODO | Formalize transfer vs burn economics copy | Checklist item |

## Testing (`TST`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P3-TST-01 | TODO | Contract integration tests | Anchor |
| P3-TST-02 | TODO | Load test reserve under burst | — |

---

# P4 — Polish, growth, scale

## Testing (`TST`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P4-TST-01 | TODO | Playwright E2E suite | Purchase + discover deep link |
| P4-TST-02 | TODO | Visual regression on home/marketplace | — |
| P4-TST-03 | TODO | a11y audit (axe) in CI | — |

## UX (`UX`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P4-UX-01 | TODO | Internationalization | — |
| P4-UX-02 | TODO | Dark/light theme toggle | Dark default |
| P4-UX-03 | TODO | Advanced slab compare UI | Cross-platform |
| P4-UX-04 | TODO | Pull clip theatre mode | — |

## Growth (`GRW`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P4-GRW-01 | TODO | SEO programmatic discover pages | Grade/set landing |
| P4-GRW-02 | TODO | Sitemap includes `/discover` when enabled | `buildPageMetadata` |
| P4-GRW-03 | TODO | Open Graph images per slab | — |
| P4-GRW-04 | TODO | Newsletter / waitlist capture | — |

## Ops (`OPS`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P4-OPS-01 | TODO | Multi-region RPC failover | — |
| P4-OPS-02 | TODO | Prisma Accelerate production path | Commented in `.env.example` |
| P4-OPS-03 | TODO | Status page for cron/sync health | — |

## Product (`PRD`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P4-PRD-01 | TODO | LP / ecosystem landing refinements | `/svf` exists |
| P4-PRD-02 | TODO | Advanced analytics dashboard | Vault growth |
| P4-PRD-03 | TODO | Mobile PWA manifest | — |

## Integrations (`INT`)

| ID | Status | Item | Notes |
|----|--------|------|-------|
| P4-INT-01 | TODO | Caggy-style portfolio import | Out of v1 scope |
| P4-INT-02 | TODO | PriceCharting FMV API | Reference only |
| P4-INT-03 | TODO | Multichain RWA (Base Beezie, Polygon Courtyard) | Phase 3 experimental — [tensor-fork-feasibility.md](./integrations/tensor-fork-feasibility.md) |

---

## Summary counts (approximate)

| Priority | DONE | TODO | Total |
|----------|------|------|-------|
| P0 | 22 | 18 | 40 |
| P1 | 38 | 22 | 60 |
| P2 | 18 | 32 | 50 |
| P3 | 0 | 22 | 22 |
| P4 | 0 | 18 | 18 |
| **Total** | **~78** | **~112** | **~190** |

*Plus kickoff + sprint sections ≈ 200 actionable lines.*

---

## Top 13 P0 items still open

1. **P0-SEC-08** — Durable rate limiting (Upstash/Redis) for production API traffic  
2. **P0-SEC-09** — Wallet-signed authorization for transaction status (replace `buyerWallet` query trust)  
3. **P0-SEC-10** — Enable `RESERVE_REQUIRE_WALLET_CHALLENGE=true` in production  
4. **P0-SEC-11** — Per-user admin accounts with hashed credentials  
5. **P0-SEC-12** — Role-based authorization on all admin API handlers  
6. **P0-OPS-06** — Enforce `qa:ci` on every PR in CI  
7. **P0-OPS-07** — Staging full purchase + fulfill rehearsal (documented sign-off)  
8. **P0-OPS-08** — Production backup verification before migrations  
9. **P0-OPS-09** — Confirm `ExternalListing` migration applied on production DB  
10. **P0-OPS-10** — Production error monitoring + alerting (Sentry or equivalent)  
11. **P0-TST-05** — E2E purchase smoke test on each deployment  
12. **P0-TST-06** — Route-level integration test for `POST /api/admin/pricing`  
13. **P0-MKT-04** — Alerting for failed on-chain verification / replay spikes

---

## Related docs

- [**Status orchestrator**](../STATUS.md) — picks next Tensor clone task from [tensor-clone-epics.md](./tensor-clone-epics.md)
- [**Tensor clone epics**](./tensor-clone-epics.md) — 112 granular tasks (`TC-001`–`TC-132`) for `/trade` desk
- [Tensor fork feasibility](./integrations/tensor-fork-feasibility.md)
- [RWA trading platform /trade spec](./integrations/rwa-trading-platform.md)
- [Gacha NFT metadata (CC pNFT, Phygitals cNFT)](./integrations/gacha-nft-metadata.md)
- [Migration baseline runbook](./runbooks/migration-baseline.md)
- [Operations hardening](./runbooks/operations-hardening.md)
- [Performance hygiene](./runbooks/performance-hygiene.md)
- [Phygitals & Collector Crypt (stub)](./integrations/phygitals-collectorcrypt.md)
- [Solana marketplace aggregator](./integrations/solana-marketplace-aggregator.md)
- [On-chain trade stack](./integrations/onchain-trade-stack.md)
- [Vault marketplace roadmap](../VAULT_MARKETPLACE_ROADMAP.md)
- [Security checklist](../SECURITY_CHECKLIST.md)
- [Discover setup](./discover-setup.md)
