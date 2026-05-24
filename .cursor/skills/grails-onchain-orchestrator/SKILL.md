---
name: grails-onchain-orchestrator
description: >-
  Continuous on-chain orchestrator for GRAILS Tensor Foundation SDKs, BFF tx routes
  (buy/list/delist/bid), broker fee PDA, and staging write gates. Spawns up to 5
  fix tasks per iteration, loops 1 time per meta tick. Use for M3 on-chain Solana writes and TCM
  integration gaps.
---

# GRAILS On-chain / TCM orchestrator

## Purpose

Wire Tensor Foundation SDKs (`@tensor-oss/tensorswap-sdk`, `@tensor-oss/tcomp-sdk`), BFF tx routes, wallet sign flow, broker fee PDA ops, staging write gate.

## Continuous loop

**Default:** 1 iteration (`LANE_ITERATIONS`) per invocation, or stop at 30 minutes elapsed. Meta re-invokes on next tick.

**Concurrency:** [orchestrator-concurrency.md](../../docs/integrations/orchestrator-concurrency.md) — max **5** spawns/iteration, **24** global fix workers, never spawn meta orchestrator.

```
LOOP (1 iteration):
  1. AUDIT — tx routes, SDK clients, staging checklist, tx tests
  2. LOG — append to docs/integrations/orchestrator-runs/onchain-{YYYY-MM-DD}.md
  3. SPAWN — up to 5 Task workers (generalPurpose, run_in_background: true)
  4. INLINE — trivial env-gate copy (1–5 lines)
  5. DO NOT WAIT for workers
  6. If global cap reached → log cap reached, skip spawns
  7. Footer: spawned count, remaining gaps, recommend next lane
```

## Spawn template

```
Title: On-chain — {tx type} — {narrow fix}

Prompt:
You are a GRAILS on-chain fix worker for SlabVaultFi (c:\Users\amars\Desktop\SVF).

Gap: {BFF route / SDK / modal wiring gap}
Target files: {app/api/trade/tx/..., lib/onchain/..., components/trade/...}
Primary test: {tests/*tensor* or tests/*trade-tx* file}

Rules:
- Staging only: TENSOR_TRADE_WRITE_ENABLED=true on staging, false on prod
- Do NOT deploy mainnet programs or register broker PDA without operator
- Do NOT modify partner ingest merge logic
- Security CSRF guards: note if security lane should follow up
- Run primary test when done
- Do NOT commit secrets (TENSOR_API_KEY, wallet keys)
- Do NOT spawn Task workers or subagents (leaf worker only)

Report: files touched, test result, staging checklist item addressed.
```

Parameters: `subagent_type: generalPurpose`, `run_in_background: true`

## Audit checklist

- [ ] [trade-staging-checklist.md](../../docs/trade-staging-checklist.md) pre-flight items
- [ ] `app/api/trade/tx/buy|list|delist|bid|cancel-bid/route.ts`
- [ ] `lib/onchain/clients/tensor-tcm.ts`, `lib/onchain/tensor-tx-bff.ts`
- [ ] `components/trade/buy-now-modal.tsx`, `use-tensor-buy.ts`
- [ ] Write gate: buttons disabled when `TENSOR_TRADE_WRITE_ENABLED` false
- [ ] Seller metadata (`listState`, seller wallet) on enriched listings
- [ ] Broker fee PDA status documented (ops pending = blocker, no auto-fix)
- [ ] Tx route unit/integration tests

## File ownership

- `lib/onchain/**`
- `app/api/trade/tx/**`
- Tx-related trade components and hooks
- `docs/trade-staging-checklist.md`, `docs/integrations/onchain-trade-stack.md`, `docs/integrations/staging-first-fill-record-template.md`

## Stop conditions

- Staging checklist items for current segment all checked → log complete
- Tx route tests green for **2 consecutive iterations**
- 1 iteration or 30 min → stop (meta re-invokes)
- Broker PDA / mainnet fill required → log operator action, stop spawn

## Conflict avoidance

Security lane adds CSRF on tx routes — this lane owns functional tx building. Backend lane owns ingest. Do not enable prod writes.

## Related

- [grails-step-by-step-plan.md](../../docs/integrations/grails-step-by-step-plan.md) Segment 4
- [grails-orchestrator-lanes.md](../../docs/integrations/grails-orchestrator-lanes.md)
- `scripts/orchestrator/run-onchain-lane.md`
