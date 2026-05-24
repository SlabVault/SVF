# Segment 3 exit audit — Trade desk UX shell (M2)

**Audited:** 2026-05-23  
**Scope:** [grails-step-by-step-plan.md](./grails-step-by-step-plan.md) Segment 3 acceptance criteria only  
**Method:** Read-only codebase inspection (key files listed in plan); no browser crawl; no plan checkbox edits  
**Plan status at audit:** Segment 3 marked **partial** (~60%); all 9 acceptance checkboxes still unchecked

**Post-worker refresh (2026-05-23):** Partner grid CTA (`tradeListingShowsPartnerBuyLink` · Buy ↗ on `nft-card`), item COMPARE tab + `ItemVenueCompareStrip` (`alternateVenueAsks`), OFFERS tab `soon: true` label verified in tree.

---

## Summary counts

| Verdict | Count |
|---------|------:|
| **Pass** | 5 |
| **Partial** | 3 |
| **Fail** | 1 |
| **Total criteria** | 9 |

**Segment exit recommendation:** **Not ready** — item-page and grid commerce polish landed (partner ↗ CTA, COMPARE strip, OFFERS Soon), but stats/data depth, copy-checklist P0 closure, and side-by-side browser review remain open.

---

## Acceptance criteria

### 1. Pro layout: left BUY/SELL/SWEEP panel · trait filter rail · priced grid · activity column

| Verdict | **Pass** |
|---------|----------|

**Evidence**

- `TensorCollectionDeskLayout` (`components/trade/tensor/collection-desk-layout.tsx`) implements the Pro shell: collection nav, optional `tradePanel` (~12.5rem), filter `sidebar` (~14rem), main content, and `activity` column (~17.5rem at xl).
- `TradeCollectionDeskClient` (`components/trade/trade-collection-desk-client.tsx`) wires all four regions: `TensorTradePanel`, `TradeTraitFilters`, `TradeListingGrid` / `TensorListingGrid`, `TradeActivityPanel`.
- `TensorTradePanel` (`components/trade/tensor/trade-panel.tsx`) exposes BUY/SELL modes with SWEEP · BID · CANCEL (buy) and LIST · SELL · DELIST (sell) tabs.

**Gaps (non-blocking for structural pass)**

- Trade panel hidden below `xl` (`hidden … xl:block`); mobile uses filter drawer + stacked layout.
- Sell mode on ITEMS tab shows inventory empty state, not a populated sell grid.

---

### 2. Stats ribbon: buy now, sell now, listed %, vol, sales, price Δ (from ingest or Tensor statsV2)

| Verdict | **Partial** |
|---------|-------------|

**Evidence**

- `TensorStatsGrid` (`components/trade/tensor/stats-grid.tsx`) renders all seven labels: Buy now, Sell now, Listed, 24h vol, Vol (all), 24h sales, 24h price Δ.
- `CollectionStatsRibbon` delegates to that grid; collection desk passes `tensorRibbon` from `fetchTensorRibbonMetricsForCollection` (`app/trade/c/[slug]/page.tsx`, `lib/trade/tensor-ribbon-metrics.ts`).
- Listed % uses `supplyCount` from Tensor when present; otherwise falls back to listed count only.

**Gaps**

- When `TENSOR_READ` is unconfigured or fetch fails, ribbon cells show **—** for vol/sales/Δ (ingest-only `computeTradeCollectionStats` does not backfill those fields).
- Sell now falls back to floor from ingest stats, not a distinct sell-now quote.

---

### 3. Collection tabs: ITEMS · BIDS · ORDERS · TRAITS · HODLERS (stubs OK if labeled "Soon")

| Verdict | **Partial** |
|---------|-------------|

**Evidence**

- Tab strip in `trade-collection-desk-client.tsx`: ITEMS, ACTIVITY, BIDS, ORDERS, TRAITS, HODLERS, COLLECTION BID.
- **BIDS** → `CollectionBidsPanel` (live API: `/api/trade/collection-bids`).
- **ORDERS** → `CollectionOrdersPanel` (table shell + wallet gate, not Tensor orders feed).
- **TRAITS** → `CollectionTraitsPanel` (aggregates grader/grade/set from listings).
- **HODLERS** → `CollectionHoldersPanel`.
- `CollectionTabSoon` helper exists but is **unused**; no tab sets `soon: true` on `COLLECTION_TABS`.

**Gaps**

- Extra tabs vs tensor.trade: **ACTIVITY** (duplicate of right column), **COLLECTION BID**.
- Plan allows "Soon" stubs; implementation uses partial real panels instead of consistent Soon labeling.
- Inventory sell path still empty-state only.

---

### 4. Slab trait filters with URL sync (grader, grade, price range, search query)

| Verdict | **Pass** |
|---------|-------------|

**Evidence**

