# Tensor Foundation IDLs

Pinned copies from [tensor-foundation/IDLs](https://github.com/tensor-foundation/IDLs) — see `manifest.json` and `programs/idl-lock.json`.

## Sync procedure

1. Open `programs/idl-lock.json` and set `tensorFoundationIdls.commit` to a Git SHA.
2. Clone https://github.com/tensor-foundation/IDLs at that SHA.
3. Copy relevant `.json` IDLs into this directory (or use submodule).
4. Run Anchor / `@coral-xyz/anchor` codegen into `lib/onchain/idl/generated/` (future).
5. Replace stubs in `lib/onchain/clients/*.ts` with generated instruction builders.

## Primary IDL sources

| Program | IDL location |
|---------|----------------|
| Marketplace (TCM) | `tensor-foundation/IDLs`, `tensor-foundation/marketplace` |
| Fees | `tensor-foundation/fees` |
| Escrow | `tensor-foundation/escrow` |
| Whitelist | `tensor-foundation/whitelist` |
| AMM | `tensor-foundation/amm` |

## npm / JS clients (alternative to raw IDL)

- `@tensor-oss/tensorswap-sdk` — legacy pNFT path
- `@tensor-oss/tcomp-sdk` — compressed NFT path
- Generated clients in each tensor-foundation repo under `clients/js`
