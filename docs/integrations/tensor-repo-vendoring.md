# Tensor Foundation — Repo Vendoring Plan

**Status:** Planning (May 2026)  
**Product:** **Tensor for Slabs** — `/trade` aggregator desk  
**Strategy:** Integrate on **Tensor mainnet programs**; fork nothing in v1 unless fee/branding requires it later.

**Related:**

- [tensor-fork-feasibility.md](./tensor-fork-feasibility.md) — fork vs integrate, ME aggregation, GTM
- [onchain-trade-stack.md](./onchain-trade-stack.md) — program IDs, PDAs, phases
- [rwa-trading-platform.md](./rwa-trading-platform.md) — `/trade` product spec
- [gacha-nft-metadata.md](./gacha-nft-metadata.md) — CC pNFT / Phygitals cNFT, DAS cert↔mint
- [`programs/README.md`](../../programs/README.md) — Anchor workspace + IDL lock

---

## Vendoring decision key

| Strategy | When SlabVault uses it |
|----------|------------------------|
| **npm** | Published package; pin semver in root `package.json`; no source in repo |
| **git submodule** | Pin exact commit for IDLs or unreleased JS clients; CI/codegen reads from `vendor/` |
| **reference-only** | Docs, spikes, operator CLI, CI patterns — link in this doc; no vendored source |
| **fork** | Custom deploy of on-chain programs — **deferred** until volume justifies audit (Phase 3+) |

**Default for on-chain programs (`marketplace`, `escrow`, `fees`, `whitelist`, `amm`):** use **mainnet program IDs** — do **not** fork or submodule Rust sources in MVP.

---

## Per-repo matrix