- `useTradeDeskFilters` (`components/trade/use-trade-desk-filters.ts`) syncs state via `history.replaceState` on the collection URL.
- `parseTradeFiltersFromSearchParams` / `buildTradeFilterSearchParams` (`lib/trade/trade-filter-url.ts`): `grader`, `grade`, `min`, `max`, `q` (plus optional `set`).
- `TradeTraitFilters` (`components/trade-trait-filters.tsx`): accordion Price (min/max), Grade checkboxes with counts, Grader checkboxes, Set/traits search with set list.
- Toolbar search in `TradeDeskToolbar` writes `filters.searchQuery`, which maps to `q`.

**Gaps**

- Search is duplicated (filter rail has no dedicated q field; toolbar owns q). Acceptable for criterion.

---

### 5. Grid toolbar: sort, refresh; density toggle (s/m/l)

| Verdict | **Pass** |
|---------|-------------|

**Evidence**

- `TradeDeskToolbar` (`components/trade/trade-desk-toolbar.tsx`): sort select (price asc/desc, recent), Refresh button, s/m/l density group, inline search.
- `TradeCollectionDeskClient` passes `gridDensity` into `TradeListingGrid` → `TensorListingGrid` with `TRADE_GRID_DENSITY_CLASS` (`lib/layout.ts`).

**Note**

- [tensor-tradesite-copy-checklist.md](./tensor-tradesite-copy-checklist.md) item #16 still says "no density/search in toolbar"; that row is **stale** relative to the codebase.

---

### 6. Venue badge on every listing tile

| Verdict | **Pass** |
|---------|-------------|

**Evidence**

- `TensorNftCard` (`components/trade/tensor/nft-card.tsx`) renders `<VenueBadge partner={venuePartner} />` on every card (bottom overlay).
- `resolveListingVenuePartner` maps listing + collection slug to partner id.
- Grid path: `TensorListingGrid` → `TensorNftCardFromListing` for all listings.
- When on-chain buy is unavailable, `tradeListingShowsPartnerBuyLink` gates a partner deep-link **Buy ↗** CTA on the tile (`cta_trade_partner_deep_link`); covered by `tests/trade-desk-p0.test.ts` P4 grid-tile test.

**Gaps**

- None for grid tiles; non-grid listing UIs (portfolio stubs) out of scope for this criterion.

---

### 7. Item page: commerce stack, OVERVIEW · ACTIVITY tabs; OFFERS stub labeled

| Verdict | **Pass** |
|---------|----------|

**Evidence**

