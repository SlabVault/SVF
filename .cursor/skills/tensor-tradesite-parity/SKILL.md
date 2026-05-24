---
name: tensor-tradesite-parity
description: >-
  Implements GRAILS /trade UI to match tensor.trade product layout and interactions
  (not the vendor template skin). Use when building or auditing /trade pages,
  collection desk, item detail, portfolio, trade tokens, Tensor parity, or
  marketplace-nextjs-template adoption on SlabVaultFi.
---

# Tensor.trade parity — GRAILS `/trade`

## Product context

GRAILS is SlabVaultFi's Tensor-style trading desk for graded slabs. The flywheel is:

**partner listings → collection desk → item commerce → wallet tx**

Tensor's **interaction model** is the target — not its cyan terminal skin. SlabVault keeps vault credibility on marketing routes; `/trade/*` uses the **vendor template token lane** (`#111314`, `#641ae6`).

**Full region-by-region crawl:** [docs/integrations/tensor-tradesite-crawl-2026-05-21.md](../../docs/integrations/tensor-tradesite-crawl-2026-05-21.md)

**Gap checklist:** [docs/integrations/tensor-tradesite-copy-checklist.md](../../docs/integrations/tensor-tradesite-copy-checklist.md)

---

## Design tokens

Use `.trade-layout` in `app/globals.css` — **never** vault amber or grails marketing purple on `/trade/*`.

| Token | GRAILS value | Live tensor.trade (reference only) |
|-------|--------------|--------------------------------------|
| Background | `#111314` | `#111314` |
| Surface / card | `#222`, border `#333` | Similar dark panels |
| Primary button | `#641ae6` (template) | Cyan `#8EE3FB` / mint `#92F7CB` |
| Text | `#FFFFEB` @ 13px shell | `rgba(255,255,255,0.92)` @ 16px |
| Muted label | `rgba(255,255,235,0.55)` | `#8D96A0` @ 12px |
| Buy stat | green accent in ribbon | `#92F7CB` |
| Sell stat | pink accent in ribbon | hot pink |
| Font | inherit / mono for stats | `cpmono` stack |
| Nav height | `h-11` (~44px) target | ~49px measured |

**Typography density:** 10–12px uppercase micro-labels; 13px shell body; mono for ◎ values and ribbon.

---

## Page templates

### Homepage `/trade`

| Region | Tensor behavior | GRAILS file |
|--------|-----------------|-------------|
| Nav | COLLECTIONS · TRADE · search · wallet | `trade-app-header.tsx` |
| Hero | Featured collection BUY/SELL stats | `trade-landing-featured-banner.tsx` |
| CARDS \| TABLE | Toggle; TABLE = 11-col index | `trade-landing-desk-client.tsx`, `trade-landing-index-toolbar.tsx` |
| Toolbar chips | TRENDING · NEW MINTS · 1h/24h/7d | `trade-landing-index-toolbar.tsx` |
| Index table | floor · sell now · 24h vol · Δ · listed % | `tensor/collection-desk-layout.tsx` |
| Footer ticker | Live · vol · SOL · TPS · Lite/Pro | `trade-footer-ticker.tsx` |

### Collection desk `/trade/c/[slug]`

| Region | Width target | GRAILS file |
|--------|--------------|-------------|
| Left trade panel | ~200px (12.5rem) | `tensor/trade-panel.tsx` |
| Filter rail | ~224px (14rem) | `trade-trait-filters.tsx` |
| Stats ribbon | 7 cells, 1px dividers | `tensor/stats-grid.tsx` |
| Tabs | ITEMS · BIDS · ORDERS · TRAITS · HODLERS | `trade-collection-desk-client.tsx` |
| Grid toolbar | search · s/m/l · sort · refresh | `trade-desk-toolbar.tsx` |
| Instant sell tile | First grid cell | `trade-instant-sell-tile.tsx` |
| Listing grid | xl: 5–6 cols, square tiles | `tensor/listing-grid.tsx`, `tensor/nft-card.tsx` |
| Activity column | ~280px (17.5rem) | `trade-activity-panel.tsx` |

**Slab filter mapping:** PRICE · RARITY · TRAITS → grader · grade · set · cert prefix (not PFP traits).

### Item `/trade/slab/[certOrMint]`

| Region | Tensor behavior | GRAILS file |
|--------|-----------------|-------------|
| Commerce stack | Listed ◎ + USD · BUY · PLACE OFFER | `trade-item-detail-client.tsx` |
| Tabs | OVERVIEW · ACTIVITY · OFFERS | `trade-item-detail-client.tsx` |
| Details | Mint · owner · royalties · attributes | same |
| Footer stats | Collection listed % · 24h Δ · vol | same |
| Prev/next | In-collection navigation | `lib/trade/item-navigation.ts` |

Grid click may open modal on Tensor; GRAILS uses dedicated route (acceptable).

### Portfolio `/trade/portfolio`

Public shell: connect wallet OR enter address + VIEW. **Inventory UI requires wallet screenshots** — see checklist.

Files: `app/trade/portfolio/page.tsx`, `components/trade/portfolio/*`

---

