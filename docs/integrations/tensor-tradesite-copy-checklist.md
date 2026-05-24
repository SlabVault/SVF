# Tensor.trade copy checklist ? piece by piece

**Status:** Live browser audit + M2 implementation (2026-05-22 code audit)  
**Method:** Cursor browser MCP on [tensor.trade](https://www.tensor.trade/) vs GRAILS `/trade`  
**Estimated parity:** **~67%** (15 **done** · 14 **partial** · 2 **missing** · 2 **screenshot** / 33 rows; weighted `done + ½×partial` ≈ 67%)

**Primary references (2026-05-21 crawl):**

- **Agent skill:** [`.cursor/skills/tensor-tradesite-parity/SKILL.md`](../../.cursor/skills/tensor-tradesite-parity/SKILL.md) ? tokens, templates, checklist, anti-patterns
- **Exhaustive crawl:** [tensor-tradesite-crawl-2026-05-21.md](./tensor-tradesite-crawl-2026-05-21.md) ? numbered regions, measured layout, screenshot notes

**Related:** [tensor-tradesite-ux-audit.md](./tensor-tradesite-ux-audit.md) ? [tensor-template-adoption.md](./tensor-template-adoption.md) ? [browser-gap-matrix.md](../redesign/browser-gap-matrix.md)

**Legend**

| Status | Meaning |
|--------|---------|
| **done** | Matches tensor/template intent in code |
| **partial** | Structure exists; density, data, or interaction incomplete |
| **missing** | Not built |
| **screenshot** | Needs logged-in user screenshots (portfolio / wallet flows) |

**Source tags:** `template` = vendor `marketplace-nextjs-template` ? `product` = live tensor.trade ? `ingest` = partner data layer

---

## Browser audit ? URLs visited

| URL | Regions captured |
|-----|------------------|
| [tensor.trade/](https://www.tensor.trade/) | Global nav (COLLECTIONS ? TRADE ? REWARDS ? ?K search ? CONNECT WALLET), hero banner (BUY NOW / SELL NOW / LISTED/SUPPLY / 24H VOL), CARDS \| TABLE toggle, TRENDING / NEW MINTS / 1h?24h?7d, filter bar, collection index table (~10 columns), footer ticker (Live ? Lite/Pro ? 24h vol ? SOL ? TPS) |
| [tensor.trade/trade/solana_monkey_business](https://www.tensor.trade/trade/solana_monkey_business) | Left BUY/SELL + SWEEP/BID/CANCEL panel (~12.5rem), filter accordion (PRICE ? RARITY ? TRAITS), stats ribbon (7 cells, mono), collection tabs (ITEMS ? BIDS ? ORDERS ? TRAITS ? HODLERS), grid toolbar (search ? s/m/l density ? sort ? refresh), activity/trollbox column (~17.5rem), instant-sell first tile |
| [tensor.trade/item/5fF5PBH?](https://www.tensor.trade/item/5fF5PBHauH2JbPnJ6xHxPtRpMJcpbVMxnvwvkiPTj8mp) | Item commerce stack (listed price + USD, BUY NOW, PLACE OFFER, sale history), OVERVIEW ? ACTIVITY ? OFFERS tabs, collection footer stats |

**Measured layout notes (desktop Pro, approximate)**

| Region | Tensor | GRAILS target |
|--------|--------|---------------|
| Top bar height | ~48px single row | `TradeAppHeader` h-11 + `TradeDeskHeader` py-1.5 |
| Left trade panel | ~200px, BUY/SELL + sweep tabs | `TensorTradePanel` w-[12.5rem] |
| Filter rail | ~224px accordion | `TradeTraitFilters` w-[14rem] |
| Activity column | ~280px | `TradeActivityPanel` xl:w-[17.5rem] |
| Stats ribbon cells | ~32px label, mono values, 1px dividers | `.trade-stats-box` in `.trade-layout` |
| Grid density | 5?6 cols xl, square tiles, inline BUY/BID | `TRADE_GRID_CLASS` xl:grid-cols-5 |
| Primary button | Cyan on product; template `#641ae6` | `.tensor-btn-primary` |
| Typography | 10?12px labels, uppercase micro-headers | trade shell `text-[11px]` / `text-[10px]` |

---

## Checklist by UI region

### Global shell

| # | Tensor.trade behavior | Our file | Source | Status |
|---|----------------------|----------|--------|--------|
| 1 | Single dense top bar: logo ? nav ? search ? wallet | `trade-app-header.tsx` | product | **partial** — COLLECTIONS · TRADE links + ⌘K search trigger + `#641ae6` wallet |
| 2 | Secondary desk context (collection slug / tabs) | `trade-desk-header.tsx` | product | **partial** ? icon + name + verified crown + VenueBadge on collection desk; Collections \| Portfolio tabs |
| 3 | Hide marketing site chrome on `/trade/*` | `app/trade/layout.tsx` | product | **done** ? trade-only layout, no `SiteHeader` |
| 4 | Footer ticker (Live ? Lite/Pro ? vol ? SOL ? TPS) | `trade-footer-ticker.tsx`, `trade-footer-ticker-server.tsx`, `lib/sol-price.ts`, `lib/trade/solana-tps.ts` | product | **done** ? Live ? lite/pro toggle (`trade-footer-view-prefs`) ? GRAILS ? listed ? floor (Pro) ? CoinGecko SOL/USD ? 24h vol (Pro, Tensor aggregate when keyed) ? TPS (Pro, RPC `getRecentPerformanceSamples`) |
| 5 | ⌘K global search | `trade-command-palette.tsx`, `trade-app-header.tsx`, `trade-desk-header.tsx`, `lib/trade/parse-cert-prefix-query.ts` | product | **partial** — Cmd/Ctrl+K opens palette; collections filter + cert # prefix (4+ digits) → slab route; full mint resolver deferred M5 |

### Homepage / collection index

| # | Tensor.trade behavior | Our file | Source | Status |
|---|----------------------|----------|--------|--------|
| 6 | Featured collection hero (dual BUY/SELL headline) | `trade-landing-featured-banner.tsx` | product | **partial** — dual buy/sell stats + 24H VOL/MCAP/LISTED/SUPPLY ribbon shipped; visual banner vs Tensorians art deferred |
| 7 | CARDS \| TABLE toggle | `trade-landing-desk-client.tsx`, `trade-landing-index-toolbar.tsx` | product | **done** ? localStorage `svf-grails-trade-landing-view` |
| 8 | Sortable index table (floor ? sell now ? 24h vol ? ? ? listed %) | `tensor/collection-desk-layout.tsx` ? `TensorCollectionIndexTable` | product | **done** ? Floor · Sell now · Listed · Listed % · 24h vol · 24h Δ · Venue columns; sortable floor · listed · 24h vol; cells `—` when unkeyed; market-cap column when data present; rank/thumb not in row |
| 9 | TRENDING / NEW MINTS / 1h?24h?7d toolbar | `trade-landing-index-toolbar.tsx` | product | **partial** ? Trending + NEW MINTS + 1h/24h/7d chips shipped; 30d extra vs Tensor |
| 10 | Aggregate stats ribbon on landing | `collection-stats-ribbon.tsx` | template | **partial** ? template boxes, not full tensor metrics |

### Collection desk (Pro)

| # | Tensor.trade behavior | Our file | Source | Status |
|---|----------------------|----------|--------|--------|
| 11 | Collection nav sidebar | `trade-collection-nav.tsx` | product | **done** ? dense sidebar rows, thumb placeholder, mono floor ?, VenueBadge |
| 12 | Left BUY/SELL + SWEEP/BID/CANCEL panel | `tensor/trade-panel.tsx` | product | **partial** ? sweep/bid/cancel + LIST/SELL/DELIST sell tabs wired; inventory/index still gated |
| 13 | Filter accordion + counts | `trade-trait-filters.tsx` | product | **partial** ? grader/grade/price/set + URL sync + counts; honest empty when no set metadata |
| 14 | Stats ribbon (buy now ? sell now ? listed% ? vol ? sales ? ?) | `tensor/stats-grid.tsx`, `lib/trade/tensor-ribbon-metrics.ts` | template + product | **partial** ? 7-cell ribbon + buy/sell tint; Vol (all) ? sales ? ? need Tensor statsV2 or ingest |
| 15 | Collection tabs ITEMS ? BIDS ? ORDERS ? ? | `trade-collection-desk-client.tsx` | product | **partial** ? ITEMS · ACTIVITY · BIDS · COLLECTION BID live; ORDERS · TRAITS · HODLERS Soon stubs (`CollectionTabSoon`); INFO tab extra vs Tensor |
| 16 | Grid toolbar (search ? density ? sort ? refresh) | `trade-desk-toolbar.tsx`, `trade-collection-desk-client.tsx` | product | **done** ? in-grid search, s/m/l density, sort dropdown, refresh wired to desk state |
| 17 | Instant sell first grid cell | `trade-instant-sell-tile.tsx`, `trade-instant-sell-modal.tsx`, `tensor/listing-grid.tsx` | product | **done** ? first cell at floor; Sell now / All bids + modal when floor known |
| 18 | Listing grid + inline BUY/BID | `tensor/listing-grid.tsx`, `tensor/nft-card.tsx` | template | **done** ? `#641ae6` buttons, square tiles, rank badge + venue pill styling (M2 UX pass) |
| 19 | Activity feed (live list/sale/bid) | `trade-activity-panel.tsx`, `trade-activity-feed.tsx` | product + ingest | **partial** ? BUY/LIST/BID/CANCEL labels + item links; Preview badge when synthetic; live feed needs Tensor key |
| 20 | Trollbox | ? | product | **missing** (intentionally) |

### Item page

| # | Tensor.trade behavior | Our file | Source | Status |
|---|----------------------|----------|--------|--------|
| 21 | Route `/item/{mint}` | `app/trade/slab/[certOrMint]/page.tsx` | ingest | **done** ? cert-first |
| 22 | OVERVIEW · ACTIVITY · OFFERS tabs | `trade-item-detail-client.tsx`, `item-offers-panel.tsx` | product | **partial** — OVERVIEW + ACTIVITY live; OFFERS tab selectable (not disabled) with `ItemOffersPanel` table shell — wallet gate + honest empty; no Soon label on tab; offers read path not keyed |
| 23 | Commerce column (USD ? royalty ? BUY ? offer stack) | `trade-item-detail-client.tsx`, `buy-now-modal.tsx` | template | **partial** ? listed ? + USD est., BUY/offer CTAs; royalty in modal |
| 24 | Collection footer stats on item | `trade-item-detail-client.tsx` | product | **partial** ? floor + listed count ribbon |
| 25 | Prev/next in collection | `trade-item-detail-client.tsx`, `lib/trade/item-navigation.ts` | product | **done** ? Prev/Next links + position; slab page wires `adjacentItems` |

### Wallet & transactions

| # | Tensor.trade behavior | Our file | Source | Status |
|---|----------------------|----------|--------|--------|
| 26 | CONNECT WALLET top-right | `trade-app-header.tsx` ? `WalletButton` | template | **done** |
| 27 | Browse without wallet; gate CTAs | modals + grid buttons | product | **done** |
| 28 | Buy tx sign + toast | `tensor/use-tensor-buy.ts`, `app/api/trade/tx/buy/route.ts` | template | **partial** ? grid + item page use on-chain path when seller/listState present |
| 29 | Portfolio / inventory | `app/trade/portfolio/*` | product | **screenshot** ? stub listings UI |
| 30 | Connected wallet chip + inventory entry | ? | product | **screenshot** |

### Styling / tokens

| # | Requirement | Our file | Source | Status |
|---|-------------|----------|--------|--------|
| 31 | `.trade-layout` uses `#111314`, `#641ae6`, `#222` cards | `app/globals.css`, `app/trade/layout.tsx` | template | **done** |
| 32 | No vault-amber / grails-purple on `/trade/*` | `components/trade/**`, `trade-trait-filters.tsx`, `trade-activity-feed.tsx`, `app/globals.css` wallet override | template | **done** (M2 pass 2) |
| 33 | GRAILS brand = logo only in header | `trade-app-header.tsx` | adoption doc | **done** |

---

## From vendor template vs tensor.trade product

| Capability | Vendor template | Tensor.trade product | GRAILS uses |
|------------|-----------------|----------------------|-------------|
| NFT card + Buy button CSS | ? `NftCard.tsx`, `#641ae6` | ? inline BUY on tiles | **template** ? `tensor/nft-card.tsx` |
| Stats boxes | ? `.stats-box` | ? denser ribbon | **template** ? `tensor/stats-grid.tsx` |
| Buy/list/delist API | ? `api/buyNFT` etc. | ? same backend shape | **template** ? `app/api/trade/tx/*` |
| 3-column pro desk | ? single page | ? sweep ? filters ? activity | **product** ? `tensor/collection-desk-layout.tsx` |
| Collection index table | ? | ? homepage default | **product** ? `TensorCollectionIndexTable` (done; rank/thumb row chrome open) |
| Portfolio / orders | ? | ? | **screenshot** needed |

---

## Top 10 remaining gaps (priority)

1. **Homepage collection table polish** ? rank/thumb in rows; ingest-backed 24h vol/? when Tensor unkeyed (columns shipped ? checklist #8 **done**)  
2. ~~**CARDS \| TABLE toggle** on landing~~ ? **done** (M2 landing)  
3. ~~**Filter accordion** with trait counts + URL sync (grader ? grade ? set)~~ ? **partial** (M2 pass 3: grader/grade/price/q URL sync; set/traits stub)  
4. ~~**Collection tabs** ? BIDS live; ORDERS ? TRAITS ? HODLERS Soon~~ ? **partial** (M2 segment 3: tab strip live; Soon stubs labeled)  
5. ~~**Grid toolbar** ? in-grid search, s/m/l density icons~~ ? **done** (M2: `trade-desk-toolbar.tsx`)  
6. **Stats ribbon** ? sell now / volume(all) / sales / price ? from ingest or Tensor API  
7. **Item page tabs** + commerce stack + collection footer stats — M2 partial (OFFERS connect shell; prev/next done; royalty inline open)  
8. ~~**Instant sell** first grid cell~~ ? **done** (`trade-instant-sell-tile.tsx`, `trade-instant-sell-modal.tsx`)  
9. ~~**Footer ticker** ? Lite/Pro ? SOL ? TPS ? 24h vol~~ ? **done** (`trade-footer-ticker.tsx`, `lib/trade/solana-tps.ts`)  
10. **Seller metadata on listings** ? required for on-chain buy without modal fallback  
11. **⌘K global search** — collections + cert # prefix shipped; full mint resolver M5 (see #5 **partial**)

---

## Needs user logged-in portfolio screenshots

**Operator gate (G41):** Blocks Segment 8 portfolio layout only ? M2 keeps #29?#30 **screenshot** stub (no `portfolio/*` layout without assets).

**Prerequisites:** Mainnet wallet + =1 listed CC pNFT ? tensor.trade **Pro** ? Phantom ? desktop 1440px + mobile ~390px.

**Save PNGs:** `docs/integrations/screenshots/tensor-portfolio/{name}.png` ? capture connected at `https://www.tensor.trade/portfolio`:

- `inventory-populated` / `inventory-empty` ? grid, sidebar filters, summary row  
- `wallet-chip-menu` ? CONNECT dropdown (INVENTORY ? LOCKS ? OFFERS ? ORDERS ? FAV)  
- `listings-cancel` ? active listing + cancel; `placed-offers` ? `orders-bids` tab bodies  
- Collection desk: `collection-sweep` (SWEEP slider+SOL), `buy-sign-modal`, `mobile-buy-sell-bar`, ORDERS tab rows (TC8)

See [crawl ?5](./tensor-tradesite-crawl-2026-05-21.md#5-portfolio-portfolio-login-gated) for logged-out baseline already captured.

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-21 | Initial checklist from live tensor.trade browser MCP + M2 token/button fixes |
| 2026-05-21 | M2 pass 2: horizontal stats ribbon, filter/activity tensor tokens, `#641ae6` wallet in `.trade-layout`, COLLECTIONS nav |
| 2026-05-21 | M2 pass 3: filter URL sync (`grader` ? `grade` ? `min`/`max` ? `q`), interactive grader checkboxes, TRAITS/HODLERS tabs, dense collection nav |
| 2026-05-21 | Stats ribbon + footer SOL + index table: Tensor statsV2 mapping, CoinGecko SOL/USD, sell now / listed % columns |
| 2026-05-21 | M3 bid path: `/api/trade/tx/bid` + `/api/trade/tx/cancel-bid` BFF, `use-tensor-bid`, PlaceOfferModal submit wired; cancel tab stub empty until user NFT bids read |
| 2026-05-21 | M2 UX pass: collection header row (icon + verified crown), activity BUY/LIST color labels, slider + tab polish, rank/venue card badges, collection tab density |
| 2026-05-21 | Added tensor-tradesite-parity skill + exhaustive crawl doc (browser MCP re-crawl) |
| 2026-05-22 | M2 segment 3: checklist #11/#16/#17 → done; #15 tabs live; activity Preview badge; set filter empty-state |
| 2026-05-22 | M2 segment 4 (UI worker): #5 ⌘K → partial (`trade-command-palette.tsx`, Cmd/Ctrl+K); #16/#17 notes refreshed; fixed corrupt #25 row |
| 2026-05-22 | M2 segment 3 (copy audit): #4 footer → **done** (Lite/Pro toggle, CoinGecko SOL, Tensor 24h vol, RPC TPS); #8 index table → **done** (full metric columns + sort); #15 tab notes refreshed (Soon stubs); parity **~67%** |
| 2026-05-22 | UI lane iter 2: cap reached (24/24); inline CARDS BUY NOW/SELL NOW tint, featured ribbon casing, Recent Activity header; confirmed ui-bg-1..5 landed |
| 2026-05-22 | Segment 3 exit worker: synced #5 (cert prefix in ⌘K), #22 (OFFERS connect shell); confirmed #4 TPS RPC + #16 toolbar **done** vs segment-3-exit-audit stale rows |
