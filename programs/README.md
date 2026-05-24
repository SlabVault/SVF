# SlabVault On-Chain Programs (Anchor Workspace)

**Status:** Scaffold only — **not deployed to mainnet.**

This workspace holds **SlabVault-specific** Solana programs that compose with [Tensor Foundation](https://github.com/tensor-foundation) mainnet programs. Tensor programs (TCM, fees, escrow, whitelist, AMM) are **not** vendored here; use their published IDs and IDLs.

**Architecture:** [docs/integrations/onchain-trade-stack.md](../docs/integrations/onchain-trade-stack.md)  
**Repo vendoring (npm vs submodule vs fork):** [docs/integrations/tensor-repo-vendoring.md](../docs/integrations/tensor-repo-vendoring.md)

---

## Prerequisites

- Rust 1.75+ (match Tensor `fees` / `marketplace` repos)
- Solana CLI 1.17+
- Anchor 0.29–0.32 (align with `@coral-xyz/anchor` in root `package.json`)
- `pnpm` or `cargo` per program README when building

---

## Folder structure

```
programs/
├── Anchor.toml              # Workspace config (devnet default)
├── Cargo.toml               # Rust workspace members
├── idl-lock.json            # Pin for tensor-foundation/IDLs
├── README.md                # This file
└── slabvault-broker/        # Phase 2 — optional broker overlay
    ├── Cargo.toml
    ├── Xargo.toml
    └── src/
        └── lib.rs           # Stub instructions (not deployed)
```

### Planned programs (roadmap)

| Crate | Phase | Purpose |
|-------|-------|---------|
| `slabvault-broker` | 2 | Policy gate + optional interface fee CPI to treasury |
| `slabvault-whitelist-registry` | 3 (optional) | Off-chain mirror of allowed collection mints if Tensor WL insufficient |
| — | — | **Do not add** full TCM/AMM forks in this repo |

---

## Initialize local toolchain (operators)

From repo root:

```bash
# One-time: install Anchor AVM (see contracts/README.md)
cd programs
anchor build   # After installing Solana + Anchor; builds slabvault-broker stub
```

**CI:** Root `qa:ci` does **not** build Anchor yet — add `programs:build` job when broker program ships.

---

## IDL workflow

1. Init submodule per [tensor-repo-vendoring.md](../docs/integrations/tensor-repo-vendoring.md): `vendor/tensor-idls` at commit in `idl-lock.json`.
2. Copy or symlink IDLs into `programs/idl/tensor/` (gitignored) **or** consume generated clients from:
   - `tensor-foundation/marketplace/clients/js`
   - `tensor-foundation/fees/clients/js`
3. Regenerate TypeScript types into `lib/onchain/idl/generated/` when automating (manual stub today).

See `lib/onchain/idl/README.md`.

---

## Deploy policy

| Target | Allowed |
|--------|---------|
| `devnet` | `slabvault-broker` after review |
| `mainnet-beta` | **Tensor programs only** in Phase 1 |
| `mainnet-beta` | SVF programs **after audit** |

Update `lib/onchain/program-ids.ts` and `.env` when `slabvault-broker` receives a devnet program id.

---

## Implementation checklist (Phase 2)

- [ ] Replace `declare_id!` placeholder in `slabvault-broker`
- [ ] Implement `initialize_broker_config` → treasury pubkey from config
- [ ] CPI helper: attach broker accounts to TCM fill (read marketplace tests)
- [ ] `anchor test` on devnet with funded keypair
- [ ] Wire `lib/onchain/clients/slabvault-broker.ts` to generated IDL
