---
name: grails-backend-orchestrator
description: >-
  Continuous backend/data orchestrator for GRAILS partner ingest (CC, Phygitals),
  sync cron, Postgres ExternalListing, and trade landing data paths. Tensor API
  is optional enrichment only. Spawns up to 5 fix tasks per iteration, loops 1 time per meta tick.
  Use for ingest, sync, and listing data gaps without Tensor API hard dependency.
---

# GRAILS Backend / Data orchestrator

## Purpose

Keep GRAILS read paths alive: partner ingest (CC, Phygitals), `sync:discover`, Postgres upsert, landing/desk data. **Tensor API = optional enrichment only** — core paths must work without `TENSOR_API_KEY`.

## Continuous loop

**Default:** 1 iteration (`LANE_ITERATIONS`) per invocation, or stop at 30 minutes elapsed. Meta re-invokes on next tick.

**Concurrency:** [orchestrator-concurrency.md](../../docs/integrations/orchestrator-concurrency.md) — max **5** spawns/iteration, **24** global fix workers, never spawn meta orchestrator.

```
LOOP (1 iteration):
  1. AUDIT — ingest adapters, sync scripts, tests, staging data freshness
  2. LOG — append to docs/integrations/orchestrator-runs/backend-{YYYY-MM-DD}.md
  3. SPAWN — up to 5 Task workers (generalPurpose, run_in_background: true)
  4. INLINE — trivial config/doc fixes (1–5 lines)
  5. DO NOT WAIT for workers
  6. If global cap reached → log cap reached, skip spawns
  7. Footer: spawned count, remaining gaps, recommend next lane
```

## Spawn template

```
Title: Backend — {ingest/sync gap}

Prompt:
You are a GRAILS backend fix worker for SlabVaultFi (c:\Users\amars\Desktop\SVF).

Gap: {description}
Target files: {lib/partner-listings.ts, etc.}
Primary test: {tests/*partner* or tests/*landing* file}

Rules:
- Partner ingest (CC, Phygitals) is primary read path
- Do NOT require TENSOR_API_KEY for core functionality
- Do NOT change trade UI layout components
- Do NOT apply prisma migrations without noting approvalGates: [commit]
- Minimal diff; run primary test when done
- Do NOT commit secrets
- Do NOT spawn Task workers or subagents (leaf worker only)

Report: files touched, test result, sync impact.
```

Parameters: `subagent_type: generalPurpose`, `run_in_background: true`

## Audit checklist

- [ ] `lib/partner-listings.ts` — merge graph, CC + Phygitals paths
- [ ] `lib/partner-ingest-adapter.ts` — adapter contract for all partners
- [ ] `lib/external-listings-sync.ts` + `scripts/sync-external-listings.ts`
- [ ] `POST /api/sync` cron path documented and tested
- [ ] `prisma/schema.prisma` — `ExternalListing` model matches usage
- [ ] `/trade` landing: non-null floor, listed count, sell-now from partner data
- [ ] `/trade/c/collector-crypt` and `/trade/c/phygitals` desk data paths
- [ ] Tests: partner ingest + trade landing suite green
- [ ] Tensor enrichment paths fail gracefully when key absent

## File ownership

- `lib/partner-listings.ts`, `lib/partner-ingest-adapter.ts`
- `lib/external-listings-sync.ts`, `lib/phygitals-listings.ts`
- `lib/trade-landing.ts`, `lib/data-sync.ts`
- `scripts/sync-external-listings.ts`, `app/api/sync/**`
- `prisma/schema.prisma` (ExternalListing)
- Related tests

## Stop conditions

- All ingest/landing tests pass for **2 consecutive iterations**
- `sync:discover` documented green in log
- 1 iteration or 30 min → stop (meta re-invokes)
- `DATABASE_URL` missing → log blocker, stop data mutation spawns

## Conflict avoidance

Backend lane does not change `components/trade/*` layout. On-chain lane owns `lib/onchain/*`. UI lane owns visual desk shell.

## Related

- [grails-step-by-step-plan.md](../../docs/integrations/grails-step-by-step-plan.md) Segment 2
- [grails-orchestrator-lanes.md](../../docs/integrations/grails-orchestrator-lanes.md)
- `scripts/orchestrator/run-backend-lane.md`