- Route: `app/trade/slab/[certOrMint]/page.tsx` → `TradeItemDetailClient`; slab page loads aggregate merge and passes `venueCompareRows` from `buildVenueCompareRows` (`lib/trade/venue-compare.ts`, `alternateVenueAsks`).
- Commerce: listed ◎, USD estimate, on-chain BUY NOW / partner **Open on partner ↗** / PLACE OFFER (desktop stack + `TradeMobileActionBar`); `tradeListingShowsPartnerBuyLink` used for partner checkout routing.
- Tabs: OVERVIEW (traits dl), COMPARE (`ItemVenueCompareStrip` when ≥2 venue rows; `ItemCompareEmpty` otherwise), ACTIVITY (`TradeActivityFeed`), OFFERS (`soon: true` label + selectable tab → `ItemOffersPanel` wallet-gated shell).
- Compact compare strip also renders above tabs when multi-venue asks exist.
- `adjacentItems` wired via `getTradeItemAdjacentLinks` — Prev/Next navigation **implemented** (checklist #25 **done**).
- `ItemFooterStats` ribbon on item page.

**Gaps (non-blocking for structural pass)**

- Side-by-side browser review vs tensor.trade item page not performed in this audit.
- Royalty breakdown lives in modals, not inline commerce stack (checklist #23 partial).
- OFFERS read path not keyed; tab is an honest Soon-labeled stub only.

---

### 8. Footer ticker: Live · listed · floor · SOL/USD (24h vol when keyed)

| Verdict | **Partial** |
|---------|-------------|

**Evidence**

- `TradeFooterTicker` (`components/trade/trade-footer-ticker.tsx`): Live indicator, Lite/Pro toggle, GRAILS label, Listed count, Floor (pro), SOL/USD via `formatSolUsdTicker`, 24h vol (pro).
- `TradeFooterTickerServer` fetches CoinGecko SOL/USD and aggregate 24h vol when not passed (`trade-footer-ticker-server.tsx`).

**Gaps**

- **TPS** hard-coded to "—" (checklist / tensor product gap).
- 24h vol shows "—" when no keyed volume prop and landing aggregate unavailable.

---

### 9. Copy checklist P0 gaps closed — see [tensor-tradesite-copy-checklist.md](./tensor-tradesite-copy-checklist.md)

| Verdict | **Fail** |
|---------|----------|

**P0 definition used**

- Plan points at the copy checklist; cross-walk in [grails-tensor-gap-backlog.md](./grails-tensor-gap-backlog.md) maps checklist regions **#1–10** (global shell + homepage index) to P0/P1.
- Additional P0 backlog rows (landing table, Meegos desk parity, seller metadata, ORDERS read model) remain open per backlog § P0.

**Checklist regions #1–10 (status from checklist + code verification)**

| # | Region | Checklist status | Code notes |
|---|--------|------------------|------------|
| 1 | Global top bar | partial | `trade-app-header.tsx` — COLLECTIONS/TRADE, search slot, wallet |
| 2 | Desk header | partial | `trade-desk-header.tsx` — collection context + VenueBadge |
| 3 | Hide marketing chrome on `/trade/*` | **done** | `app/trade/layout.tsx` |
| 4 | Footer ticker | partial | Lite/Pro + vol present; TPS stub |
| 5 | ⌘K global search | **partial** | `trade-command-palette.tsx` — collections + cert prefix; full mint resolve still open |
| 6 | Featured hero | **missing** | No landing hero component |
| 7 | CARDS \| TABLE toggle | **done** | `trade-landing-desk-client.tsx` |
| 8 | Index table metrics | partial | `TensorCollectionIndexTable` — Tensor metrics when API keyed |
| 9 | Landing toolbar chips | partial | Trending/24h/7d; no NEW MINTS / 1h |
| 10 | Landing aggregate ribbon | partial | Template boxes; limited ingest metrics |

**Item-page regions (#21–25) cross-walk**

| # | Region | Checklist status | Code notes |
|---|--------|------------------|------------|
| 21 | Slab route | **done** | cert-first `/trade/slab/[certOrMint]` |
| 22 | OVERVIEW · ACTIVITY · OFFERS tabs | **partial** | OFFERS tab selectable with **Soon** label + `ItemOffersPanel` shell; COMPARE tab + strip exceed M2 criterion |
| 23 | Commerce column | **partial** | listed ◎ + USD + BUY/offer; partner ↗ on item + grid; royalty in modal |
| 24 | Collection footer stats | **partial** | `ItemFooterStats` ribbon |
| 25 | Prev/next in collection | **done** | `adjacentItems` wired |

**Top 10 remaining gaps** (checklist § Top 10): items **1, 5–10** still open or partial; **2–4** marked done in checklist but backlog P0-1/P0-2/P0-5 still track landing/desk/orders depth.

**P0 closure count:** 2 / 10 checklist regions **done** (#3, #7); item-page #21/#25 also **done** but outside the #1–10 P0 scope; 0 evidence that all P0 backlog items are closed.

---

## Key files verified (plan table)

| File | Present | Role |
|------|---------|------|
| `components/trade/tensor/*` | Yes | Layout, panel, grid, stats, nft-card |
| `components/trade/trade-collection-desk-client.tsx` | Yes | Desk orchestration |
| `components/trade-trait-filters.tsx` | Yes | Filter rail (note: not under `components/trade/`) |
| `components/trade/collection-stats-ribbon.tsx` | Yes | Ribbon wrapper |
| `components/trade/trade-desk-toolbar.tsx` | Yes | Grid toolbar |
| `components/trade/trade-item-detail-client.tsx` | Yes | Item commerce + tabs + compare strip |
| `components/trade/item-offers-panel.tsx` | Yes | OFFERS Soon stub panel |
| `lib/trade/venue-compare.ts` | Yes | `buildVenueCompareRows` from `alternateVenueAsks` |
| `components/trade/trade-footer-ticker.tsx` | Yes | Footer ticker |
| `components/trade/trade-command-palette.tsx` | Yes | ⌘K (collections + cert prefix) |

---

## Tests

Primary segment test: `tests/trade-desk-p0.test.ts` (P0 desk shell, venue badge, partner ↗ grid CTA, M2 layout/toolbar). Item compare/OFFERS assertions live in `tests/trade-item-navigation.test.ts` and `tests/trade-venue-compare.test.ts`. **Refresh run (2026-05-23):** failed to load — empty `data/site.json` breaks `lib/partner-listings.ts` import chain (`SyntaxError: Unexpected end of JSON input`); not caused by audit doc changes.

---

## Dependencies (Segment 2)

Segment 2 (real data) is marked complete in the plan. Collection desk renders partner/treasury listings and optional Tensor ribbon when API is configured; empty states reference `sync:discover`. Data sufficiency does not block structural UX pass but explains ribbon **—** cells without Tensor key.

---

## User actions still required (from plan)

- Logged-in tensor.trade portfolio screenshots (checklist **screenshot** rows).
- Side-by-side browser review: tensor.trade CC vs GRAILS CC (not performed in this audit).

---

## Auditor notes

- Do **not** infer pass from orchestrator spawn logs (`orchestrator-runs/segment-2026-05-21.md`); verify in tree only.
- Several checklist rows lag implementation (toolbar #16, prev/next #25, footer Lite/Pro #4, OFFERS Soon on #22); prefer this audit over stale checklist status when they disagree.
- Post-2026-05-22 workers landed partner ↗ grid CTA, COMPARE/`alternateVenueAsks` strip, and OFFERS Soon label — reflected in criteria 6–7 above.
