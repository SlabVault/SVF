# GRAILS step-by-step plan

**Last updated:** 2026-05-22  
**North star:** GRAILS is **Tensor for RWA graded cards** — one desk to browse cross-venue liquidity, compare by cert, and settle wallet-native on Solana (then multichain).  
**How to use this doc:** Work **one segment at a time**. Finish acceptance criteria before starting the next segment. Do not run parallel agents on `app/trade/*`, `components/trade/*`, or `lib/partner-listings.ts` **within the same segment session**.

### Orchestrator lanes (continuous loops)

Six lane orchestrators run in **separate Cursor invocations** — see [grails-orchestrator-lanes.md](./grails-orchestrator-lanes.md).

| Lane | Handles |
|------|---------|
| **Segment** (this doc) | M0–M6 sequential work — **one segment focus per invocation**; does not replace human segment review |
| UI / Tensor parity | Browser crawl → `/trade` layout fixes (parallel) |
| Backend / Data | CC/Phygitals ingest, sync (parallel) |
| On-chain / TCM | BFF tx, SDK, broker PDA (parallel) |
| Security | CSRF, env, write-route guards (parallel) |
| QA / Debug | `npm test` / build → regression fixes (parallel) |

**Segment lane orchestrator** reads the current segment from this plan and works **only that segment** each loop. All six lanes may run **in parallel** via meta `run-all-lanes.md` with [concurrency caps](./orchestrator-concurrency.md) (5 spawns/lane, 1 iteration, 24 global max). Dedicated chats per lane remain valid for depth.

---

## Session workflow rule

| Rule | Detail |
|------|--------|
| **One segment per session** | Complete all acceptance criteria for the current segment before starting the next. No parallel trade-lane agents. |
| **Local dev** | Use `npm run dev:clean` only (not multiple concurrent `next dev` on trade files). |
| **Scope lock** | Do not start Segment N+1 work in the same session as Segment N. |
| **Verification** | Run `npm run test` at segment exit; fix only failures you cause. |

**Product one-liner (external comms):** GRAILS is Tensor for RWA graded cards — one desk to browse cross-venue liquidity, compare by cert, and settle wallet-native on Solana (SlabVault is vault proof; GRAILS is where collectors trade).

---

**Status key:** done · partial · not started

---

## Segment map

| # | Segment | Milestone | Effort | Status today |
|---|---------|-----------|--------|--------------|
| 1 | Foundation & docs truth | M0 | S | **done** (2026-05-21) |
| 2 | Live listing data | M1 | M | **done** (2026-05-21) |
| 3 | Trade desk UX shell | M2 | L | partial |
| 4 | On-chain Solana writes | M3 | L | partial |
| 5 | Cross-venue depth & vault listings | M4 | M | not started |
| 6 | Cert-unified compare index | M5 | M | not started |
| 7 | Multichain partners | M6 | L | not started |
| 8 | Portfolio & wallet flows | M3+ | M | partial |
| 9 | Production hardening | Ops | M | partial |
| 10 | Mobile & polish backlog | M2+ | M | not started |

---

## Segment 1 — Foundation & docs truth (M0)

**Goal:** After this segment, everyone can describe GRAILS in one sentence and all docs match the codebase.

**Product story:** Before building more features, lock the story: GRAILS is the full trading aggregator (not browse-only, not deep-link-only). SlabVault (`/`, `/vault`) is community vault proof; GRAILS (`/trade`) is where collectors trade.

**Acceptance criteria**

- [x] `docs/STATUS.md` reflects current trade capabilities (BFF tx routes, BIDS tab, portfolio LIST/DELIST, seller enrichment — not "~5% write path")
- [x] `docs/tensor-clone-epics.md` rows tagged with M0–M6 milestone gates; M6 multichain labeled Phase 3
- [x] `.cursor/plans/grails_trade_fix_plan_9c536d56.plan.md` YAML todos updated to match reality (or superseded by this doc)
- [x] Team rule documented: **one segment / one session** on trade lane; use `npm run dev:clean` only
- [x] Collection registry documents chain + settlement mode for all 7 partners (CC, Phygitals, ME, treasury, Beezie, Courtyard)

**Dependencies:** None — start here.

**Estimated effort:** S (1 session)

**Key files**

- `docs/STATUS.md`
- `docs/trade-architecture.md`
- `docs/tensor-clone-epics.md`
- `lib/onchain/collections.ts`
- `lib/partner-ingest-adapter.ts`
- `package.json` (`dev:clean`)

