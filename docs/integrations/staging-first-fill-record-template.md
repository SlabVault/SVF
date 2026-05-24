# Staging first fill — operator record template

**Purpose:** Capture evidence of the first verified on-chain fill on a **staging** deployment (M3 / Segment 4). One signed mainnet-beta transaction through GRAILS `/trade` buy path is enough to close the staging gate when broker fees and enrichment are confirmed.

**Do not commit secrets.** Redact API keys, RPC URLs with embedded keys, and private wallet material. Public treasury and mint addresses from listings are fine.

**Related:**

- [trade-staging-checklist.md](../trade-staging-checklist.md) — pre-flight and verification steps 1–5
- [onchain-trade-stack.md](./onchain-trade-stack.md) — programs, broker PDA, write gate
- [grails-step-by-step-plan.md](./grails-step-by-step-plan.md) — Segment 4 acceptance (document fill result)

---

## How to use

1. Complete [trade-staging-checklist.md](../trade-staging-checklist.md) pre-flight and broker PDA steps.
2. Run staging verification steps 1–5; execute one small buy (wallet signs serialized tx from `/api/trade/tx/buy`).
3. Copy the **Record block** below into a new file (append-only journal):

   ```
   docs/integrations/staging-fill-records/{YYYY-MM-DD}-first-fill.md
   ```

4. Fill every field; leave `N/A` only when truly not applicable.
5. Link the record from your orchestrator or ops handoff (no code deploy required).

---

## Record block (copy from here)

