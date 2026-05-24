# Browser gap matrix — Tensor.trade vs SlabVault `/trade`

**Status:** Live browser audit + repo cross-check (2026-05-21)  
**Method:** Cursor browser MCP on [tensor.trade](https://www.tensor.trade/) vs `http://localhost:3000/trade` (dev PID 25996)  
**Related:** [tensor-tradesite-ux-audit.md](../integrations/tensor-tradesite-ux-audit.md) · trade components under `components/trade/`

---

## Audit notes

| Site | URLs visited | Result |
|------|--------------|--------|
| **Tensor** | `/`, `/trade/solana_monkey_business`, `/item/5fF5PBHauH2JbPnJ6xHxPtRpMJcpbVMxnvwvkiPTj8mp` | Full render — Pro desk, collection grid, item commerce stack |
| **SlabVault local** | `/trade`, `/trade/c/slabvault-treasury` | **HTTP 500** on server fetch; browser stuck on `Loading trade desk…` then blank/error overlay (`lib/marketplace-slabs.ts` unreachable DB path). Visual gap doc below uses **repo structure + partial browser shell** until 500 is fixed. |

No code changes in this pass — local 500 is env/runtime (DB unreachable → fallback path), not a missing route.

---

## Side-by-side gap matrix

Legend: **Tensor** = observed live UI · **SlabVault** = current implementation (`components/trade/*`, `app/trade/*`) · **Clone requires** = visual/structural bar for a credible Tensor-style desk (SlabVault skin, not cyan terminal clone).

### 1. Layout density

| Dimension | Tensor (live) | SlabVault (today) | Clone requires |
|-----------|---------------|-------------------|----------------|
| **Overall chrome** | Single app shell; ~48px top bar + **fixed bottom ticker** (Live · Lite/Pro · 24h vol · SOL · TPS) | **Double header**: `SiteHeader` (brand, $SVF, Home/Vault/Pulls) + `TradeDeskHeader` below (`sticky top-[3.6rem]`) | Trade mode should **collapse site marketing chrome** or merge into one desk bar; add optional bottom status strip |
| **Homepage** | Table-first; CARDS \| TABLE toggle; ~10 metric columns per row; tight row height | `TradeLandingDeskClient`: **2-col preview cards**, generous padding (`p-3 sm:p-4`), marketing copy | **Collection index table** as default (floor, sell now, 24h vol, listed %); card toggle secondary |
| **Collection page** | **5-pane Pro layout**: sweep panel · filter accordion · stats ribbon · grid · activity/trollbox | `TradeDeskShell`: sidebar nav (13.5rem) · filter rail (14rem, md+) · stats ribbon · grid · activity (17.5rem xl+) | Keep 3-column desk but **tighten vertical rhythm** (Tensor ~32px stat cells vs our `CollectionStatsRibbon` + loose toolbar gaps); grid tiles need **smaller chrome**, inline BUY/BID always visible |
| **Item page** | Full-width commerce column: listed price + USD, royalty line, Crossmint, offer stack, sale chart, details grid, attribute rarity scores | `TradeItemDetailClient`: 2-col card layout, traits only, **no activity/offers tabs**, no collection footer stats | Two-column **commerce-first** layout; tab row (Overview · Activity · Offers); footer collection stats strip |
| **Typography / spacing** | Monospace numerals, 10–12px labels, minimal margins | Vault marketing scale (`text-sm`+, rounded cards, violet glow hovers) | Desk-specific token scale: **mono stats**, uppercase micro-labels, 1px dividers not rounded-xl cards |

**Repo anchors:** `trade-desk-shell.tsx` (max-w 1600, multi-aside), `collection-stats-ribbon.tsx`, `trade-listing-tile.tsx`, `trade-landing-desk-client.tsx`.

---

### 2. Navigation

| Dimension | Tensor (live) | SlabVault (today) | Clone requires |
|-----------|---------------|-------------------|----------------|
| **Primary nav** | COLLECTIONS · TRADE ▾ · REWARDS · centered search · CONNECT WALLET | Site: Home · **Trade** · Vault · Pulls · More · Select Wallet; Desk: Trade · Market \| Portfolio · disabled search | Desk nav: **Collections index** · active collection · Portfolio; **working global search** (collection / cert / wallet) |
| **Collection switching** | Homepage table links → `/trade/{slug}`; in-desk context preserved | `TradeCollectionNav` sidebar (lg) + horizontal strip (mobile) with floor badges | Same pattern — **already structurally correct**; needs denser rows + avatar/thumb per collection |
| **Collection sub-nav** | ITEMS · BIDS · ORDERS · TRAITS · HODLERS · COLLECTION BID | None — only listing grid on collection desk | Tab strip above grid; defer BIDS/ORDERS until on-chain, stub disabled tabs OK visually |
| **Breadcrumbs** | Item: collection link · name · rank badge | Item: `← Back to {collection}` text link only | Collection link + **cert # / rank** in header row |
| **Footer controls** | Lite / Pro toggle, theme, settings, shortcuts | None on trade routes | Pro = current multi-pane; Lite = hide sweep panel + simplify filters |

**Repo anchors:** `trade-desk-header.tsx` (`DESK_TABS`), `trade-collection-nav.tsx`, `site-header.tsx` (stacked above desk).

---

### 3. Collection table (homepage index)

| Dimension | Tensor (live) | SlabVault (today) | Clone requires |
|-----------|---------------|-------------------|----------------|
| **Default view** | Sortable **table** with rank, thumb, floor, sell now, 24h vol, 24h Δ, sales, mcap, total vol, listed % | **Card grid** (`TradeCollectionPreviewCard`) with floor + listed only | New **`TradeCollectionIndexTable`** — sortable columns, star/favorite column, row click → `/trade/c/[slug]` |
| **Toolbar** | TRENDING · NEW MINTS · 1h/24h/7d · filter input · FILTERS · FAVORITES · INVENTORY | Section title “Browse collections” + link to treasury | Timeframe chips + “Filter by collection” inline search; slab sets not “trending mints” but same control pattern |
| **Hero** | Featured collection banner with BUY NOW / SELL NOW headline stats | `CollectionStatsRibbon` aggregate on landing only | Optional **featured set banner** (treasury or partner) with dual price headline |
| **Toggle** | CARDS \| TABLE | None | Add view toggle on landing |

**Repo anchors:** `trade-landing-desk-client.tsx`, `trade-collection-preview-card.tsx` — **no table component exists**.

---

### 4. Filters

| Dimension | Tensor (live) | SlabVault (today) | Clone requires |
|-----------|---------------|-------------------|----------------|
| **Placement** | Persistent **left accordion** (PRICE, RARITY, TRAIT COUNT, TRAITS) + ALL NFTS / FAVORITES toggles + inscription radios | `TradeTraitFilters` in 14rem sidebar (md+); `TradeFilterDrawer` on mobile | Accordion groups with **counts in labels**; URL-synced state |
| **Slab semantics** | PFP traits (background, eyes, …) | Grade chips, min/max SOL, search (`trade-trait-filters.tsx`); grader stubs PSA/BGS/CGC | Replace rarity sections with **Grader · Grade band · Set · Parallel · Language · Cert prefix** |
| **In-grid search** | “Search NFTs by Name” + Traits dropdown in grid toolbar | Search only inside filter sidebar | Duplicate search in **grid toolbar** (Tensor pattern) |
| **Sort / density** | Combobox (price, rarity, last sale, recently listed) + s/m/l grid + refresh | `TradeDeskToolbar`: Price ↑↓ · Recent only — **no density, no refresh** | Sort dropdown parity; grid size icons; refresh control |
| **Advanced** | FILTERS modal, FAVORITES, INVENTORY on homepage | Mobile drawer only | Desktop “Filters” popover for saved views (P2) |

**Repo anchors:** `trade-filter-drawer.tsx`, `trade-trait-filters.tsx`, `trade-desk-toolbar.tsx`, `trade-collection-desk-client.tsx`.

---

### 5. Wallet

| Dimension | Tensor (live) | SlabVault (today) | Clone requires |
|-----------|---------------|-------------------|----------------|
| **CTA placement** | Single **CONNECT WALLET** (cyan, top-right) | **Two wallet entry points**: `SiteHeader` + `TradeDeskHeader` both render `WalletButton` (“Select Wallet”) | One primary connect control in desk header; site header wallet hidden on `/trade/*` |
| **Modal copy** | “Connect a wallet on Solana to continue” + multi-wallet list | Solana wallet-adapter `WalletMultiButton` | Same adapter; Tensor-style modal shell (can wrap existing adapter) |
| **Gating** | Browse open; BUY/BID/SWEEP disabled until connected | Tiles + item page open modals or wallet modal (`trade-listing-tile.tsx`, `trade-item-detail-client.tsx`) | **Already aligned** — ensure grid BUY/BID match item page behavior |
| **Connected state** | Address chip + portfolio/inventory entry | Portfolio route exists (`/trade/portfolio`) but stub | Connected: show truncated pubkey + link to Portfolio / Inventory |
| **Pro panel** | SWEEP / BID / CANCEL tabs with slider when connected | No sweep/bid panel | Left **BUY/SELL mode column** (defer sweep tx — shell can ship first) |

**Repo anchors:** `wallet-button.tsx`, `trade-desk-header.tsx`, `trade-mobile-action-bar.tsx` (mobile BUY/SELL toggle — partial Tensor parity).

---

### 6. Item page

| Dimension | Tensor (live) | SlabVault (today) | Clone requires |
|-----------|---------------|-------------------|----------------|
| **Route** | `/item/{mint}` | `/trade/slab/[certOrMint]?collection=` | OK — cert-first is slab-native |
| **Header** | Name · star · rank · collection link · mini floor/sell stats | Grade badge · partner badge · title · SOL price | Add **cert # hero**, rank/FMV, collection breadcrumb row |
| **Tabs** | OVERVIEW · ACTIVITY · OFFERS | None | Three tabs; activity from `getTradeCollectionActivity` / index |
| **Commerce** | Listed for + USD + royalty % · BUY NOW · Crossmint · PLACE OFFER · top offer · sale history chart | Buy now / Make offer buttons + modals (`buy-now-modal`, `place-offer-modal`) | Price block with **USD + royalty line**; offer summary card; chart P2 |
| **Media** | View selector · hi-res · prev/next in collection | Single `SlabImage` square | Scan flip / hi-res link; prev-next within filtered set |
| **Metadata** | DETAILS (mint, owner, token standard) + ATTRIBUTES grid with rarity scores | Traits dl (grade, mint, FMV) | Expand to grader/set/card + **provenance** (vault pull, vaulted URL) |
| **Footer** | Collection LISTED/SUPPLY · 24H floor Δ · vol · sales | None | Reuse `CollectionStatsRibbon` under fold |
| **Mobile** | Stacked layout | `TradeMobileActionBar` sticky BUY/SELL | **Strong partial match** — keep and align with Tensor bottom mode switch |

**Repo anchors:** `trade-item-detail-client.tsx`, `app/trade/slab/[certOrMint]/page.tsx`, `trade-mobile-action-bar.tsx`.

---

## Collection desk (Tensor Pro) — structural checklist

Observed on `/trade/solana_monkey_business` — this is the **target floorplan** for `/trade/c/[slug]`:

```
┌─────────────────────────────────────────────────────────────────┐
│ Global nav: logo · COLLECTIONS · TRADE · search · CONNECT       │
├──────────┬──────────────┬──────────────────────────┬───────────┤
│ BUY/SELL │  Filters     │  Collection stats ribbon │ Activity  │
│ SWEEP    │  accordion   │  ITEMS|BIDS|… tabs       │ / Trollbox│
│ panel    │              │  toolbar + instant sell  │           │
│          │              │  NFT grid (BUY/BID/tile) │           │
├──────────┴──────────────┴──────────────────────────┴───────────┤
│ Footer: Live · Lite/Pro · 24h vol · SOL · TPS                   │
└─────────────────────────────────────────────────────────────────┘
```

**SlabVault `TradeDeskShell` today:**

```
┌ SiteHeader (marketing) ─────────────────────────────────────────┐
├ TradeDeskHeader (Market|Portfolio · search disabled · wallet) ──┤
├ CollectionNav │ Filter sidebar │ Stats + toolbar + grid │ Feed │
└ (no footer ticker) ─────────────────────────────────────────────┘
```

**Missing vs Tensor (structural, not skin):**

1. BUY/SELL sweep column (left)
2. Collection page tabs (ITEMS / BIDS / …)
3. Instant sell card as first grid cell
4. Grid toolbar (search, density, sort dropdown, refresh)
5. Bottom Live / Lite·Pro / market ticker
6. Homepage collection **table**

---

## Repo component map (May 2026)

| Concern | Component / route | Tensor parity |
|---------|-------------------|---------------|
| Shell | `trade-desk-shell.tsx` | ~60% — columns exist, no sweep pane / footer |
| Landing | `trade-landing-desk-client.tsx` | ~25% — cards not table |
| Collection desk | `trade-collection-desk-client.tsx` | ~55% — grid + filters + activity |
| Partner depth | `trade-partner-collection-desk.tsx` | Loads Tensor API depth client-side |
| Grid tile | `trade-listing-tile.tsx` | ~70% — BUY/BID present; no overflow menu |
| Item | `trade-item-detail-client.tsx` | ~45% — modals yes; tabs/charts/details thin |
| Stats | `collection-stats-ribbon.tsx` | ~50% — missing sales, price Δ, volume(all) |
| Filters | `trade-trait-filters.tsx`, `trade-filter-drawer.tsx` | ~40% — flat form not accordion |
| Modals | `buy-now-modal`, `place-offer-modal`, `list-for-sale-modal` | Shell exists; txs read-only/stub |
| Activity | `trade-activity-feed` (imported) | Stub feed from listings |
| Mobile | `trade-mobile-action-bar.tsx`, filter drawer | ~50% |

---

## Priority build order (visual / structural clone)

| Priority | Deliverable | Why |
|----------|-------------|-----|
| **P0** | Fix `/trade` 500 + render desk in browser | Cannot iterate UX blind |
| **P0** | Homepage **collection table** + CARDS/TABLE toggle | Tensor identity is table-first index |
| **P0** | Single wallet entry + working desk search placeholder → cert search | Nav parity |
| **P1** | Collection tabs row + grid toolbar (sort dropdown, refresh, search) | Collection page “feels like Tensor” |
| **P1** | Filter **accordion** with slab trait groups + counts | Left rail density |
| **P1** | Item page tabs + price/offer stack + collection footer stats | Item commerce hierarchy |
| **P1** | Hide/marketing-collapse `SiteHeader` on trade routes | Density + focus |
| **P2** | BUY/SELL sweep panel (UI shell) | Pro desk signature |
| **P2** | Instant sell first grid tile | Bid depth signal |
| **P2** | Footer ticker (Lite/Pro, vol, SOL, TPS) | Polish / trader cred |
| **P2** | Sale history chart, Crossmint, Trollbox | Defer |

---

## SlabVault-specific (keep, don’t clone Tensor literally)

- **Cert #** over token # in grid, table, item hero (`trade-listing-tile` cert badge — keep)
- **Partner / vault badges** on every row (`PlatformBadge` — Tensor has no equivalent)
- **Vault provenance** block on item page (pull history, treasury link)
- **No REWARDS / Trollbox** unless product wants community features
- **Visual skin**: vault amber/violet, not Tensor cyan — clone **layout and hierarchy**, not colors

---

## Changelog

| Date | Author | Notes |
|------|--------|-------|
| 2026-05-21 | Browser MCP subagent | Initial matrix from live Tensor + SlabVault repo review; local `/trade` 500 documented |