## Component catalog

| Component | Purpose |
|-----------|---------|
| `TradeAppHeader` | Global nav, search, wallet |
| `TradeDeskHeader` | Desk context tabs |
| `TradeFooterTicker` | Sticky bottom stats |
| `TensorTradePanel` | BUY/SELL · SWEEP/BID/CANCEL |
| `TradeTraitFilters` | Accordion filters + URL sync |
| `TensorStatsGrid` | Horizontal stats ribbon |
| `TradeDeskToolbar` | Sort · density · search |
| `TensorNftCard` | Tile + inline BUY/BID |
| `TradeInstantSellTile` | Best bid + SELL NOW |
| `TradeActivityPanel` | Live list/sale/bid feed |
| `TradeItemDetailClient` | Item commerce + tabs |
| `BuyNowModal` / `PlaceOfferModal` | Tx modals |
| `TradeCommandPalette` | ⌘K search (stub) |

---

## Interaction patterns

1. **Browse without wallet** — all read paths public; gate BUY/list/offer behind connect.
2. **CARDS \| TABLE** — persist view in localStorage (`svf-grails-trade-landing-view`).
3. **Filter URL sync** — `grader`, `grade`, `min`, `max`, `q` on collection desk.
4. **Sort dropdown** — price default low→high; map slab-relevant sorts only.
5. **Item modal vs page** — Tensor uses both; GRAILS prefers cert-first route.
6. **Lite / Pro** — footer toggle on Tensor; defer Lite until Pro desk complete.
7. **⌘K** — global search palette (Tensor hint in nav); wire `trade-command-palette.tsx`.
8. **Footer ticker** — Live dot · platform vol · CoinGecko SOL · TPS stub ok.

---

## Anti-patterns

Do **NOT** on `/trade/*`:

- Vault amber (`--vault-*`) buttons or backgrounds
- Grails marketing purple gradients or hero styling
- Tensor cyan `#8EE3FB` as primary CTA (that's live product, not GRAILS template lane)
- Copy PFP trait filters verbatim — use grader/grade/set
- Invent fake floor/vol — stub honestly or wire ingest
- Single-column template layout for collection desk (missing trade panel + activity)
- Trollbox / REWARDS nav (intentionally omitted)

**Template ≠ product:** `marketplace-nextjs-template` supplies `#641ae6` buttons and card CSS — not tensor.trade's 3-column desk or homepage table.

---

## Implementation checklist

Copy when starting a `/trade` task:

```
- [ ] Read crawl doc section for target page
- [ ] Confirm `.trade-layout` wrapper (no site marketing chrome)
- [ ] Match region widths (200 / 224 / flex / 280 px)
- [ ] Use template purple CTAs, not tensor cyan
- [ ] Stats ribbon: buy green · sell pink · mono values
- [ ] Grid: square tiles, instant sell first, inline BUY/BID
- [ ] Item: listed ◎ + USD est, OFFERS tab stub ok if labeled
- [ ] Wallet gates on tx only
- [ ] Update tensor-tradesite-copy-checklist.md status
- [ ] No vault-amber / grails-purple on trade routes
```

---

## Needs wallet screenshots

Capture from connected wallet on tensor.trade for next doc pass:

- Portfolio inventory grid + empty state
- Wallet chip + dropdown actions
- Active listings + cancel listing
- Collection BIDS / ORDERS tab content
- Sweep panel with live slider + SOL estimate
- Buy confirmation modal (price breakdown + sign step)
- Mobile bottom BUY | SELL bar

---

## Orchestrator pattern

When crawling [tensor.trade](https://www.tensor.trade/) for parity gaps:

1. **Crawl in browser** — `/`, `/trade/{collection}`, `/item/{mint}`; snapshot + screenshot per page.
2. **Compare to GRAILS files** listed in this skill and the [crawl doc](../../docs/integrations/tensor-tradesite-crawl-2026-05-21.md).
3. **Spawn one background fix task per discrete gap** (max **10 parallel** per orchestrator run) via Task tool (`generalPurpose`, `run_in_background: true`).
4. **Each fix task must be narrow:** one behavior, one primary test file, explicit target files, **no ingest/tx** unless the gap requires it.
5. **Do not spawn** for M5 cert-unified compare or M6 multichain ingest.
6. **Trivial gaps** (single CSS class, one-line copy) — fix inline in the orchestrator; do not spawn.
7. **Document** each region/gap/spawn in `docs/integrations/tensor-tradesite-crawl-2026-05-21.md` orchestrator table.
8. **Keep crawling** after spawning — do not wait for fix workers.

Example fix task titles: *Activity row item navigation*, *SELL mode panel sub-tabs*, *ORDERS tab connect shell*, *Landing volume column sort*.

---

## Additional resources

- [Exhaustive crawl — 2026-05-21](../../docs/integrations/tensor-tradesite-crawl-2026-05-21.md)
- [Copy checklist](../../docs/integrations/tensor-tradesite-copy-checklist.md)
- [UX audit](../../docs/integrations/tensor-tradesite-ux-audit.md)
- [Template adoption](../../docs/integrations/tensor-template-adoption.md)