```markdown
# Staging first fill — {YYYY-MM-DD}

**Recorded by:** {operator name or handle}  
**Recorded at (UTC):** {ISO-8601 timestamp}  
**Deployment:** {staging URL, e.g. https://staging.slabvault.xyz}  
**Cluster:** mainnet-beta  
**Tx type:** buy fill | list | delist | bid | cancel-bid  
**Outcome:** success | failed | partial (tx landed, broker fee not observed)

---

## Transaction

| Field | Value |
|-------|-------|
| **Tx signature** | `{base58 signature}` |
| **Explorer** | https://solscan.io/tx/{signature} |
| **Mint (NFT)** | `{mint pubkey}` |
| **Block time (UTC)** | `{from explorer or RPC}` |
| **Slot** | `{optional}` |
| **Fee (SOL)** | `{lamports → SOL}` |
| **Signer wallet** | `{staging wallet pubkey}` |
| **Seller wallet** | `{from listing enrichment}` |
| **List state / ask id** | `{listState or Tensor ask id if shown in UI/API}` |
| **Venue / program** | TCM fill | ME-origin | other — `{notes}` |

**Notes:** {e.g. buy modal → sign → confirm; any simulation errors before sign}

---

## Listing context

| Field | Value |
|-------|-------|
| **Collection slug (GRAILS)** | `{e.g. collector-crypt}` |
| **Tensor collection slug** | `{from TENSOR_CC_COLLECTION_SLUGS}` |
| **Cert / external id** | `{partner cert or listing id}` |
| **Ask price (SOL)** | `{at time of fill}` |
| **Enrichment** | listState present: yes/no; seller wallet matched: yes/no |
| **Item URL** | `/trade/c/{slug}/item/{id or mint}` |

---

## Environment snapshot (staging only)

Record **presence and non-secret values** only. Never paste `TENSOR_API_KEY`, `HELIUS_API_KEY`, `DATABASE_URL`, or wallet secrets.

| Variable | Set? | Value / notes |
|----------|------|----------------|
| `TRADE_PLATFORM_ENABLED` | yes/no | `{true/false}` |
| `TENSOR_TRADE_WRITE_ENABLED` | yes/no | **must be `true` for fill** |
| `NEXT_PUBLIC_TENSOR_TRADE_WRITE_ENABLED` | yes/no | `{true/false}` |
| `TENSOR_API_KEY` | yes/no | set (redacted) |
| `TENSOR_CC_COLLECTION_SLUGS` | yes/no | `{slug list}` |
| `TENSOR_API_BASE_URL` | yes/no | `{default or override}` |
| `HELIUS_API_KEY` | yes/no | set (redacted) |
| `SOLANA_RPC_URL` | yes/no | `{host only, no key}` |
| `NEXT_PUBLIC_SOLANA_RPC` | yes/no | `{host only}` |
| `DATABASE_URL` | yes/no | set (redacted) |
| `PARTNER_LIVE_SCRAPE_ENABLED` | yes/no | `{true/false}` |
| `SVF_ONCHAIN_CLUSTER` | yes/no | `{mainnet-beta/devnet}` |
| `SVF_BROKER_PUBKEY` | yes/no | `{pubkey or "default treasury"}` |
| `SVF_BROKER_FEE_BPS` | yes/no | preview-only env |
| `TENSOR_TX_REQUIRE_TRUSTED_ORIGIN` | yes/no | `{true/false}` |
| **Deploy git ref** | — | `{commit SHA or release tag}` |
| **Node / Next version** | — | `{from CI or local}` |

**Production check (same day):** `TENSOR_TRADE_WRITE_ENABLED` on prod = **false** (confirm yes/no).

---

## Pre-flight confirmation

Copy from [trade-staging-checklist.md](../trade-staging-checklist.md); check all that applied before this fill.

- [ ] `/trade` loaded with platform enabled
- [ ] Partner ingest / DB had listings for target collection
- [ ] Tensor seller enrichment active (`tensorEnrichment` or UI seller wallet)
- [ ] Staging wallet connected and funded for fees
- [ ] Broker fee PDA: treasury registered on Tensor Fees (see below)

---

## Broker fee PDA

| Check | Result |
|-------|--------|
| Treasury pubkey (`data/site.json`) | `2oRZe7z9Jx3rpoUWuidjGhpX9mxxhtps2JqQtdxLfHwg` |
| Broker registered on Tensor Fees | yes / no / unverified |
| Broker lamports received on this fill | yes / no / not checked |
| **Evidence** | {Solscan inner ix, account delta, or ops note} |

---

## Verification steps (post-fill)

| Step | Result |
|------|--------|
| 1 Read path — collection desk | pass / fail |
| 2 Enrichment — partner API | pass / fail |
| 3 Buy dry-run — `/api/trade/tx/buy` returned tx | pass / fail |
| 4 Write gate off — buttons disabled when flag false | pass / fail / skipped |
| 5 Footer ticker — 24h vol when API key set | pass / fail / skipped |

---

## Blockers / follow-ups

| ID | Item | Owner |
|----|------|-------|
| B1 | {e.g. broker PDA not registered} | ops |
| B2 | {e.g. CSRF POST migration — security lane} | eng |

**Rollback if needed:** set `TENSOR_TRADE_WRITE_ENABLED=false` and `NEXT_PUBLIC_TENSOR_TRADE_WRITE_ENABLED=false` on staging (see staging checklist Rollback).

---

## Sign-off

| Role | Name | Date (UTC) |
|------|------|------------|
| Operator | | |
| Eng review (optional) | | |

**M3 gate:** first staging fill documented — **open** / **closed**
```

---

## Example (redacted)

```markdown
# Staging first fill — 2026-05-22

**Recorded by:** ops  
**Recorded at (UTC):** 2026-05-22T18:45:00Z  
**Deployment:** https://staging.example.com  
**Tx type:** buy fill  
**Outcome:** success

## Transaction

| Tx signature | `5xY...abc` (redacted) |
| Mint | `So1...mint` |
| Signer wallet | `Stg...wallet` |

## Environment snapshot

| `TENSOR_TRADE_WRITE_ENABLED` | yes | `true` |
| `TENSOR_API_KEY` | yes | set (redacted) |
| Production write flag false | yes | confirmed |
```

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-22 | Initial template for M3 first staging fill record (tx sig, mint, env snapshot) |
