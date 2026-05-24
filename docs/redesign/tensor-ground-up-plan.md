# Trade ground-up rebuild — template port status

**Status:** Template port in progress (May 2026)  
**Supersedes:** Parallel GRAILS shell that duplicated template layout without copying components.

## Goal

Port [marketplace-nextjs-template](https://github.com/tensor-foundation/marketplace-nextjs-template) UI/components/layout into `/trade` while using **partner ingest** (Collector Crypt, Phygitals) as the primary listing read path — no `TENSOR_API_KEY` required for core browse/buy UX.

## What is done

### 1. Vendor reference → runtime copy

- Template cloned to `vendor/marketplace-nextjs-template/` (reference only; tsconfig excludes `vendor/**`)
- Ported components live in `components/trade/tensor/`:
  - `types.ts`, `map-listing.ts` — template NFT/listing shapes mapped from partner rows
  - `ui-layout.tsx` — Suspense shell from template `ui-layout.tsx`
  - `stats-grid.tsx` — stats-box grid from template `page.tsx`
  - `nft-card.tsx` — `NftCard.tsx` adapted (partner deep link + modals, no Tensor REST buy)
  - `listing-grid.tsx` — listing grid from template `page.tsx`
  - `collection-desk-layout.tsx` — 3-column desk (nav | main | activity)
  - `collection-index-table.tsx` — landing collection index (table over cards)
  - `trade-panel.tsx` — buy/sell/sweep stubs

### 2. `/trade` routes

| Route | Role |
|-------|------|
| `/trade` | Collection index table + aggregate stats ribbon |
| `/trade/c/[slug]` | Collection desk — server-rendered partner or treasury listings |
| `/trade/slab/[certOrMint]` | Item detail — buy/offer modals, wallet gate |
| `/trade/portfolio` | Wallet portfolio stub |
| `/trade/item/[mint]` | Legacy redirect → `/trade/slab/` |

Partner collections wired server-side via `listPartnerTradeListings()`:

- `/trade/c/collector-crypt` — CC ingest (JSON seed, optional DB, live scrape)
- `/trade/c/phygitals` — Phygitals ingest (JSON seed, optional DB)

### 3. Listing read path

- **Primary:** `lib/partner-listings.ts` → `listPartnerTradeListings()` / `getPartnerListingsForPlatform()`
- **BFF:** `GET /api/trade/partners/[platform]/listings` and `/stats`
- **Removed from partner page:** client-side depth fetch; partner pages render server-side
- **Optional:** `GET /api/trade/collections/[slug]/depth` remains for Magic Eden / Tensor shortcut only

### 4. Shell consolidation

- `TradeDeskShell` → thin re-export of `TensorCollectionDeskLayout`
- `TradeListingGrid` / `TradeListingTile` / `CollectionStatsRibbon` delegate to tensor components
- Single Connect button in `TradeAppHeader` (removed duplicate from desk header)

### 5. Activity feed

- Partner collections: honest empty state (no synthetic Tensor-style fake events)
- Treasury: optional synthetic preview from listings when Tensor API unavailable

### 6. Kept unchanged

- `lib/onchain/*` — program IDs, PDA helpers, TCM SDK clients
- `components/wallet-provider`, admin routes, `app/vault/*`, home funnel
- SlabVault marketing routes untouched

## In progress / gaps vs tensor.trade

- [ ] Live Tensor tx history when `TENSOR_API_KEY` configured (treasury lane only today)
- [ ] Magic Eden collection still preview-only until partner ingest or Tensor shortcut
- [ ] Cert search in desk header remains disabled placeholder
- [ ] On-chain write (`TENSOR_TRADE_WRITE_ENABLED`) not yet live — modals are UX stubs
- [ ] Infinite scroll / sweep cart from full tensor.trade product (template is minimal)
- [ ] NES/Press Start 2P template fonts intentionally **not** ported — GRAILS theme via `globals.css`

## Verification

```bash
npm run test
npm run build
```