**User actions needed**

- Confirm sequential workflow: no parallel trade agents until Segment 1 exit criteria met
- Approve one-sentence product definition for external comms

**Status:** **done** — completed 2026-05-21. Registry + adapter contract verified; docs refreshed; sequential workflow locked in § Session workflow rule.

---

## Segment 2 — Live listing data (M1)

**Goal:** After this segment, `/trade` and `/trade/c/collector-crypt` look alive with real floors, priced grids, and honest activity — without requiring a wallet or on-chain writes.

**Product story:** Collectors trust a desk that shows live inventory. Partner ingest (CC, Phygitals) is the **primary read path**; Tensor API enriches ME depth later. This is the credibility layer Caggy proves — GRAILS must not show empty stats.

**Acceptance criteria**

- [x] `npm run sync:discover` documented in README/runbook; cron wired on staging/prod
- [x] Postgres `ExternalListing` upsert after sync (staging + prod)
- [x] `/trade` landing index table shows non-null floor, listed count, sell-now from partner ingest (not seed-only)
- [x] `/trade/c/collector-crypt` priced grid + stats ribbon + listing-derived activity (synthetic flag when applicable)
- [x] `/trade/c/phygitals` same desk shell with Phygitals data (live API or refreshed JSON seed)
- [x] Optional: `TENSOR_API_KEY` adds 24h vol/Δ on landing when configured
- [x] Tests green: `npm run test` (partner ingest + trade landing suite)

**Dependencies:** Segment 1 (docs truth, single workstream)

**Estimated effort:** M (1–2 sessions)

**Key files**

- `lib/partner-listings.ts`
- `lib/external-listings-sync.ts`
- `lib/phygitals-listings.ts`
- `lib/trade-landing.ts`
- `lib/data-sync.ts` (cron `/api/sync` → discover upsert)
- `lib/scrapers/collector-crypt-scraper.ts`
- `app/trade/c/[slug]/page.tsx`
- `app/api/trade/activity/route.ts`
- `scripts/sync-external-listings.ts`
- `prisma/schema.prisma` (`ExternalListing`)

**User actions needed**

- Set `DATABASE_URL` on staging/prod; apply `ExternalListing` migration
- Optional: `TENSOR_API_KEY`, `TENSOR_CC_COLLECTION_SLUGS`, `HELIUS_API_KEY`
- Optional: `PARTNER_LIVE_SCRAPE_ENABLED=true` on staging for CC live scrape experiments
- Run `npm run sync:discover` after deploy

**Status:** **done** — completed 2026-05-21. `POST /api/sync` (30m cron) runs `syncExternalListingsToJson` + full merged `ExternalListing` upsert; Phygitals seed refresh on each sync; landing `sellNowSol` from partner floor; tests 283 pass.

---

## Segment 3 — Trade desk UX shell (M2)