| Repo | Vendoring | MVP need (Tensor for Slabs) | Notes |
|------|-----------|----------------------------|-------|
| [marketplace](https://github.com/tensor-foundation/marketplace) | **npm / reference** — mainnet TCM; JS client from repo `clients/js` or npm when available | **P0 — critical** | List, bid, sell, fill on CC pNFT + treasury slabs. Prefer **TCM JS client** over legacy tensorswap for new tx builders. |
| [escrow](https://github.com/tensor-foundation/escrow) | **reference-only** + IDL via submodule | **P1 — bids (week 3–4)** | Bid escrow CPI; read IDL for account metas. No program deploy. |
| [fees](https://github.com/tensor-foundation/fees) | **reference-only** + IDL via submodule | **P1 — broker config (week 3–4)** | Register SVF treasury as **broker** fee recipient on whitelisted collections. Configure on mainnet — no redeploy. |
| [whitelist](https://github.com/tensor-foundation/whitelist) | **reference-only** + IDL via submodule | **P1 — week 3** | On-chain allowlist for CC, Phygitals, SVF treasury collection mints. Operator-signed txs. |
| [amm](https://github.com/tensor-foundation/amm) | **reference-only** + IDL via submodule | **P2 — read depth only in MVP** | Show pool badge / floor on `/trade/c/*`; sweep/instant-sell txs **after** list/buy path proven. |
| [tensorswap-sdk](https://github.com/tensor-foundation/tensorswap-sdk) | **npm** — `@tensor-oss/tensorswap-sdk` | **P0 — CC pNFT (week 1–2)** | Collector Crypt list/bid/fill; ME-origin routing when Tensor index tags venue. |
| [tcomp-sdk](https://github.com/tensor-foundation/tcomp-sdk) | **npm** — `@tensor-oss/tcomp-sdk` | **P1 — Phygitals cNFT (week 3–4)** | Compressed NFT proofs (Bubblegum); not on user list but required for Phygitals lane. |
| [tensor-common](https://github.com/tensor-foundation/tensor-common) | **npm** if published; else **reference-only** | **P2 — optional** | Shared normalization/types if marketplace client does not re-export. Avoid duplicating helpers in `lib/onchain/`. |
| [toolkit](https://github.com/tensor-foundation/toolkit) | **npm** if published; else **reference-only** | **P1 — tx building (week 2)** | Account parsing, tx size helpers — pulled transitively by SDKs; explicit dep only if needed. |
| [toolbox](https://github.com/tensor-foundation/toolbox) | **reference-only** | **P3 — Rust only** | CPI/test helpers for `programs/slabvault-broker` Anchor tests — not needed for Next.js MVP. |
| [SDK-examples](https://github.com/tensor-foundation/SDK-examples) | **reference-only** | **P0 — week 1 spike** | Copy patterns for list/fill scripts; run against CC collection on mainnet-beta (read-only first). |
| [IDLs](https://github.com/tensor-foundation/IDLs) | **git submodule** → `vendor/tensor-idls` | **P0 — week 2** | Pin SHA in `programs/idl-lock.json`; codegen into `lib/onchain/idl/generated/`. |
| [Unified-Wallet-Kit](https://github.com/tensor-foundation/Unified-Wallet-Kit) | **npm** or **reference-only** (adapt patterns) | **P0 — week 1** | Wallet connect UX on `/trade/*`; isolate from vault checkout wallet provider if needed. |
| [smart-rpc](https://github.com/tensor-foundation/smart-rpc) | **npm** — optional | **P2 — week 4+** | Resilient RPC for fill confirmation; Helius primary, smart-rpc as fallback layer. |
| [eigen](https://github.com/tensor-foundation/eigen) | **reference-only** (operator CLI) | **P3 — ops/debug** | Decode Tensor accounts, lookup program errors during devnet spikes. Install via `cargo install`, not vendored. |
| [actions](https://github.com/tensor-foundation/actions) | **reference-only** | **P3 — CI later** | Reuse when `programs:build` CI job ships (Anchor, Solana, pnpm cache). |
| [tensor-tests-common](https://github.com/tensor-foundation/tensor-tests-common) | **reference-only** | **P3 — Anchor tests** | Shared test fixtures if `slabvault-broker` integration tests mirror Tensor patterns. |
| [web3.js-compatibility-example](https://github.com/tensor-foundation/web3.js-compatibility-example) | **reference-only** | **P2 — sanity check** | SVF uses `@solana/web3.js` v1.x; confirm new TCM clients work before upgrading web3. |

### Also use (not in vendoring checklist but MVP-critical)

| Repo | Vendoring | MVP need |
|------|-----------|----------|
| [marketplace-nextjs-template](https://github.com/tensor-foundation/marketplace-nextjs-template) | **reference-only** — port components into `app/trade/*` | **P0 — week 1 UI** | Collection grid, wallet shell, listing cards — do not submodule entire app; adapt to SlabVault design system. |
| [tcomp-sdk](https://github.com/tensor-foundation/tcomp-sdk) | **npm** | **P1 — week 3** | Phygitals cNFT path (see above). |

---

## External repos & services (beyond tensor-foundation)

| Provider | Role in MVP | Vendoring | When |
|----------|-------------|-----------|------|
| **[Helius](https://helius.dev)** | DAS (`getAsset`, `searchAssets`), cert↔mint backfill, optional webhooks/Geyser for indexer v2 | **API key** — no submodule | **Week 1** — cert linking; **Week 4+** — fill/listing cache |
| **[Metaplex](https://github.com/metaplex-foundation)** (Token Metadata, Bubblegum) | pNFT rule sets; cNFT tree proofs; royalty accounts in TCM CPI | **reference-only** — via Helius DAS + SDK account metas | **Week 1–2** CC; **Week 3** Phygitals |
| **Magic Eden** | Venue for CC listings; **depth via Tensor index**, not a separate ME aggregator build | **No ME API required for MVP** — Tensor REST/SDK returns `venue: magic_eden` | **Week 1** — display venue tags; fills route via Tensor SDK |
| **[Tensor REST API](https://docs.tensor.trade/trade/api-and-sdk)** | Collection stats, listing graph, optional websockets | **API key** (`TENSOR_API_KEY`) | **Week 1** read grid; SDK-only fallback if key denied |
| **Collector Crypt** | Partner collection mint, gacha ingest | Existing scrapers / API — [phygitals-collectorcrypt.md](./phygitals-collectorcrypt.md) | **Week 1** |
| **Phygitals** | cNFT tree ids, partner metadata | Partner docs + DAS — no public Tensor guarantee for all Phygitals asks | **Week 3** |

**Magic Eden API note:** SlabVault does **not** need to integrate ME’s marketplace API for aggregated depth — that is Tensor’s index layer. ME program accounts appear only at **fill** time when the best ask is ME-origin. Optional ME API use: operator verification of CC collection slug / stats — not MVP-blocking.

---

## `vendor/` git submodule plan

SlabVault is a **Next.js monorepo** (no `packages/` workspace today). Keep vendoring minimal:

```
vendor/
└── tensor-idls/          # git submodule → tensor-foundation/IDLs @ pinned SHA
    └── (IDL JSON files)

programs/
└── idl-lock.json         # SHA + program ID metadata (already exists)

lib/onchain/
├── idl/generated/        # gitignored — Anchor/TS codegen output
└── clients/*.ts            # Hand-written until codegen wired
```

### Submodule commands (operators — run once when starting write path)

```bash
git submodule add https://github.com/tensor-foundation/IDLs vendor/tensor-idls
cd vendor/tensor-idls && git checkout <sha-from-idl-lock.json>
```

Update procedure:

1. Set `programs/idl-lock.json` → `tensorFoundationIdls.commit`.
2. `git submodule update --init --recursive`
3. Regenerate clients (future script) or copy IDLs per `lib/onchain/idl/README.md`.

### What **not** to submodule

| Do not vendor | Why |
|---------------|-----|
| `marketplace`, `amm`, `fees`, `escrow`, `whitelist` Rust sources | Use mainnet programs; fork = audit + ops burden |
| `marketplace-nextjs-template` | Port UI into `app/trade/*`; avoid drift from upstream template |
| `SDK-examples`, `web3.js-compatibility-example` | Spike locally; link only |
| `tensorswap-sdk`, `tcomp-sdk` | Use npm `@tensor-oss/*` |

### Future `packages/` (optional, post-MVP)

If SVF extracts shared trade logic for a mobile app or worker:

```
packages/
└── trade-core/           # Thin wrapper around @tensor-oss/* + lib/onchain types
```

Defer until `/trade` write path stabilizes — not required for week 1–4 MVP.

---

## Week 1–4 integration order

### Week 1 — Read path + wallet + CC spike

| Day | Deliverable | Repos / deps |
|-----|-------------|--------------|
| 1–2 | `/trade` landing + collection route shell; `RWA_TRADE_ENABLED` staging | Port patterns from **marketplace-nextjs-template** |
| 2–3 | Wallet connect on `/trade/*` | **Unified-Wallet-Kit** (npm or adapted patterns) |
| 3–4 | Server BFF: Tensor REST collection stats + listing grid (CC slug) | **Tensor API** + `TENSOR_CC_COLLECTION_SLUGS` |
| 4–5 | Read-only spike: **SDK-examples** + **tensorswap-sdk** against CC mint | npm `@tensor-oss/tensorswap-sdk` |
| 5 | Cert↔mint backfill job | **Helius DAS** + Metaplex metadata parsing |

**Exit:** `/trade/c/collector-crypt` shows live floor/list count (API or stub); wallet connects; one read-only SDK script succeeds.

### Week 2 — Buy path (TCM fill) + IDL pin

| Day | Deliverable | Repos / deps |
|-----|-------------|--------------|
| 1 | Init **`vendor/tensor-idls`** submodule; pin SHA in `idl-lock.json` | **IDLs** |
| 2–3 | Tx builder: TCM fill + fee accounts for CC pNFT ask | **marketplace** client, **tensorswap-sdk**, **toolkit** |
| 3–4 | Buy button on item page; simulate + send via wallet | **web3.js** v1 (see **web3.js-compatibility-example**) |
| 4–5 | Tx verify + activity row cache | Reuse marketplace-payment-verify patterns |

**Exit:** One devnet or small mainnet-beta fill on CC or test mint; venue tag displayed.

### Week 3 — Whitelist + Phygitals + fees prep

| Day | Deliverable | Repos / deps |
|-----|-------------|--------------|
| 1–2 | Operator whitelist txs for CC + SVF treasury collection | **whitelist** IDL, tensorswap whitelist helpers |
| 2–4 | Phygitals collection page; cNFT list/buy spike | **tcomp-sdk**, Helius DAS `compressed: true` |
| 4–5 | Devnet broker fee PDA → SVF treasury (`data/site.json`) | **fees** program docs + **eigen** CLI for account debug |

**Exit:** CC + Phygitals collection pages live; whitelist badge when on-chain proof exists; broker config documented (lamports or blocker).

### Week 4 — Bids, escrow, polish, optional AMM read

| Day | Deliverable | Repos / deps |
|-----|-------------|--------------|
| 1–2 | Bid create/cancel (TCM + **escrow** accounts) | **escrow** IDL, tensorswap-sdk |
| 2–3 | Vault wallet list flow for treasury slabs | **marketplace** + [vault-to-trade-listings.md](./vault-to-trade-listings.md) |
| 3–4 | AMM pool depth read-only on high-liquidity collections | **amm** IDL / Tensor API pool fields |
| 4–5 | RPC hardening, error states, `qa:ci` green with new deps | **smart-rpc** optional; **Helius** primary |

**Exit:** List + buy + bid on at least one collection; treasury slab listable; `/trade` beta badge in nav.

---

## npm install bundle (Phase 1 write path)

Add when Week 2 starts (pin exact versions at install time):

```bash
pnpm add @tensor-oss/tensorswap-sdk @tensor-oss/tcomp-sdk
# Optional, as needed:
# pnpm add @tensor-foundation/unified-wallet-kit  # verify package name at install
# pnpm add @tensor-foundation/smart-rpc
```

Gate all write txs behind `TENSOR_TRADE_WRITE_ENABLED` (see `.env.example`).

---

## Fork decision gate (post–week 4)

| Trigger | Action |
|---------|--------|
| Broker fees cannot attach to partner collections | Partner agreement + **fees** config only — still no fork |
| Need custom program IDs in UI/branding | Evaluate fork **fees** or **slabvault-broker** overlay — not full TCM |
| Tensor API unavailable long-term | Own indexer (Helius webhooks) + on-chain reads — still use mainnet programs |
| Volume > audit budget threshold | Fork **marketplace** / **amm** — see [tensor-fork-feasibility.md](./tensor-fork-feasibility.md) Phase 3 |

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-21 | Initial vendoring matrix, vendor/ submodule plan, week 1–4 order |
