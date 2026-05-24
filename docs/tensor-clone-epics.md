# Tensor Clone Epics — SlabVault `/trade`

**Path:** `docs/tensor-clone-epics.md`  
**Last audited:** 2026-05-21  
**Orchestrator:** [STATUS.md](../STATUS.md) — picks the next eligible task  
**Parent backlog:** [mvp-backlog.md](./mvp-backlog.md) (P2 `P2-INT-T*` / `P2-INT-OC*`)

**Scope:** 132 concrete tasks (`TC-001`–`TC-132`) to reach Tensor-for-Slabs parity (read desk → buy → list → bid). Not a literal 1:1 clone of tensor.trade — see [tensor-tradesite-ux-audit.md](./integrations/tensor-tradesite-ux-audit.md) §5 (do-not-copy).

**Sources:**

| Doc | Contribution |
|-----|----------------|
| [tensor-tradesite-ux-audit.md](./integrations/tensor-tradesite-ux-audit.md) | 15 UI components, week 1–4 UX build list |
| [tensor-repo-vendoring.md](./integrations/tensor-repo-vendoring.md) | npm / submodule / week 1–4 integration order |
| [onchain-trade-stack.md](./integrations/onchain-trade-stack.md) | TCM, fees, escrow, whitelist, AMM phases |
| [tensor-fork-feasibility.md](./integrations/tensor-fork-feasibility.md) | Integrate-first, ME aggregation, IA |
| [marketplace-nextjs-template](https://github.com/tensor-hq/marketplace-nextjs-template) | BFF route patterns, grid/wallet shell — **UI only** |

---

## Legend

| Field | Values |
|-------|--------|
| **Effort** | `S` (≤0.5d) · `M` (1–2d) · `L` (3–5d) |
| **Parallel** | `Y` = no unfinished deps in same epic chain · `N` = serialize (shared files, tx pipeline, schema) |
| **Status** | `DONE` · `TODO` |
| **Week** | Aligns with [tensor-repo-vendoring.md](./integrations/tensor-repo-vendoring.md) |

**Task ID:** `TC-{NNN}` (001–132). **Epic ID:** `TC-EP-{CAT}`.

---

## Milestone gates (M0–M6)

Epics map to [GRAILS milestones](./integrations/grails-step-by-step-plan.md). **M6 multichain = Phase 3** (Beezie Base, Courtyard Polygon). Do not start M5/M6 before M1–M4 foundations ship.

| Milestone | Outcome | Primary epics | Status today |
|-----------|---------|---------------|--------------|
| **M0** | Registry, adapter contract, docs truth, one workstream | TC-EP-API (contract), TC-EP-SDK (gates) | **Done** (2026-05-21) |
| **M1** | Live ingest — floors, grids, activity | TC-EP-API, TC-EP-ACT | **Partial** — CC + JSON seed; prod cron TBD |
| **M2** | tensor.trade desk UX parity | TC-EP-SHELL, TC-EP-COLL, TC-EP-ITEM, TC-EP-MOB | **Partial** — ~55% layout; BIDS live |
| **M3** | On-chain Solana fill/list/bid | TC-EP-MODAL, TC-EP-TCM, TC-EP-SDK, TC-EP-WL | **Partial** — BFF + SDK wired; no verified fill |
| **M4** | Cross-venue ME + vault TCM listings | TC-EP-VAULT, TC-EP-API (merge) | **Not started** |
| **M5** | Cert-unified compare index | TC-EP-ITEM (compare), TC-EP-API (TC-058) | **Not started** |
| **M6** | Multichain Beezie + Courtyard (**Phase 3**) | Registry + future adapters | **Not started** (preview rows only) |

**Next session:** Segment 2 — Live listing data (M1). See [grails-step-by-step-plan.md](./integrations/grails-step-by-step-plan.md).

---

## Epic index

| Epic ID | Name | Milestone | Effort | Depends on | Parallel | Status | Tasks |
|---------|------|-----------|--------|------------|----------|--------|-------|
| TC-EP-SHELL | UI shell & desk chrome | M2 | M | — | Y | PARTIAL | TC-001–012 |
| TC-EP-COLL | Collection pages | M1–M2 | L | TC-EP-SHELL, TC-EP-API | N | PARTIAL | TC-013–026 |
| TC-EP-ITEM | Item / slab page | M2 | M | TC-EP-COLL | N | PARTIAL | TC-027–036 |
| TC-EP-MODAL | Buy / list / offer modals | M3 | L | TC-EP-ITEM, TC-EP-TCM | N | PARTIAL | TC-037–048 |
| TC-EP-API | Tensor API reads & BFF | M0–M1 | M | — | Y | PARTIAL | TC-049–062 |
| TC-EP-SDK | SDK install & vendoring | M0–M3 | M | — | Y | PARTIAL | TC-063–072 |
| TC-EP-TCM | TCM fill / list / bid txs | M3 | L | TC-EP-SDK | N | PARTIAL | TC-073–084 |
| TC-EP-WL | Whitelist on-chain | M3 | M | TC-EP-SDK | N | TODO | TC-085–092 |
| TC-EP-VAULT | Vault treasury listings | M4 | M | TC-EP-TCM | N | TODO | TC-093–102 |
| TC-EP-ACT | Activity feed | M1–M2 | M | TC-EP-API | Y | PARTIAL | TC-103–110 |
| TC-EP-MOB | Mobile desk UX | M2+ | M | TC-EP-COLL, TC-EP-ITEM | N | TODO | TC-111–118 |
| TC-EP-PERF | Performance & caching | M1–M4 | M | TC-EP-API | Y | TODO | TC-119–124 |
| TC-EP-TST | Tests & acceptance | All | M | All P0 epics | N | PARTIAL | TC-125–132 |

*Epic **PARTIAL** when some child tasks are `DONE` and others `TODO`.*

---

## TC-EP-SHELL — UI shell & desk chrome

| Epic | Effort | Depends | Parallel | Status |
|------|--------|---------|----------|--------|
| TC-EP-SHELL | M | — | Y | PARTIAL |

| ID | Task | Effort | Deps | ∥ | Status | Notes |
|----|------|--------|------|---|--------|-------|
| TC-001 | `TradeDeskShell` layout: sticky desk header below site nav, max-width 1600px | S | — | Y | DONE | `components/trade/trade-desk-shell.tsx` |
| TC-002 | `TradeDeskHeader`: Market / Portfolio tabs, experimental badge | S | TC-001 | Y | DONE | `trade-desk-header.tsx` |
| TC-003 | Wallet CTA on all `/trade/*` via existing `WalletButton` | S | TC-002 | Y | DONE | Unified-Wallet-Kit deferred |
| TC-004 | Search placeholder in desk header (“Search certs (soon)”) | S | TC-002 | Y | DONE | ⌘K global search = TC-012 |
| TC-005 | `TradeCollectionNav` — horizontal collection chips on landing + desk | M | TC-001 | Y | DONE | `trade-collection-nav.tsx` |
| TC-006 | Trade route group `layout.tsx`: isolate metadata, loading, no vault checkout wallet conflict | S | — | Y | DONE | `app/trade/layout.tsx` |
| TC-007 | `RWA_TRADE_ENABLED` gate + “coming soon” when off | S | — | Y | DONE | `lib/trade-config.ts` |
| TC-008 | Canonical routes: `/trade/slab/[certOrMint]`, redirect `/trade/item/*` | S | — | Y | DONE | `lib/trade-routes.ts`, tests |
| TC-009 | Landing `TradeLandingDeskClient`: hero + collection previews | M | TC-001 | Y | DONE | `trade-landing-desk-client.tsx` |
| TC-010 | `CollectionIndexTable` on landing (floor, listed %, 24h vol columns) | M | TC-EP-API | N | TODO | Tensor homepage table pattern |
| TC-011 | Footer desk ticker (optional SOL/USD, 24h vol) — read-only | S | TC-EP-API | Y | TODO | Defer Pro/Lite toggle |
| TC-012 | Global ⌘K search: cert, mint, collection slug | L | TC-EP-API | N | TODO | v2; depends TC-056 |

**Template port refs:** marketplace-nextjs-template `Layout`, `Navbar`, collection index table.

---

## TC-EP-COLL — Collection pages

| Epic | Effort | Depends | Parallel | Status |
|------|--------|---------|----------|--------|
| TC-EP-COLL | L | TC-EP-SHELL, TC-EP-API | N | PARTIAL |

| ID | Task | Effort | Deps | ∥ | Status | Notes |
|----|------|--------|------|---|--------|-------|
| TC-013 | `/trade/c/[slug]` server page: collection config + depth loader | S | TC-007 | Y | DONE | `app/trade/c/[slug]/page.tsx` |
| TC-014 | `CollectionStatsRibbon`: floor, sell now, listed/supply, 24h vol | M | TC-049 | Y | DONE | `collection-stats-ribbon.tsx` |
| TC-015 | Three-column desk: filters · grid · activity (`TradeCollectionDeskClient`) | M | TC-001 | Y | DONE | `trade-collection-desk-client.tsx` |
| TC-016 | `TradeListingGrid` + `TradeListingTile` cert-first tiles | M | TC-008 | Y | DONE | Links to `/trade/slab/*` |
| TC-017 | `TradeDeskToolbar`: sort, grid/table toggle, density | M | TC-016 | Y | DONE | `trade-desk-toolbar.tsx` |
| TC-018 | `TradeTraitFilters` → price + grade; extend grader/set accordions | M | TC-016 | Y | PARTIAL | `trade-trait-filters.tsx` — URL sync TODO |
| TC-019 | Filter state synced to URL (`searchParams`) | M | TC-018 | N | TODO | Shareable collection views |
| TC-020 | CC collection live grid from partner ingest (no Tensor key required) | M | TC-049-P | N | DONE | `TradePartnerCollectionDesk` + partner BFF |
| TC-021 | Phygitals collection page from partner ingest | M | TC-020 | N | DONE | Same BFF; DAS when `collectionMint` set |
| TC-022 | Treasury `slabvault-treasury` desk: Postgres slabs + vault badge | M | TC-016 | Y | DONE | Local listings path |
| TC-023 | Collection tabs: ITEMS · BIDS · ACTIVITY (ORDERS/TRAITS/HODLERS stub) | S | TC-015 | Y | PARTIAL | BIDS live via `CollectionBidsPanel`; ORDERS/TRAITS/HODLERS = `CollectionTabSoon` |
| TC-024 | `VenueBadge` on tiles: CC · Phygitals · ME · Treasury | M | TC-050 | Y | DONE | `components/trade/venue-badge.tsx` on `nft-card` |
| TC-025 | Partner collection header: social links, whitelist badge slot | S | TC-EP-WL | Y | TODO | |
| TC-026 | `InstantSellCard` at grid top (best bid + SELL NOW) | M | TC-EP-TCM | N | TODO | P2 — week 4+ |

---

## TC-EP-ITEM — Item / slab page

| Epic | Effort | Depends | Parallel | Status |
|------|--------|---------|----------|--------|
| TC-EP-ITEM | M | TC-EP-COLL | N | PARTIAL |

| ID | Task | Effort | Deps | ∥ | Status | Notes |
|----|------|--------|------|---|--------|-------|
| TC-027 | `/trade/slab/[certOrMint]` route + `resolveTradeListing` | M | TC-008 | Y | DONE | `lib/trade/resolve-listing.ts` |
| TC-028 | `TradeItemDetailClient`: image, cert hero, ask price, CTAs | M | TC-027 | Y | DONE | `trade-item-detail-client.tsx` |
| TC-029 | Breadcrumb: collection → item name | S | TC-028 | Y | TODO | |
| TC-030 | Tabs: OVERVIEW · ACTIVITY · OFFERS (stubs) | S | TC-028 | Y | TODO | |
| TC-031 | Provenance block: vault pull, `vaultedUrl`, stream clip link | M | TC-028 | Y | TODO | Slab-specific |
| TC-032 | FMV / comp band display-only row | S | TC-028 | Y | TODO | No pricing API yet |
| TC-033 | Cross-lane badge: “Buy from vault” when cert in treasury shop | M | TC-022 | Y | TODO | Dedupe cert # |
| TC-034 | Item loader: Tensor mint + cert alias via DAS | M | TC-057 | N | TODO | `TC-057` cert↔mint |
| TC-035 | Prev/next in collection navigation | M | TC-016 | Y | TODO | |
| TC-036 | Fulfillment disclaimer for physical vaulted slabs | S | TC-028 | Y | TODO | [vault-to-trade-listings.md](./integrations/vault-to-trade-listings.md) |

---

## TC-EP-MODAL — Buy / list / offer modals

| Epic | Effort | Depends | Parallel | Status |
|------|--------|---------|----------|--------|
| TC-EP-MODAL | L | TC-EP-ITEM, TC-EP-TCM | N | PARTIAL |

| ID | Task | Effort | Deps | ∥ | Status | Notes |
|----|------|--------|------|---|--------|-------|
| TC-037 | `BuyNowModal`: price SOL/USD, royalty %, venue label | M | TC-028 | N | DONE | UX audit #6; `components/trade/buy-now-modal.tsx` |
| TC-038 | Buy flow: wallet gate → simulate → sign (`buildFillTransaction`) | L | TC-073 | N | PARTIAL | `useTensorBuy` + BFF; no verified mainnet fill |
| TC-039 | Buy error states: rejected, insufficient SOL, rule set block | M | TC-038 | N | TODO | |
| TC-040 | `PlaceOfferModal`: price + expiry | M | TC-028 | N | DONE | Stub — `components/trade/place-offer-modal.tsx` |
| TC-041 | Offer tx: escrow accounts via `tensor-escrow` client | L | TC-082 | N | TODO | |
| TC-042 | `ListForSaleModal`: fixed price for owned slab | M | TC-093 | N | DONE | Stub — portfolio listings tab |
| TC-043 | List tx: `buildListTransaction` wired to tensorswap SDK | L | TC-074 | N | PARTIAL | BFF + SDK wired; staging verification pending |
| TC-044 | Delist / cancel listing from portfolio | M | TC-043 | N | PARTIAL | `DelistModal` + `useTensorDelist` on portfolio sticky bar |
| TC-045 | Modal a11y: focus trap, ESC, labelled inputs | S | TC-037 | Y | DONE | `trade-modal-shell.tsx` |
| TC-046 | CSRF + wallet challenge on `POST /api/trade/*` writes | M | TC-038 | N | TODO | Reuse marketplace patterns |
| TC-047 | Receipt toast + link to Solscan + activity row | S | TC-038 | Y | TODO | |
| TC-048 | Defer: sweep panel, collection bid, Crossmint fiat | — | — | — | TODO | Do-not-copy §5 |

---

## TC-EP-API — Partner ingest & optional Tensor BFF

| Epic | Effort | Depends | Parallel | Status |
|------|--------|---------|----------|--------|
| TC-EP-API | M | — | Y | PARTIAL |

**Read-path priority:** `lib/partner-listings.ts` (CC scraper + `ExternalListing` + JSON + DAS) → optional Tensor REST for ME / keyed shortcuts. **Not** Tensor ME index as primary for CC/Phygitals.

| ID | Task | Effort | Deps | ∥ | Status | Notes |
|----|------|--------|------|---|--------|-------|
| TC-049 | `lib/partner-listings.ts`: merge CC + Phygitals sources | M | — | Y | DONE | JSON/DB, live scraper, DAS when mint set |
| TC-049-P | BFF `GET /api/trade/partners/[platform]/listings` | M | TC-049 | Y | DONE | `collector_crypt`, `phygitals` |
| TC-049-S | BFF `GET /api/trade/partners/[platform]/stats` | S | TC-049 | Y | DONE | Floor + count; no Tensor API |
| TC-050 | `getTradeCollectionDepth`: partner ingest first, Tensor fallback | M | TC-049 | Y | DONE | `lib/trade/tensor-collection-depth.ts` |
| TC-051 | `resolveTensorSlugForCollection` + `TENSOR_CC_COLLECTION_SLUGS` | S | — | Y | DONE | Optional shortcut — `tensor-tcm.ts` |
| TC-052 | BFF `GET /api/trade/collections/[slug]/depth` with cache headers | M | TC-050 | Y | DONE | Depth BFF; desk prefers TC-049-P |
| TC-053 | BFF `GET /api/trade/listings/[mint]` single listing | M | TC-049 | Y | TODO | Partner + treasury resolve |
| TC-054 | Rate-limit + 503 envelope when upstream ingest fails | S | TC-052 | Y | TODO | Partner + Tensor paths |
| TC-055 | Document `TENSOR_API_KEY` as optional shortcut (not MVP blocker) | S | — | Y | DONE | `.env.example`, STATUS.md |
| TC-056 | Optional Tensor websocket for live activity | L | TC-055 | Y | TODO | SDK-only fallback ok |
| TC-057 | Helius DAS in partner merge + stats fallback | M | TC-049 | Y | DONE | `searchDasCollectionAssets` |
| TC-058 | Cert↔mint resolver API `GET /api/trade/resolve?cert=` | M | TC-057 | N | TODO | Prisma `CertMintLink` |
| TC-059 | Persist partner listing snapshot to Postgres cache | L | TC-049-P | N | TODO | Phase 2 indexer |
| TC-060 | Partner deep-link CTA on buy modal (TCM when owner) | S | TC-049 | Y | DONE | `buy-now-modal.tsx` |
| TC-061 | `ops:env:production` checks for ingest + optional `TENSOR_*` | S | — | Y | TODO | P2-INT-T19 |
| TC-062 | Partner + Tensor BFF integration tests (mock fetch) | M | TC-049-P, TC-052 | Y | DONE | `api-trade-partner-listings.test.ts`, depth tests |

---

## TC-EP-SDK — SDK install & vendoring

| Epic | Effort | Depends | Parallel | Status |
|------|--------|---------|----------|--------|
| TC-EP-SDK | M | — | Y | PARTIAL |

| ID | Task | Effort | Deps | ∥ | Status | Notes |
|----|------|--------|------|---|--------|-------|
| TC-063 | Pin `@tensor-oss/tensorswap-sdk` + `@tensor-oss/tcomp-sdk` | S | — | Y | DONE | `package.json` |
| TC-064 | `lib/integrations/tensor.ts` env + repo map | S | — | Y | DONE | |
| TC-065 | `programs/idl-lock.json` SHA documented | S | — | Y | DONE | Submodule not init |
| TC-066 | `git submodule` `vendor/tensor-idls` @ idl-lock SHA | M | TC-065 | N | TODO | Week 2 |
| TC-067 | Copy/sync IDLs to `lib/onchain/idl/*.json` | M | TC-066 | N | PARTIAL | JSON present; lock submodule |
| TC-068 | SDK-examples spike script: read-only CC collection | M | TC-063 | Y | TODO | `scripts/` or `tools/` |
| TC-069 | `web3.js` v1 compatibility check vs marketplace JS v2 | S | TC-063 | Y | TODO | Defer `@tensor-foundation/marketplace` |
| TC-070 | Unified-Wallet-Kit evaluation on `/trade` route group | M | TC-003 | Y | TODO | Isolate from vault checkout |
| TC-071 | `TENSOR_TRADE_WRITE_ENABLED` gate in all tx builders | S | — | Y | DONE | `lib/integrations/tensor.ts` |
| TC-072 | Document npm bundle in tensor-repo-vendoring § npm install | S | TC-063 | Y | DONE | Doc exists |

---

## TC-EP-TCM — TCM fill / list / bid

| Epic | Effort | Depends | Parallel | Status |
|------|--------|---------|----------|--------|
| TC-EP-TCM | L | TC-EP-SDK | N | PARTIAL |

| ID | Task | Effort | Deps | ∥ | Status | Notes |
|----|------|--------|------|---|--------|-------|
| TC-073 | Wire `buildFillTransaction` to tensorswap fill ix | L | TC-063, TC-066 | N | DONE | `tensor-tcm.ts` + SDK deps |
| TC-074 | Wire `buildListTransaction` for pNFT fixed ask | L | TC-073 | N | DONE | BFF `GET /api/trade/tx/list` |
| TC-075 | Attach Tensor **fees** program accounts on fill | M | TC-073 | N | TODO | `lib/onchain/fees.ts` |
| TC-076 | Broker PDA → SVF treasury (`SVF_BROKER_PUBKEY`) | M | TC-075 | N | TODO | Devnet spike |
| TC-077 | ME-origin fill routing when `venue=magic_eden` | L | TC-073 | N | TODO | SDK venue tag |
| TC-078 | `GET /api/trade/tx/*` (buy/list/delist/bid/cancel-bid) simulate + serialized tx | M | TC-073 | N | DONE | Write gate when flag off |
| TC-079 | Tx verify hook (reuse `marketplace-payment-verify`) | M | TC-078 | N | TODO | |
| TC-080 | Phygitals cNFT fill spike via `tcomp-sdk` | L | TC-063 | N | TODO | Week 3 |
| TC-081 | Bid create/cancel with **escrow** accounts | L | TC-073 | N | TODO | Week 4 |
| TC-082 | `lib/onchain/clients/tensor-escrow.ts` account metas from IDL | M | TC-067 | N | TODO | Stub today |
| TC-083 | AMM pool depth read-only (`tensor-amm.ts`) | M | TC-049 | Y | TODO | Badge only MVP |
| TC-084 | Devnet/mainnet-beta: one documented CC fill E2E | L | TC-078 | N | TODO | Exit week 2 |

---

## TC-EP-WL — Whitelist on-chain

| Epic | Effort | Depends | Parallel | Status |
|------|--------|---------|----------|--------|
| TC-EP-WL | M | TC-EP-SDK | N | TODO |

| ID | Task | Effort | Deps | ∥ | Status | Notes |
|----|------|--------|------|---|--------|-------|
| TC-085 | `tensor-whitelist.ts` client: read proof for collection mint | M | TC-067 | N | TODO | TL1ST program |
| TC-086 | Map CC collection mint in `lib/onchain/collections.ts` | S | TC-057 | Y | TODO | DAS-confirmed |
| TC-087 | Map Phygitals tree/collection mint | S | TC-080 | N | TODO | Week 3 |
| TC-088 | Operator script: whitelist CC + treasury collections | M | TC-085 | N | TODO | Multisig recommended |
| TC-089 | UI “Whitelisted on Tensor” badge when proof exists | S | TC-085, TC-025 | Y | TODO | |
| TC-090 | Admin ops-status: whitelist + fee PDA viewer | M | TC-076 | N | TODO | |
| TC-091 | Document partner co-sign requirement for broker fees | S | — | Y | TODO | Open question OC stack |
| TC-092 | Do not fork whitelist program in MVP | — | — | — | DONE | Policy |

---

## TC-EP-VAULT — Vault treasury listings

| Epic | Effort | Depends | Parallel | Status |
|------|--------|---------|----------|--------|
| TC-EP-VAULT | M | TC-EP-TCM | N | TODO |

| ID | Task | Effort | Deps | ∥ | Status | Notes |
|----|------|--------|------|---|--------|-------|
| TC-093 | `lib/trade/vault-listings.ts` stubs → real list ix | M | TC-074 | N | TODO | |
| TC-094 | `CertMintLink` Prisma model + migration | M | — | N | TODO | gacha-nft-metadata |
| TC-095 | Admin: link `Slab` → mint before list | M | TC-094 | N | TODO | |
| TC-096 | Vault wallet list flow from `/trade/portfolio` | M | TC-042 | N | TODO | |
| TC-097 | Vault badge when `sellerWallet === deployer` | S | TC-024 | Y | PARTIAL | `PlatformBadge` slabvault |
| TC-098 | Fulfillment queue on TCM fill event (not `Transaction`) | L | TC-079 | N | TODO | [vault-to-trade-listings.md](./integrations/vault-to-trade-listings.md) |
| TC-099 | Delist on slab sold / withdrawn | M | TC-044 | N | TODO | |
| TC-100 | Redirect `/vault/shop` → `/trade/c/slabvault-treasury` | S | TC-022 | Y | DONE | Site redirects per mvp-backlog |
| TC-101 | No new `Transaction` checkout for treasury inventory | — | — | — | DONE | Policy |
| TC-102 | ≥1 treasury slab listable on staging | M | TC-096 | N | TODO | Week 4 exit |

---

## TC-EP-ACT — Activity feed

| Epic | Effort | Depends | Parallel | Status |
|------|--------|---------|----------|--------|
| TC-EP-ACT | M | TC-EP-API | Y | TODO |

| ID | Task | Effort | Deps | ∥ | Status | Notes |
|----|------|--------|------|---|--------|-------|
| TC-103 | Replace `buildStubTradeActivityFeed` with Tensor events | M | TC-052 | Y | DONE | `lib/trade/trade-activity.ts`, `tensor-api.ts` |
| TC-104 | `TradeActivityPanel` collection side rail | M | TC-103 | Y | DONE | `components/trade/trade-activity-panel.tsx` |
| TC-105 | Item ACTIVITY tab data loader | M | TC-030, TC-103 | N | TODO | |
| TC-106 | `GET /api/trade/activity?collection=` BFF | M | TC-052 | Y | DONE | `app/api/trade/activity/route.ts` |
| TC-107 | Event row: cert, venue, Solscan link | S | TC-103 | Y | TODO | |
| TC-108 | Poll interval + stale badge (>60s) | S | TC-103 | Y | TODO | |
| TC-109 | Global `/trade/activity` feed page | M | TC-106 | Y | TODO | Optional route |
| TC-110 | Growth event `cta_trade_fill` on successful buy | S | TC-038 | Y | TODO | |

---

## TC-EP-MOB — Mobile desk UX

| Epic | Effort | Depends | Parallel | Status |
|------|--------|---------|----------|--------|
| TC-EP-MOB | M | TC-EP-COLL, TC-EP-ITEM | N | TODO |

| ID | Task | Effort | Deps | ∥ | Status | Notes |
|----|------|--------|------|---|--------|-------|
| TC-111 | Filter drawer on `<md` (replaces left rail) | M | TC-018 | N | TODO | |
| TC-112 | Collection tabs horizontal scroll | S | TC-023 | Y | TODO | |
| TC-113 | `TradeMobileActionBar`: sticky BUY on item page | M | TC-037 | N | TODO | |
| TC-114 | 2-column grid default on mobile | S | TC-016 | Y | DONE | `trade-grid` classes |
| TC-115 | Bottom nav: Market · Portfolio (trade-scoped) | M | TC-002 | N | TODO | |
| TC-116 | Touch targets ≥44px on tile BUY/BID | S | TC-016 | Y | TODO | |
| TC-117 | Item page vertical stack: image → price → CTA | S | TC-028 | Y | PARTIAL | Responsive CSS only |
| TC-118 | Reduced-motion: disable scroll-snap on carousel N/A | S | — | Y | TODO | |

---

## TC-EP-PERF — Performance & caching

| Epic | Effort | Depends | Parallel | Status |
|------|--------|---------|----------|--------|
| TC-EP-PERF | M | TC-EP-API | Y | TODO |

| ID | Task | Effort | Deps | ∥ | Status | Notes |
|----|------|--------|------|---|--------|-------|
| TC-119 | `cache()` / `unstable_cache` on collection depth RSC | M | TC-013 | Y | TODO | next-forge / cache components |
| TC-120 | Revalidate tag `trade:collection:{slug}` on cron | M | TC-119 | Y | TODO | |
| TC-121 | Image priority on above-fold tiles (LCP) | S | TC-016 | Y | TODO | |
| TC-122 | Cap listing page size (50) + “load more” | M | TC-050 | Y | TODO | |
| TC-123 | Optional `@tensor-foundation/smart-rpc` for confirm | M | TC-078 | Y | TODO | Week 4 |
| TC-124 | Perf test: collection page <3s TTFB on staging | S | TC-119 | Y | TODO | `perf-hygiene.test.ts` extend |

---

## TC-EP-TST — Tests & acceptance

| Epic | Effort | Depends | Parallel | Status |
|------|--------|---------|----------|--------|
| TC-EP-TST | M | P0 epics | N | PARTIAL |

| ID | Task | Effort | Deps | ∥ | Status | Notes |
|----|------|--------|------|---|--------|-------|
| TC-125 | `trade-desk-p0.test.ts` component existence | S | TC-001 | Y | DONE | |
| TC-126 | `trade-listings.test.ts` filter/sort/cert extract | S | — | Y | DONE | |
| TC-127 | `onchain-program-ids.test.ts` mainnet ID contract | S | — | Y | DONE | |
| TC-128 | Mock Tensor API integration test for depth mapper | M | TC-050 | Y | TODO | |
| TC-129 | Fill API guardrails (CSRF, write flag off) | M | TC-078 | N | TODO | |
| TC-130 | UX beta checklist (§8 ux-audit) as manual QA doc | S | — | Y | TODO | |
| TC-131 | Playwright: connect wallet → open buy modal (staging) | L | TC-037 | N | TODO | P4-TST-01 related |
| TC-132 | `npm run qa:ci` green after SDK tx wiring | S | TC-073 | N | TODO | |

---

## Week 1–4 rollup (execution order)

| Week | Focus | Complete when |
|------|--------|---------------|
| **1** | Shell + API read + CC grid | TC-020, TC-024, TC-055, TC-010 |
| **2** | Item buy path + fill tx | TC-037–039, TC-073–079, TC-084 |
| **3** | Phygitals + whitelist + fees PDA | TC-021, TC-080, TC-085–089, TC-076 |
| **4** | List/bid/portfolio/mobile/activity | TC-040–044, TC-096, TC-103–110, TC-111–113 |

---

## Cross-links

| Doc | Use |
|-----|-----|
| [STATUS.md](../STATUS.md) | **Orchestrator** — next task selection |
| [mvp-backlog.md](./mvp-backlog.md) | P0–P4 product priorities |
| [tensor-tradesite-ux-audit.md](./integrations/tensor-tradesite-ux-audit.md) | 15 components ↔ TC-EP-SHELL/MODAL |
| [tensor-repo-vendoring.md](./integrations/tensor-repo-vendoring.md) | npm/submodule ↔ TC-EP-SDK |
| [onchain-trade-stack.md](./integrations/onchain-trade-stack.md) | TCM/fees/escrow ↔ TC-EP-TCM/WL |
| [tensor-fork-feasibility.md](./integrations/tensor-fork-feasibility.md) | Strategy ↔ all epics |
| [grails-step-by-step-plan.md](./integrations/grails-step-by-step-plan.md) | Segment walkthrough + milestone gates |
| [m-milestone-status.md](./integrations/m-milestone-status.md) | M0–M6 snapshot |

---

## Summary

| Status | Count |
|--------|-------|
| DONE | 38 |
| TODO | 94 |
| **Total tasks** | **132** |

*Re-audit `DONE` after each merge — run `node --test tests/trade-desk-p0.test.ts` and grep `TC-` in this file.*
