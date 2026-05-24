# Tensor.trade live crawl — 2026-05-21

**Method:** Cursor IDE browser MCP on [tensor.trade](https://www.tensor.trade/) at 1920×1080 desktop, Pro mode (footer toggle checked).  
**Viewport:** 1920×1080 unless noted.  
**Screenshots:** Captured in-browser during crawl (not stored in repo).  
**Related:** [tensor-tradesite-copy-checklist.md](./tensor-tradesite-copy-checklist.md) · [tensor-tradesite-ux-audit.md](./tensor-tradesite-ux-audit.md)

> **Important:** Live tensor.trade product UI ≠ vendor `marketplace-nextjs-template`. Tensor product uses **cyan / mint / pink** accents. GRAILS `/trade` intentionally uses **template purple `#641ae6`** on dark `#111314` — see anti-patterns in [`.cursor/skills/tensor-tradesite-parity/SKILL.md`](../../.cursor/skills/tensor-tradesite-parity/SKILL.md).

---

## URLs crawled

| URL | Status | Notes |
|-----|--------|-------|
| `https://www.tensor.trade/` | Full | TABLE + CARDS views, hero, index |
| `https://www.tensor.trade/trade/solana_monkey_business` | Full | Pro collection desk, grid, filters, item modal |
| `https://www.tensor.trade/item/5fF5PBHauH2JbPnJ6xHxPtRpMJcpbVMxnvwvkiPTj8mp` | Full | SMB #2553 standalone item page |
| `https://www.tensor.trade/portfolio` | Public shell only | Login-gated inventory — see §5 |

---

## Global design tokens (measured)

| Token | Value | Source |
|-------|-------|--------|
| Body background | `#111314` / `rgb(17, 19, 20)` | CDP `getComputedStyle(body)` |
| Body text | `rgba(255, 255, 255, 0.92)` @ 16px | CDP |
| Font stack | `cpmono, Ubuntu, -apple-system, system-ui` | CDP |
| Muted label | `rgb(141, 150, 160)` (#8D96A0) @ 12px | Table `<th>` |
| Nav link accent | `rgb(142, 227, 251)` (#8EE3FB) | COLLECTIONS active, nav buttons |
| CONNECT WALLET | bg `#8EE3FB`, text `#000`, 151×32px, radius 5px, 14px | CDP |
| BUY NOW (item) | bg `rgb(146, 247, 203)` (#92F7CB), 322×32px, radius 5px | CDP |
| PLACE OFFER | bg `rgb(253, 211, 140)` (#FDD38C), text `#2A2F34` | CDP |
| Floor / buy values | `rgb(146, 247, 203)` green | Stats ribbon, table floor column |
| Stats label | `rgb(116, 127, 139)` @ 12px | "BUY NOW", "LISTED/SUPPLY" labels |
| Border token | `rgb(42, 47, 52)` (#2A2F34) | Chakra computed borders |
| H1 hero | 36px white, glitch-filter class | Homepage |
| Table header row | 40px height, `padding: 0 4px` | CDP `<th>` |

**Visual accents (screenshot-confirmed, not all in CDP):**

- **Sell now / negative Δ:** hot pink `#FF0066` range (table + ribbon)
- **REWARDS nav:** pink star + pink label
- **Instant sell tile:** pink price, cyan SELL NOW button
- **Rarity rank badges:** cyan (common), purple, gold tiers on grid tiles

---

## Route patterns (§4)

| Pattern | Example | Behavior |
|---------|---------|----------|
| Homepage | `/` | Collection index; default TABLE view |
| Collection desk | `/trade/{slug}` | Slug = snake_case collId, e.g. `solana_monkey_business` |
| Item page | `/item/{mint}` | Full-page item; mint = base58 pubkey |
| Portfolio | `/portfolio` | Wallet connect or address lookup |
| TRADE nav dropdown | — | **NFTS** (default trade), **INSCRIPTIONS** |
| Document title (collection) | `19.39 - SMB Gen2 \| Tensor` | Floor price prefix in tab title |
| Document title (item) | `SMB #2553 \| SMB Gen2 \| Tensor` | Item name + collection |

**Query params observed:** None on collection URL during crawl (`location.search` empty). Filters/sort appear client-side or via internal state — not reflected in address bar for SMB desk.

**Dual item UX:**

1. **Grid click** on collection desk → **modal dialog** overlay (~570×688px) with same commerce stack; URL stays on `/trade/{slug}`.
2. **Direct navigation** → `/item/{mint}` full-page layout (no collection grid behind).

**GRAILS mapping:**

| Tensor route | GRAILS route | File |
|--------------|--------------|------|
| `/` | `/trade` | `app/trade/page.tsx`, `components/trade/trade-landing-desk-client.tsx` |
| `/trade/{slug}` | `/trade/c/[slug]` | `app/trade/c/[slug]/page.tsx`, `components/trade/tensor/collection-desk-layout.tsx` |
| `/item/{mint}` | `/trade/slab/[certOrMint]` | `app/trade/slab/[certOrMint]/page.tsx` |
| `/portfolio` | `/trade/portfolio` | `app/trade/portfolio/page.tsx` |

---

## §1 Homepage `/`

### 1.1 Global nav (sticky top)

| Attribute | Observation |
|-----------|-------------|
| Height | ~49px |
| Layout | Logo · COLLECTIONS · TRADE ▾ · REWARDS · centered search · CONNECT WALLET |
| COLLECTIONS | Active: cyan text + underline |
| TRADE | Dropdown → NFTS, INSCRIPTIONS |
| REWARDS | Pink star icon + pink label |
| Search | Placeholder `Search collection / wallet`; **⌘K** hint inside field (right) |
| CONNECT WALLET | Cyan pill button, black text |

**Interaction:** TRADE click opens popover with NFTS / INSCRIPTIONS links. ⌘K pressed via automation did not visibly open palette — hint is present; full palette UX needs manual verification.

**GRAILS:** `components/trade/trade-app-header.tsx`

---

### 1.2 Hero — featured collection (Tensorians)

| Element | Data |
|---------|------|
| Collection | Tensorians |
| Tagline | "The face of the Tensor ecosystem" |
| Visual | Large gradient pixel "TENSORIANS" wordmark (red→purple) |
| CTA | **TRADE TENSORIANS** (cyan button) |
| Social | Website · Discord · Twitter icon buttons |
| Stats (right) | **0.70** BUY NOW (green) · **0.60** SELL NOW (pink) |
| Footer stats | 24H VOL: 2 · MCAP: 6,703 · LISTED/SUPPLY: 196/10004 |

**GRAILS:** `components/trade/trade-landing-featured-banner.tsx` (stub/missing parity)

---

### 1.3 Page headline + tagline

- H1: **Solana's Leading NFT Marketplace** (36px, centered)
- Sub: **FASTEST DATA · DEEPEST LIQUIDITY · FUN REWARDS** (clickable button ref in a11y tree)

---

### 1.4 CARDS | TABLE toggle

| Mode | UI |
|------|-----|
| Control | Pill toggle; checkbox input drives state |
| TABLE (default) | Sortable data table |
| CARDS | 4-column card grid (~1920px) |

**TABLE toolbar (region 1.5):**

- Tabs: **TRENDING** · **NEW MINTS**
- Timeframe chips: **1h** · **24h** (active) · **7d**
- Icons: refresh · collapse/expand
- Filter input: `Filter by collection`
- Right actions: **FILTERS** · **FAVORITES** · **INVENTORY**

**TABLE columns (11 cols, ~1416px table width @ 1920):**

| # | Header | Width (px) | Sample row 1 |
|---|--------|------------|--------------|
| 1 | (star) | 68 | Favorite |
| 2 | (rank) | 33 | 1 |
| 3 | collection | 387 | SMB Gen2 + thumb + 4992 supply |
| 4 | floor | 111 | 19.24 (green link) |
| 5 | sell now | 111 | 17.59 (pink link) |
| 6 | 24h volume | 111 | 144 |
| 7 | 24h Δ | 111 | -5.16% (red) |
| 8 | SALES | 111 | 7 |
| 9 | market cap | 133 | 94,638 |
| 10 | total vol | 133 | 2,814,424 |
| 11 | listed | 111 | 6% (316) |

Row height ~56px. ~20 rows visible without scroll.

**CARDS view (toggled):**

Each card (~4 across):

- Collection avatar + name (h4) + verification
- **Spread: X.XX%** (cyan)
- 2×3 metric grid: BUY NOW · SELL NOW · LISTED # · LISTED % · MARKET CAP · 24h VOLUME
- Cards link to collection trade routes

**GRAILS:** `trade-landing-index-toolbar.tsx`, `tensor/collection-desk-layout.tsx` → `TensorCollectionIndexTable`, `trade-landing-index-card.tsx`

---

### 1.5 Footer ticker (sticky bottom)

| Left | Center | Right |
|------|--------|-------|
| Live (green dot) · theme · settings · shortcuts | Lite / **Pro** toggle · crown toggle | 24h Vol: 955 · **$87.39** SOL · TPS: ~3,000 |

Height ~40–56px. Pro toggle checked during crawl.

**GRAILS:** `trade-footer-ticker.tsx`, `trade-footer-ticker-server.tsx`

---

## §2 Collection desk `/trade/solana_monkey_business`

Pro mode, 1920×1080. Title: `19.39 - SMB Gen2 | Tensor`.

### 2.1 Layout grid (desktop Pro)

```
┌──────────────────────────────────────────────────────────────────┐
│ Global nav (~49px)                                                │
├──────────┬────────────┬─────────────────────────────┬─────────────┤
│ Trade    │ Filters    │ Stats ribbon + tabs + grid  │ Activity    │
│ panel    │ accordion  │                             │ (toggle)    │
│ ~200px   │ ~238px     │ flex-1                      │ ~238–280px  │
├──────────┴────────────┴─────────────────────────────┴─────────────┤
│ Footer ticker                                                     │
└──────────────────────────────────────────────────────────────────┘
```

Left combined trade+filter column measured ~297px for tablist parent; filter panel alone ~238px.

---

### 2.2 Left trade panel

| Region | Content |
|--------|---------|
| Mode toggle | **BUY** / **SELL** (large text buttons) |
| Sub-tabs | **SWEEP** · BID · CANCEL (tablist) |
| Heading | NFTS TO BUY |
| Controls | Range slider · spinbutton (0) · ± buttons |
| Radio | **Count** / SOL |
| CTA | **SWEEP 0 NFTS FOR 0.00** (disabled when 0) |
| Link button | Share/link icon (disabled) |

**GRAILS:** `components/trade/tensor/trade-panel.tsx`

---

### 2.3 Filter accordion

| Section | State |
|---------|-------|
| ALL NFTS | Toggle checkbox |
| FAVORITES | Toggle checkbox |
| INSCRIPTION | ALL · IMMUT · MUT radios |
| PRICE | Collapsed accordion |
| RARITY | Collapsed |
| TRAIT COUNT | Collapsed |
| TRAITS | Collapsed; expanded shows trait categories with counts, e.g. Clothes (23), Hat (47) |

**GRAILS:** `components/trade/trade-trait-filters.tsx` — map RARITY/TRAITS → grader/grade/set for slabs

---

### 2.4 Stats ribbon

Horizontal 7-cell ribbon below collection header:

| Cell | Label (12px muted) | Value (16px mono) | Color |
|------|-------------------|-------------------|-------|
| 1 | BUY NOW | 19.39 ◎ | Green |
| 2 | SELL NOW | 17.50 ◎ | Pink |
| 3 | LISTED/SUPPLY | 315/4,992 (6.31%) | White |
| 4 | VOLUME (24H) | 144 | White |
| 5 | VOLUME (ALL) | 2,814,424 | White |
| 6 | SALES (24H) | 7 | White |
| 7 | PRICE Δ (24H) | -4.91% | Red |

Collection header: SMB GEN2 avatar · crown · social links (website, Discord, Twitter, Atlas3) · Checkout · Filters buttons.

**GRAILS:** `components/trade/tensor/stats-grid.tsx`, `lib/trade/tensor-ribbon-metrics.ts`

---

### 2.5 Collection tabs + toolbar

**Tabs:** ITEMS (selected) · BIDS · ORDERS · TRAITS · HODLERS · **COLLECTION BID** button

**Toolbar row:**

- Search: `Search NFTs by Name`
- Traits filter button
- Density: **small** · medium · large icon buttons
- Sort combobox: `price (low to high)` — 9 options (price, inscription, rarity, last sale, recently listed)
- Refresh · Close (cart) · sparkline/activity icons

**Right column toggle:** **Recent Activity** · **Trollbox 😈**

**GRAILS:** `trade-collection-desk-client.tsx`, `trade-desk-toolbar.tsx`, `trade-activity-panel.tsx`

---

### 2.6 Listing grid

**Layout @ 1920:** ~8 columns, square tiles, inline actions.

**First tile — Instant sell:**

- Label: Instant sell
- Best bid: **17.50** ◎ (pink)
- **SELL NOW** (cyan) · **ALL BIDS** link

**Standard tile anatomy:**

- Square NFT image
- Rarity rank badge (e.g. 1511) — color tiered
- Token ID (#2553)
- Price in ◎ (e.g. 19.39)
- Row actions: **BUY** · **BID** · `...` overflow link

Grid BUY button: ~51×27px, transparent bg, white text.

**GRAILS:** `tensor/listing-grid.tsx`, `tensor/nft-card.tsx`, `trade-instant-sell-tile.tsx`

---

### 2.7 Item modal (from grid click)

Opens as `role=dialog` without route change.

| Region | Content |
|--------|---------|
| Header | SMB #2553 · rank 1511 · SMB Gen2 · floor 19.23 · sell 17.59 |
| Window controls | refetch · open new tab · link · prev · next · close |
| Tabs | OVERVIEW · ACTIVITY · OFFERS |
| Media | Select view combobox · hi-res link · sale history chart |
| Commerce | Listed for 19.33 ◎ ($1,689.46) · Royalty 0.00% |
| CTAs | **BUY NOW** (mint) · Pay with Crossmint · **PLACE OFFER** (gold) |
| Offers | Current top offer 17.50 · All offers |
| Inscription | #150878 box (orange border) — PNFT metadata |
| Details | Mint · Owner · Metadata · Token Standard · Royalties |
| Attributes | 7 traits with floor-per-trait prices |
| Footer stats | LISTED/SUPPLY · 24H FLOOR Δ · 24H VOL · 24H SALES |

Modal size: ~570×688px.

**GRAILS:** `trade-item-detail-client.tsx`, `buy-now-modal.tsx`, `place-offer-modal.tsx`

---

## §3 Item page `/item/{mint}`

Full-page variant of modal content. Same SMB #2553 mint.

### 3.1 Header strip

- Star/favorite · **SMB #2553** · rank badge 1511
- Collection link SMB Gen2 · **19.30** floor · **17.59** sell now

### 3.2 Two-column body

| Left (~50%) | Right (~50%) |
|-------------|--------------|
| Image viewer + view selector + hi-res | Commerce stack (same as modal) |
| SALE HISTORY chart + 30D slider | Inscription box |
| | DETAILS + ATTRIBUTES grid |
| | About collection accordion |

### 3.3 Footer collection stats

LISTED/SUPPLY: 318/4,992 (6.3%) · 24H FLOOR Δ: -4.89% · 24H VOL: 144 · 24H SALES: 7 · social icons

**GRAILS:** `app/trade/slab/[certOrMint]/page.tsx`, `trade-item-detail-client.tsx`

---

## §5 Portfolio `/portfolio` (login-gated)

**Observed without wallet:**

| Element | Detail |
|---------|--------|
| H1 | Connect Wallet |
| Primary CTA | CONNECT WALLET (duplicate of nav) |
| Divider | OR |
| H2 | Enter Wallet Address |
| Input | Empty text field |
| Button | **VIEW** (outline, ~secondary) |
| Footer | Same Lite/Pro + ticker |

**Not observable without wallet (needs user screenshots):**

- Connected wallet chip + dropdown menu
- Inventory grid layout + empty states
- Active listings management
- Portfolio tabs (items, listings, offers, activity)
- Sweep panel with wallet connected (slider + live SOL/count)
- Buy/sign confirmation modal post-connect
- Mobile bottom BUY | SELL bar

**GRAILS:** `app/trade/portfolio/page.tsx`, `components/trade/portfolio/*`

---

## Lite vs Pro

| Aspect | Pro (crawl default) | Lite (inferred) |
|--------|----------------------|-----------------|
| Footer toggle | Pro checked | Lite unchecked |
| Collection desk | Full 3-column: trade panel + filters + activity | Less chrome; simpler tabs (per UX audit) |
| Item page | Sale history chart, inscription block | Reduced panels |
| Density | 8-col grid, full stats ribbon | Likely fewer columns/panels |

Lite mode not toggled during this crawl — differences marked inferred from footer control + prior audit.

---

## Template vs product delta (for agents)

| Element | Live tensor.trade | marketplace-nextjs-template (GRAILS vendor) |
|---------|-------------------|-----------------------------------------------|
| Primary CTA color | Cyan `#8EE3FB` / mint `#92F7CB` | Purple `#641ae6` |
| Connect wallet | Cyan pill | Purple (`.tensor-btn-primary`) |
| Homepage | TABLE index + hero + CARDS toggle | No collection index table |
| Collection desk | 3-column pro layout | Single-page grid only |
| Nav | COLLECTIONS · TRADE · REWARDS | Minimal / none |
| Footer ticker | Live · Lite/Pro · SOL · TPS | None |
| Font | cpmono terminal | Template default |

GRAILS adopts **layout + interaction** from product, **button/card CSS** from template.

---

## Screenshot notes index

| Region | Screenshot captured |
|--------|---------------------|
| Homepage TABLE | Yes — full index + hero |
| Homepage CARDS | Yes — 4-col card grid + TRADE dropdown |
| Collection desk loaded | Yes — 8-col grid + instant sell |
| Item modal overlay | Yes — commerce stack on desk |
| Item full page | Yes — two-column OVERVIEW |
| Portfolio logged out | Yes — connect prompt |
| Activity feed rows | Partial — panel toggle seen, feed content not isolated |
| ⌘K command palette | No — shortcut hint only |
| Wallet connected flows | **Needs user** |

---

## Orchestrator crawl pass — 2026-05-22 (UI lane, iteration 4 — partner aggregation)

Browser MCP: tensor.trade `/`, `/trade/solana_monkey_business`; GRAILS `localhost:3000/trade/all`. Global cap **~14/24** before spawn → **5 ui workers** (ui-bg-11..15). Focus: unified CC + Phygitals + treasury depth, not Tensor-only.

| Region | Gap vs GRAILS `/trade/all` | Spawn? |
|--------|---------------------------|--------|
| Aggregate desk grid | Venue badges on tiles (CC/Treasury/Phygitals) + Venues ribbon cell | **No** — shipped |
| Collection nav | "All listings" count 6 vs desk 9 LISTED (preview sum ≠ merged) | **Yes** — ui-bg-11 |
| Filter rail | No VENUE accordion on aggregate desk | **Yes** — ui-bg-12 |
| Activity column | Rows lack venue badge; thumbs landed (ui-bg-6) | **Yes** — ui-bg-13 |
| INFO tab | Tab in strip but no panel content | **Yes** — ui-bg-14 |
| Grid toolbar sort | No Venue sort on aggregate desk | **Yes** — ui-bg-15 |
| Stats ribbon | "Listed" mixed-case; vol/sales/Δ ingest | **Inline LISTED** + defer segment G6 |
| TABLE index | "24h Δ" mixed-case header | **Inline 24H Δ** |

**Inline this tick:** `stats-grid.tsx` LISTED label; `collection-desk-layout.tsx` 24H Δ header.

**Prior inv 3 landed (partial):** ui-bg-6 activity thumbs, ui-bg-7 CARDS thumb, ui-bg-9 mobile BUY NOW; ui-bg-8 Soon tabs blocked by P0 tests (live TRAITS/ORDERS panels).

---

## Orchestrator crawl pass — 2026-05-24 (UI lane, M5 compare + M3 buy prep)

Browser MCP: [tensor.trade/trade/solana_monkey_business](https://www.tensor.trade/trade/solana_monkey_business). Code audit: item COMPARE strip live; nav cert compare Soon honest for M5.

| Region audited | Gap found | Action |
|----------------|-----------|--------|
| Item COMPARE strip | Partner row links lacked growth attrs | **Inline** — `trade-item-detail-client.tsx` |
| Collection ORDERS tab | Soon label on live `CollectionOrdersPanel` | **Inline** — removed `soon: true` |
| Buy flow (item + grid) | Modal bypass when write enabled | **Yes** — ui-bg-24-1, ui-bg-24-4 |
| Grid tiles | No `alternateVenueAsks` chip | **Yes** — ui-bg-24-3 |
| COLLECTION BID tab | Soon on shared bids panel | **Yes** — ui-bg-24-5 |
| Compare deep links | Test coverage gap | **Yes** — ui-bg-24-2 |

**Global cap:** 10/24 after spawn (5 on-chain + 5 ui).

---

## Orchestrator crawl pass — 2026-05-22 (UI lane, iteration 3)

Browser MCP re-crawl: `/`, `/trade/solana_monkey_business`, `/item/{mint}`. Global cap **19/24** before spawn → **5 ui workers** (ui-bg-6..10).

| Region audited | Gap found | Action |
|----------------|-----------|--------|
| Stats ribbon | Mixed-case Buy now/Sell now/24h vol labels | **Inline** — `tensor/stats-grid.tsx` uppercase pass |
| Featured hero | Buy now/Sell now labels | **Inline** — `trade-landing-featured-banner.tsx` |
| Instant sell tile | Sell now / All bids casing | **Inline** — `trade-instant-sell-tile.tsx` → SELL NOW / ALL BIDS |
| Activity column | Empty thumb placeholders in feed rows | **Yes** — ui-bg-6 |
| Homepage CARDS | Missing collection thumb in tile header | **Yes** — ui-bg-7 |
| Collection tabs | ORDERS/TRAITS/HODLERS missing Soon suffix | **Yes** — ui-bg-8 |
| Item mobile bar | Mixed-case Buy now / Listed for | **Yes** — ui-bg-9 |
| TABLE index headers | Mixed-case Sell now / 24h vol | **Yes** — ui-bg-10 |
| Stats ribbon data | Vol(all)/sales/Δ unkeyed | **Deferred** — segment G6 |
| Item footer stats | 4-cell Tensor layout | **Deferred** — segment G4 |
| Portfolio | Wallet inventory UI | **Screenshot gate** G41 |

**Prior inv 1–2 landed:** ui-bg-1..5 (hero, index rank/thumb, CARDS spread, desk socials, sweep slider); inv 2 inline CARDS tint + Recent Activity header.

---

## Orchestrator crawl pass — 2026-05-22 (UI lane, iteration 2, cap reached)

Browser MCP re-crawl: `/`, `/trade/solana_monkey_business`, `/item/{mint}`. **Global cap 24/24** — segment bg-1..9, ui ui-bg-1..5, onchain oc-bg-1..5, security bg-1..5 all `spawned (not awaited)`; **no new fix workers**.

| Region audited | Gap found | Action |
|----------------|-----------|--------|
| Homepage `/` CARDS | BUY NOW/SELL NOW label tint on stat cells | **Inline** — `trade-landing-desk-client.tsx` (green/pink dt labels) |
| Homepage `/` featured ribbon | 24H VOL / MCAP / LISTED/SUPPLY casing | **Inline** — `trade-landing-featured-banner.tsx` |
| Collection desk activity | Header "Activity" vs Tensor "Recent Activity" | **Inline** — `trade-activity-feed.tsx` |
| Homepage featured hero | ui-bg-1 worker scope | **Landed** — `trade-landing-featured-banner.tsx` dual-stat hero |
| TABLE index rank/thumb | ui-bg-2 scope | **Landed** — `collection-desk-layout.tsx` |
| Desk header socials | ui-bg-4 scope | **Landed** — `trade-desk-header.tsx` + `app/trade/c/[slug]/page.tsx` |
| SWEEP panel | ui-bg-5 scope | **Landed** — `trade-panel.tsx` + `.trade-sweep-slider` in globals.css |
| Stats ribbon data | Vol(all)/sales/Δ unkeyed | **Deferred** — segment G6 + backend bg-5 complete |
| Item footer stats wire | 4-cell Tensor layout | **Deferred** — segment G4 |
| Portfolio inventory | Wallet UI | **Screenshot gate** G41 |

---

## Orchestrator crawl pass — 2026-05-22 (UI lane, iteration 1, cap 5)

Browser MCP re-crawl: `/`, `/trade/solana_monkey_business`, `/item/{mint}`. Global cap 14/24 after spawn (9 segment + 5 ui).

| Region audited | Gap found | Fix worker spawned? |
|----------------|-----------|---------------------|
| Homepage `/` | Featured hero thin ribbon vs Tensorians dual-stat hero + MCAP/LISTED/SUPPLY | **Yes** — ui-bg-1 |
| Homepage `/` TABLE | Index rows lack rank # + collection thumb | **Yes** — ui-bg-2 |
| Homepage `/` CARDS | Missing Spread % line; BUY NOW/SELL NOW label tint | **Yes** — ui-bg-3 |
| Homepage `/` toolbar | NEW MINTS label casing | **Inline** — `trade-landing-index-toolbar.tsx` |
| Collection desk header | No website/discord/twitter icon row | **Yes** — ui-bg-4 |
| Collection desk SWEEP | NFTS TO BUY heading + slider track fill density | **Yes** — ui-bg-5 |
| Item page footer | LISTED/SUPPLY · 24H FLOOR Δ · VOL · SALES | **Deferred** — segment G4 |
| Stats ribbon data | Vol(all) / sales / Δ when unkeyed | **Deferred** — segment G6 |
| Portfolio | Wallet inventory UI | **Screenshot gate** G41 |

**Prior 2026-05-22 pass rows** (earlier meta batch): ORDERS tab, sort rarity, INFO tab, activity href, OFFERS shell, footer TPS — see segment lane journal.

---

## Orchestrator crawl pass — 2026-05-21 (spawn-on-gap, limit 10)

Browser MCP re-crawl at desktop; gaps spawned as background fix workers immediately (max **10** parallel per run).

| Region audited | Gap found | Fix worker spawned? |
|----------------|-----------|---------------------|
| Homepage `/` — CARDS view | Card grid is 4 columns @ xl; SVF used `xl:grid-cols-3` | **No** — inline fix (prior pass) |
| Homepage `/` — TABLE index | 24h volume column sortable; SVF only sorts Floor + Listed | **Yes** (prior pass) — *Landing volume column sort* |
| Homepage `/` — toolbar | Tensor: TRENDING · **NEW MINTS** · **1h**/24h/7d; GRAILS missing NEW MINTS + 1h | **Yes** — *Landing NEW MINTS + 1h chips* → `trade-landing-index-toolbar.tsx`, `tests/trade-landing.test.ts` |
| Homepage `/` — TABLE toolbar | Tensor: Filter by collection + FILTERS/FAVORITES/INVENTORY; GRAILS missing | **Yes** — *Landing index filter bar* → `trade-landing-desk-client.tsx`, `tests/trade-landing.test.ts` |
| Homepage `/` — TABLE index | Sell now column sortable on Tensor; GRAILS static header | **Yes** — *Landing sell now column sort* → `collection-desk-layout.tsx`, `tests/trade-landing.test.ts` |
| Collection desk — Recent Activity | Activity rows navigate to item on click | **Yes** (prior pass) — *Activity row item navigation* |
| Collection desk — BUY/SELL panel | SELL mode sub-tabs LIST/SELL/DELIST | **Yes** (prior pass) — *SELL mode panel sub-tabs* |
| Collection desk — BIDS tab | Tensor columns: TRAITS · MARKETPLACE · ACTIONS + Hide trait bids; GRAILS 4 cols only | **Yes** — *BIDS tab column parity* → `collection-bids-panel.tsx`, `lib/trade/collection-bids.ts`, `tests/trade-desk-p0.test.ts` |
| Collection desk — BIDS tab | Hide trait bids checkbox filters trait-specific bids | **Yes** — *BIDS hide trait bids toggle* → `collection-bids-panel.tsx`, `tests/trade-desk-p0.test.ts` |
| Collection desk — ORDERS tab | Connect shell + bid-pool table (not coming soon) | **Yes** (prior pass) — *ORDERS tab connect shell* |
| Collection desk — TRAITS tab | Tensor trait distribution table; GRAILS `soon: true` stub | **Yes** — *TRAITS tab distribution panel* → `collection-traits-panel.tsx`, `tests/trade-desk-p0.test.ts` |
| Collection desk — HODLERS tab | Tensor holder index; GRAILS `soon: true` stub | **Yes** — *HODLERS tab connect shell* → `trade-collection-desk-client.tsx`, `tests/trade-desk-p0.test.ts` |
| Item page `/item/{mint}` | Footer stats: LISTED/SUPPLY · 24H FLOOR Δ · 24H VOL · 24H SALES; GRAILS floor+listed only | **Yes** — *Item footer collection stats* → `trade-item-detail-client.tsx`, `tests/trade-item-navigation.test.ts` |
| Item page `/item/{mint}` | OVERVIEW · ACTIVITY · OFFERS tabs; commerce stack | No gap — SVF shell covers |
| Collection desk — ORDERS tab (logged out) | Live bid-pool rows on Tensor | Documented; no ingest worker (M5/M6 excluded) |

**Orchestrator inline fixes:** landing CARDS 4-column grid (prior pass).

**Regions still uncrawled this pass:** `/portfolio` (wallet-connected inventory), ⌘K command palette open state, Lite vs Pro toggle diff, mobile bottom BUY/SELL bar, wallet-connected sweep/sign modals, Trollbox panel content, item modal overlay (grid click vs full page).

---

## Orchestrator crawl pass — 2026-05-23 (UI lane, iteration 1)

Browser MCP re-crawl: `/`, `/trade/solana_monkey_business`, `/item/{mint}`. GRAILS `localhost:3000/trade/all` **blocked** (node:fs client build error).

| Region audited | Gap found | Action |
|----------------|-----------|--------|
| Collection desk grid | Tensor BUY always actionable; GRAILS disables Buy without seller meta | **Yes** — ui-bg-1 (`nft-card.tsx` partner ↗ CTA) |
| Item commerce stack | No partner deep link primary when off-chain | **Yes** — ui-bg-2 (`trade-item-detail-client.tsx`) |
| Buy modal | Partner link secondary to disabled Confirm buy | **Yes** — ui-bg-3 (`buy-now-modal.tsx`) |
| Landing market pulse | `deskListings` unused; preview sum vs deduped merge | **Yes** — ui-bg-4 (`trade-landing-desk-client.tsx`, `app/trade/page.tsx`) |
| Trade panel SWEEP | Throws on partner-only aggregate rows | **Yes** — ui-bg-5 (`trade-panel.tsx`) |
| Aggregate desk banner | Copy did not mention partner checkout path | **Inline** — `trade-collection-desk-client.tsx` |
| Local `/trade/all` verify | Webpack node:fs error | **Blocked** — backend build graph |
| Stats ribbon data | Vol(all)/sales/Δ unkeyed | **Deferred** — backend/ingest |
| Portfolio inventory | Wallet UI | **Screenshot gate** G41 |

**Spawned:** ui-bg-1..ui-bg-5 (5/5, not awaited).

---

## Orchestrator crawl pass — 2026-05-23 (UI lane, iteration 2, cap reached)

Browser MCP re-crawl: `/`, `/trade/solana_monkey_business`. GRAILS `localhost:3002/trade/all` **PASS** — 9 merged listings, all tiles **Buy ↗**, aggregate banner + stats ribbon + activity PREVIEW.

| Region audited | Gap found | Action |
|----------------|-----------|--------|
| Aggregate desk `/trade/all` | Prior blocked by node:fs; now loads real merged data | **Closed** — browser verify pass |
| Collection desk grid | Partner ↗ on every partner/treasury row | **Closed** — ui-bg-1 landed (verified) |
| Item commerce stack | Partner primary CTA | **Closed** — ui-bg-2 landed (code) |
| Buy modal | Partner-primary gated on `vaultedUrl` only | **Inline** — `buy-now-modal.tsx` |
| Stats ribbon 24H SALES | Shows `—` | **Deferred** — ingest/backend |
| Portfolio inventory | Wallet UI | **Screenshot gate** G41 |
| ORDERS/TRAITS/HODLERS | Soon stubs | **Deferred** — UI lane next tick |

**Spawned:** 0 — **cap reached (25/24 in-flight across lanes)**.

---

## Orchestrator crawl pass — 2026-05-23 (UI lane, iteration 3, meta tick 4)

Browser MCP re-crawl: `/`, `/trade/solana_monkey_business`. GRAILS `localhost:3002/trade/all` **PASS** — 9 merged listings, all tiles **Buy ↗**, activity PREVIEW with venue badges (no partner ↗ on rows).

| Region audited | Gap found | Action |
|----------------|-----------|--------|
| Aggregate desk `/trade/all` | Loads merged data; grid Buy ↗ complete | **Closed** |
| Activity column | Rows link to item only; no partner ↗ | **Yes** — ui-bg-6 |
| Place offer modal | Dead-end without on-chain mint | **Yes** — ui-bg-7 |
| Grid multi-venue cert | `alternateVenueAsks` not surfaced on tile | **Yes** — ui-bg-8 |
| Landing market pulse | Stats ribbon not linked to `/trade/all` | **Yes** — ui-bg-9 |
| Grid Bid button | Misleading for partner-only rows | **Yes** — ui-bg-10 |
| Stats ribbon 24H SALES | Shows `—` | **Deferred** — ingest/backend |
| Portfolio inventory | Wallet UI | **Screenshot gate** G41 |

**Spawned:** ui-bg-6..ui-bg-10 (5/5, not awaited).

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-23 | UI lane iteration 3 (meta tick 4) — activity/offer/alternate-venue/landing/bid workers (ui-bg-6..10) |
| 2026-05-23 | UI lane iteration 1 — P3/P4 aggregation + deep link workers (ui-bg-1..5) |
| 2026-05-21 | Orchestrator spawn-on-gap pass (limit 10) — 8 new fix workers + prior pass workers |
| 2026-05-21 | Orchestrator spawn-on-gap pass — 5 fix workers + 1 inline CSS fix |
| 2026-05-21 | Initial exhaustive crawl via browser MCP |