**Goal:** After this segment, GRAILS collection desk is structurally comparable to [tensor.trade/trade/collector_crypt](https://www.tensor.trade/trade/collector_crypt) — layout, density, filters, tabs — on **real M1 data**.

**Product story:** Tensor-grade UX is the trust signal for crypto-native collectors. GRAILS skin (`#641ae6`, dark desk) on Tensor structure = "this is a real trading desk," not a marketing page with buy buttons.

**Acceptance criteria**

- [ ] Pro layout: left BUY/SELL/SWEEP panel · trait filter rail · priced grid · activity column
- [ ] Stats ribbon: buy now, sell now, listed %, vol, sales, price Δ (from ingest or Tensor statsV2)
- [ ] Collection tabs: ITEMS · BIDS · ORDERS · TRAITS · HODLERS (stubs OK if labeled "Soon")
- [ ] Slab trait filters with URL sync (grader, grade, price range, search query)
- [ ] Grid toolbar: sort, refresh; density toggle (s/m/l)
- [ ] Venue badge on every listing tile
- [ ] Item page: commerce stack, OVERVIEW · ACTIVITY tabs; OFFERS stub labeled
- [ ] Footer ticker: Live · listed · floor · SOL/USD (24h vol when keyed)
- [ ] Copy checklist P0 gaps closed — see [tensor-tradesite-copy-checklist.md](./tensor-tradesite-copy-checklist.md)

**Dependencies:** Segment 2 (real data to validate density and stats)

**Estimated effort:** L (2–3 sessions)

**Key files**

- `components/trade/tensor/*`
- `components/trade/trade-collection-desk-client.tsx`
- `components/trade/trade-trait-filters.tsx`
- `components/trade/collection-stats-ribbon.tsx`
- `components/trade/trade-desk-toolbar.tsx`
- `components/trade/trade-item-detail-client.tsx`
- `components/trade/trade-footer-ticker.tsx`
- `components/trade/trade-command-palette.tsx`

**User actions needed**

- Capture logged-in portfolio screenshots from tensor.trade (see copy checklist § "Needs user logged-in portfolio screenshots")
- Side-by-side browser review: tensor.trade CC vs GRAILS CC

**Orchestrator crawl workflow (Segment 3 parity):** Use browser MCP on tensor.trade; compare regions to GRAILS files per [`.cursor/skills/tensor-tradesite-parity/SKILL.md`](../../.cursor/skills/tensor-tradesite-parity/SKILL.md). Spawn up to **10** background fix workers per run (one discrete gap each, one test file each); keep crawling while fixes run. Skip M5 cert compare and M6 multichain ingest spawns. Log gaps in [tensor-tradesite-crawl-2026-05-21.md](./tensor-tradesite-crawl-2026-05-21.md).

**Status today:** partial — ~67% layout parity per copy checklist (2026-05-22 audit); BIDS tab live; ⌘K collections+cert prefix; OFFERS/ORDERS partial panels  
**Orchestrator 2026-05-23:** segment lane inv1 workers landed (partner ↗ CTA, COMPARE/alternateVenueAsks strip, OFFERS Soon, landing merge stats); inv3 meta tick 3 — 5 bg doc workers (trade-architecture, staging checklist M3 prep, segment-3-exit-audit refresh, partner-aggregation sync, onchain-trade-stack aggregation); acceptance checkboxes unchanged pending human browser review.

---

## Segment 4 — On-chain Solana writes (M3)

**Goal:** After this segment, a staging user can connect a wallet and buy/list/delist/bid on an enriched CC listing without leaving GRAILS.

**Product story:** This is what separates GRAILS from Caggy and deep-link aggregators — **wallet-native settlement** via Tensor TCM programs (tensorswap for CC pNFT, tcomp for Phygitals cNFT).

**Acceptance criteria**

- [ ] All items in [trade-staging-checklist.md](../trade-staging-checklist.md) pre-flight checked
- [ ] `TENSOR_TRADE_WRITE_ENABLED=true` on staging only; production remains `false`
- [ ] Buy dry-run: `/api/trade/tx/buy` returns serialized tx for enriched listing; wallet signs; tx confirms on mainnet-beta (small ask)
- [ ] List + delist work for portfolio-owned pNFT on staging
- [ ] Bid + cancel-bid work when collection BIDS tab has liquidity
- [ ] Write gate: buttons disabled + honest fallback when write flag off
- [ ] Seller metadata on listings (`listState`, seller wallet) required for on-chain buy path
- [ ] Document result of staging fill in runbook (tx signature, listing mint, env snapshot) — [staging-first-fill-record-template.md](./staging-first-fill-record-template.md)

**Dependencies:** Segments 2–3 (enriched listings + UX to trigger txs)

**Estimated effort:** L (2–4 sessions)

**Key files**

- `app/api/trade/tx/buy/route.ts`
- `app/api/trade/tx/list/route.ts`
- `app/api/trade/tx/delist/route.ts`
- `app/api/trade/tx/bid/route.ts`
- `app/api/trade/tx/cancel-bid/route.ts`
- `lib/onchain/clients/tensor-tcm.ts`
- `lib/onchain/tensor-tx-bff.ts`
- `components/trade/buy-now-modal.tsx`
- `components/trade/tensor/use-tensor-buy.ts`
- `docs/trade-staging-checklist.md`

**User actions needed**

- Request `TENSOR_API_KEY` from Tensor
- Set staging env vars (see staging checklist table)
- Fund staging wallet with SOL for fees
- **Broker fee PDA:** confirm SVF treasury registered on Tensor Fees program before first fill
- Run staging verification steps 1–5 manually; record tx signature

**Status today:** partial — BFF + SDK wired; focused tx tests green; no verified mainnet fill; broker PDA ops pending  
**Orchestrator 2026-05-22:** on-chain lane audit partial (5 iterations, ~30 bg workers spawned, not awaited); acceptance checkboxes unchanged.  
**Orchestrator 2026-05-23 (segment inv2–3):** M3 prep docs aligned — [partner-aggregation-quickest-path.md](./partner-aggregation-quickest-path.md), [m3-recovery-status-2026-05-22.md](./m3-recovery-status-2026-05-22.md) § Alignment update; inv3 tick 3 spawns trade-architecture + staging checklist + onchain-stack aggregation cross-refs (seg-bg-25..29).  
**Handoff:** staging checklist + broker PDA remain operator blockers; CSRF deferred to security lane — see [onchain-2026-05-21.md](./orchestrator-runs/onchain-2026-05-21.md).

---

## Segment 5 — Cross-venue depth & vault listings (M4)

**Goal:** After this segment, the same cert can show asks from CC-native, Tensor-indexed ME, and partner sources with best-price routing; vault treasury slabs list on TCM.

**Product story:** Tensor's moat is cross-venue depth — one wallet, best ask, fill routes to origin program. GRAILS adds **SlabVault treasury** as a first-class venue and RWA trait filters on top.

**Acceptance criteria**

- [ ] `TENSOR_API_KEY` enabled: Tensor index listings merge with partner ingest in normalized graph
- [ ] Best-price sort: cheapest ask per listing/mint surfaces first; venue badge on tile
- [ ] Same collection desk shows ME + CC rows when both exist
- [ ] Vault wallet lists at least one treasury slab on TCM via `buildVaultListTx`; appears on `/trade/c/slabvault-treasury`
- [ ] Sweep panel builds multi-fill flow (sequential OK for v1; batch tx documented as follow-up)
- [ ] Item page OFFERS tab wired to Tensor bids when keyed

**Dependencies:** Segment 4 (write path for vault list + buy routing)

**Estimated effort:** M (2–3 sessions)

**Key files**

- `lib/partner-listings.ts` (merge + best-price)
- `lib/trade/tensor-collection-depth.ts`
- `lib/trade/vault-listings.ts`
- `components/trade/venue-badge.tsx`
- `components/trade/tensor/trade-panel.tsx` (sweep)
- `docs/integrations/vault-to-trade-listings.md`

**User actions needed**

- `TENSOR_API_KEY` + `TENSOR_CC_COLLECTION_SLUGS` on staging/prod
- Vault ops: approve which slabs to list; custody wallet access
- Sign-off: treasury slabs sell only via `/trade` (no parallel shop)

**Status today:** partial — `/trade/all` aggregate desk + mergeAllTradeListings dedupe wired; alternateVenueAsks + nav aggregate sync in flight (segment lane 2026-05-22 inv 5); vault list stubs remain
**Orchestrator 2026-05-22 inv 5:** partner aggregation priority — 5 bg workers on all-listings merge, Tensor ME skip, alternateVenueAsks, nav count sync, integration tests (not awaited).

---

## Segment 6 — Cert-unified compare index (M5)

**Goal:** After this segment, searching a PSA cert returns all venue listings side-by-side with one-click buy on the cheapest route.

**Product story:** This is the **Caggy-beating differentiator** — same physical graded card, multiple tokenizations (CC pNFT, Phygitals cNFT, ME listing), one compare view. GRAILS wins on Solana settlement + SlabVault provenance.

**Acceptance criteria**

- [ ] Dedupe key: `(grader, certNumber)` across CC, Phygitals, ME listings
- [ ] `GET /api/trade/resolve?cert=` returns multi-venue rows for a cert
- [ ] Item page compare strip: "CC ◎X · Phygitals ◎Y · ME ◎Z" with buy CTAs
- [ ] ⌘K search resolves cert # and mint addresses (not collections-only)
- [ ] FMV band display (manual comp table or stub until pricing API)
- [ ] Provenance block: vault pull link, `vaultedUrl`, stream clip when available
- [ ] Gate: cert search returns ≥2 venue rows for a known duplicate cert in seed data

**Dependencies:** Segments 2 + 5 (ingest breadth + cross-venue graph)

**Estimated effort:** M (2–3 sessions)

**Key files**

- `lib/trade-listings.ts` (dedupe helpers)
- `lib/trade/resolve-listing.ts`
- `app/api/trade/resolve/route.ts` (new)
- `components/trade/trade-item-detail-client.tsx`
- `components/trade/trade-command-palette.tsx`
- `prisma/schema.prisma` (`CertMintLink` if persisted)

**User actions needed**

- Provide 2–3 known certs listed on multiple venues for QA
- Approve FMV data source (manual table vs external API later)

**Status today:** not started — cert-first route exists; no compare view or multi-venue resolver

---

## Segment 7 — Multichain partners (M6)

**Goal:** After this segment, Beezie (Base) and Courtyard (Polygon) appear in the GRAILS index with chain badges and honest deep-link settlement.

**Product story:** Graded cards live on multiple chains. GRAILS v1 multichain = **cert index + compare + outbound deep link**; full cross-chain settlement is later. Still beats single-chain desks by showing the full market.

**Acceptance criteria**

- [ ] Beezie adapter: `fetchListings()` stub or live API; seed rows on landing + `/trade/c/beezie`
- [ ] Courtyard adapter: same pattern for Polygon
- [ ] Chain filter on landing index (Solana · Base · Polygon)
- [ ] Collection rows grouped by partner + chain
- [ ] UI copy when settlement is `partner_site` vs `on_chain_tensor`
- [ ] Cert dedupe across chain boundaries where same physical card exists on Solana + Base/Polygon
- [ ] Gate: Beezie/Courtyard rows visible with chain badge (preview status OK)

**Dependencies:** Segment 6 (cert dedupe model extends to multichain)

**Estimated effort:** L (3–4 sessions)

**Key files**

- `lib/onchain/collections.ts`
- `lib/partner-ingest-adapter.ts` (Beezie, Courtyard impls)
- `lib/trade-landing.ts`
- `components/trade/venue-badge.tsx`
- `app/trade/c/[slug]/page.tsx`

**User actions needed**

- Beezie / Courtyard API access or permission to scrape
- Decision: Base/Polygon wallet connect experimental scope
- Legal/copy review for outbound deep links

**Status today:** not started — registry preview + copy only

---

## Segment 8 — Portfolio & wallet flows

**Goal:** After this segment, a connected wallet sees owned assets, active listings, open bids, and purchase history in one portfolio desk.

**Product story:** Collectors live in portfolio — listed slabs, bids, offers received. Tensor.trade portfolio parity keeps users on GRAILS instead of partner sites.

**Acceptance criteria**

- [ ] `/trade/portfolio` shows owned NFTs via DAS + wallet (`/api/trade/wallet/nfts`)
- [ ] Active listings with delist action (write flag on)
- [ ] Open bids with cancel action (wallet bids API wired)
- [ ] RECEIVED OFFERS · ACTIVITY · ORDERS & BIDS tabs populated or honestly stubbed
- [ ] Legacy vault shop purchases visible (archived route redirect)
- [ ] Empty states for disconnected wallet

**Dependencies:** Segment 4 (write path); Segment 2 (DAS/Helius reads)

**Estimated effort:** M (1–2 sessions)

**Key files**

- `app/trade/portfolio/page.tsx`
- `components/trade-portfolio-client.tsx`
- `lib/trade/portfolio.ts`
- `app/api/trade/wallet/nfts/route.ts`
- `app/api/trade/wallet/bids/route.ts`

**User actions needed**

- Connect wallet on staging; provide tensor.trade portfolio screenshots for layout reference
- Test with wallet holding CC pNFT or cNFT

**Status today:** partial — LIST/DELIST wired; several tabs still `soon: true`

---

## Segment 9 — Production hardening

**Goal:** After this segment, GRAILS write paths are safe to keep enabled on staging and ready for production promotion review.

**Product story:** A trading desk handling real SOL requires CSRF, idempotent orders, monitoring, and rate limits — same bar as legacy marketplace checkout.

**Acceptance criteria**

- [ ] CSRF + wallet challenge on `/api/trade/tx/*`
- [ ] Postgres orders / reservations / idempotency schema (extend or parallel `Transaction`)
- [ ] Broker fee PDA verified on-chain; documented in ops runbook
- [ ] Sentry or Vercel monitoring on failed tx routes
- [ ] Upstash (or equivalent) rate limit on write APIs
- [ ] `qa:ci` gate on every PR (lint + test + build)
- [ ] E2E smoke: connect → buy dry-run → sign (staging)

**Dependencies:** Segment 4 (writes to harden)

**Estimated effort:** M (2 sessions)

**Key files**

- `app/api/trade/tx/*`
- `prisma/schema.prisma`
- `lib/onchain/fees.ts`
- `.github/workflows/*` (CI)
- `docs/SECURITY_CHECKLIST.md`

**User actions needed**

- Sentry / monitoring project signup
- Upstash Redis credentials
- Ops: broker PDA registration confirmation
- Production promotion review before `TENSOR_TRADE_WRITE_ENABLED=true` on prod

**Status today:** partial — legacy CSRF exists; trade writes unprotected; no orders schema

---

## Segment 10 — Mobile & polish backlog

**Goal:** After this segment, GRAILS desk is usable on phone with Tensor-like mobile patterns.

**Product story:** Collectors browse and buy on mobile. Bottom BUY/SELL bar, filter drawer, and sticky item CTAs match tensor.trade mobile behavior.

**Acceptance criteria**

- [ ] Mobile filter drawer (trait filters accessible without desktop rail)
- [ ] Bottom BUY | SELL bar on collection + item pages
- [ ] Sticky item commerce stack on scroll
- [ ] Touch-friendly grid density
- [ ] Keyboard ⌘K degrades gracefully on mobile (search icon)
- [ ] a11y pass: focus order, aria labels on trade panel

**Dependencies:** Segments 3–4 (desktop desk stable first)

**Estimated effort:** M (2 sessions)

**Key files**

- `components/trade/trade-collection-desk-client.tsx`
- `components/trade/trade-item-detail-client.tsx`
- `components/trade/trade-trait-filters.tsx`
- `docs/redesign/browser-gap-matrix.md`

**User actions needed**

- Mobile device QA on iOS Safari + Android Chrome
- tensor.trade mobile screenshots (see copy checklist)

**Status today:** not started — desktop-first; filter drawer partial

---

## What to stop doing

- Framing GRAILS as deep-link-only or "Phase 1 is the product"
- Parallel subagents editing the same trade files in one session
- Rebuilding desk shells outside `components/trade/tensor/*`
- Starting M5/M6 before M1–M4 foundations ship
- 132-epic orchestration without milestone gates
- Trusting stale `docs/STATUS.md` without Segment 1 refresh

---

## Recommended order for next 5 sessions

**One segment per session. No parallel implementation.**

| Session | Segment | Why this order |
|---------|---------|----------------|
| ~~**1**~~ | ~~Segment 1 — Foundation & docs truth~~ | **Done 2026-05-21** |
| ~~**2**~~ | ~~Segment 2 — Live listing data~~ | **Done 2026-05-21** |
| **3** | **Segment 3 — Trade desk UX shell** | Close tensor.trade parity gaps on real data |
| **4** | **Segment 4 — On-chain Solana writes** | Staging fill is the product unlock; run staging checklist end-to-end |
| **5** | **Segment 5 — Cross-venue depth & vault** | Best-price + treasury listings complete the Solana aggregator story |

Sessions 6–10 follow Segments 6–10 in order (cert compare → multichain → portfolio → hardening → mobile).

---

## After orchestrator runs

Before resuming any lane loop:

1. **STOP** the all-lanes meta `/loop` until a verify pass is **GREEN**.
2. Run **`scripts/orchestrator/run-verify-pass.md`** once — test, build, journal dedupe, git scope, conflict risk. No fix-worker spawns unless test/build fail and operator approves.
3. **Resume** meta `/loop` (all 6 lanes parallel) or one dedicated chat per lane with [orchestrator concurrency limits](./orchestrator-concurrency.md) (5 spawns/iteration, 1 iteration, 24 global cap).
4. Re-run verify pass every **6 meta ticks** (~3–4 h) and after large batches before merge.

See also [orchestrator-concurrency.md](./orchestrator-concurrency.md) for the 140+ task incident and safe defaults.

---

## Verification commands

```bash
npm run dev:clean
npm run sync:discover
npm run test
npm run build
```

Manual routes after each segment:

- `/trade` — landing index
- `/trade/c/collector-crypt` — CC desk
- `/trade/c/phygitals` — Phygitals desk
- `/trade/slab/<cert>` — item page
- `/trade/portfolio` — wallet flows (Segment 8+)

---

## Related docs

| Doc | Role |
|-----|------|
| [m-milestone-status.md](./m-milestone-status.md) | Milestone table snapshot |
| [trade-staging-checklist.md](../trade-staging-checklist.md) | Segment 4 ops |
| [tensor-tradesite-copy-checklist.md](./tensor-tradesite-copy-checklist.md) | Segment 3 UX gaps |
| [orchestrator-concurrency.md](./orchestrator-concurrency.md) | Spawn limits after incident |
| [trade-architecture.md](../trade-architecture.md) | Runtime data paths |
| `.cursor/plans/grails_trade_fix_plan_9c536d56.plan.md` | Full vision reference |
