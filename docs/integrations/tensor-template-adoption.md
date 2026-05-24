# Tensor template adoption — what comes from where

**Stop reinventing.** This doc defines the split so `/trade` does not drift into a third custom design.

## Sources of truth

| Source | Provides | Does NOT provide |
|--------|----------|------------------|
| [marketplace-nextjs-template](https://github.com/tensor-foundation/marketplace-nextjs-template) | BFF tx routes, `NftCard` buy/list/delist signing, `stats-box` / `nft-card` CSS, `tensor-black` / `#641ae6` buttons | Pro desk, collection nav, activity column, filters, index table |
| [tensor.trade](https://www.tensor.trade/) (live product) | Pro layout: left sweep panel, trait filters, activity feed, dense stats ribbon | Open-source frontend repo |
| [tensor-tradesite-ux-audit.md](./tensor-tradesite-ux-audit.md) | SlabVault mapping for pro desk structure | — |
| Partner ingest (`lib/partner-listings.ts`) | CC / Phygitals listing data | — |

## Rule

1. **Copy vendor code for:** tx signing, API proxy shape, card + stats CSS, wallet toast pattern.
2. **Copy tensor.trade structure for:** 3-column desk, tabs, toolbar — documented in UX audit.
3. **Do not** blend SlabVault marketing tokens (vault-amber glow, rounded-xl cards) on `/trade/*` — use template tokens inside `.trade-layout` only.
4. **GRAILS brand** = logo + header copy only; desk chrome matches template/tensor density.

## Runtime mapping

```
vendor/NftCard.tsx          → components/trade/tensor/nft-card.tsx
vendor/app/api/*            → app/api/trade/tx/* + collection-*
vendor/app/global.css       → app/globals.css (.trade-layout scope)
vendor/ui-layout.tsx        → components/trade/tensor/ui-layout.tsx
UX audit pro desk           → components/trade/tensor/collection-desk-layout.tsx
```

## Why the desk still won't match tensor.trade pixel-perfect

The foundation template is **one centered page** (`web/app/page.tsx`). tensor.trade is a separate product. Our pro desk is **audit-driven**, not template-driven — that is correct. The mistake was **restyling** template components with SlabVault vault-panel tokens instead of vendor CSS.
