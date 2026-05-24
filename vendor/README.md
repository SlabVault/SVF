# Vendor directory

Third-party reference code vendored for SlabVaultFi development. These trees are **not** imported at runtime — they serve as UI and architecture references when porting features.

## marketplace-nextjs-template

- **Source:** [tensor-foundation/marketplace-nextjs-template](https://github.com/tensor-foundation/marketplace-nextjs-template)
- **Path:** `vendor/marketplace-nextjs-template/`
- **Purpose:** Reference for `/trade` marketplace UX — collection index, listing grid, item cards, wallet connect flow, and on-chain buy/list/delist modals.
- **SlabVault adaptation:**
  - Dark SlabVault theme (`app/globals.css` tokens) replaces Tensor cyan / NES styling.
  - Partner listings (`lib/partner-listings.ts`, `GET /api/trade/partners/[platform]/listings`) replace Tensor REST `collectionListings` / `collectionStats` routes.
  - Settlement stubs keep `@tensor-oss/tensorswap-sdk` + `@tensor-oss/tcomp-sdk` for mainnet program IDs; buy/offer modals connect to existing write-path stubs.
- **Update:** Re-clone or pull upstream when Tensor ships template changes:

  ```bash
  git -C vendor/marketplace-nextjs-template pull --ff-only
  ```
