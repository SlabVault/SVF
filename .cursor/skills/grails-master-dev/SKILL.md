---
name: grails-master-dev
description: >-
  Master developer audit for SlabVaultFi GRAILS — runs verify pass first (test +
  build), reads master-fix backlog, greps blocking stubs, spot-checks live routes,
  fixes cross-lane wiring bugs inline. Spawns max 5 narrow fix workers only when
  needed. Use when orchestrator lanes leave RED tests, broken imports, or half-wired
  features.
---

# GRAILS Master Developer

## Purpose

Catch what lane orchestrators missed: runtime errors, broken links, wrong imports, data showing 0 when it should have value, and half-wired merges. **Verify pass first** — do not spawn workers until `npm run test` and `npm run build` status is known.

## When to use

- Meta tick after UI/backend/onchain/QA lanes ran
- User asks for master dev pass, integration audit, or "things other agents forgot"
- `docs/integrations/orchestrator-runs/verify-*.md` is RED
- Build fails with client bundle pulling server modules (`node:fs`, Prisma, db-connection)

## Continuous loop

**Default:** 1 iteration per invocation. Prefer **inline fixes**; spawn only when a fix is clearly separable.

**Concurrency:** max **5** narrow Task workers per iteration (`generalPurpose`, `run_in_background: true`). Never spawn other orchestrators.

```
1. VERIFY — npm run test, then npm run build (must know RED/GREEN before spawns)
2. READ — docs/integrations/master-fix-backlog-YYYY-MM-DD.md + grails-tensor-gap-backlog.md
3. GREP — TODO/FIXME/soon:true on core flows (not intentional Tensor parity stubs)
4. BROWSER — if localhost:3000 up: /, /trade, /trade/all, /trade/portfolio, /trade/c/collector-crypt, one /trade/slab/*
5. CHECK — env contract (validateEnvVars), RPC cache, prisma skip, all-listings merge, wallet connect
6. FIX — priority: runtime > data zeros > half-wired features
7. LOG — append **Master Dev pass** section to master-fix-backlog
8. RE-VERIFY — tests must stay green before exit
```

## Fix priority

1. Runtime errors, broken links, wrong imports
2. Data showing 0 when should have value (portfolio est value, footer listed count mismatch)
3. Forgotten half-wired features from orchestrator merges
4. Client components importing server-only modules (split constants/types to client-safe paths)

## Spawn template (max 5)

```
Title: Master fix — {one failure or route}

Prompt:
You are a GRAILS master fix worker for SlabVaultFi (c:\Users\amars\Desktop\SVF).

Issue: {exact error, test name, or broken route}
Target files: {1–3 files}
Primary test: {tests/...}

Rules:
- Minimal regression fix — no feature scope creep
- Do NOT spawn subagents
- Run npm run test on touched area; full test if unsure
- Do NOT commit

Report: root cause, files touched, test/build result.
```

## Audit checklist

- [ ] `npm run test` — 0 failures
- [ ] `npm run build` — no webpack node:fs/node:path in client trace
- [ ] `lib/security.ts` validateEnvVars — production contract sane
- [ ] `lib/rpc-cache.ts` — balance + wallet NFT TTL wired
- [ ] `lib/db-connection.ts` — prisma skip in dev doesn't break reads
- [ ] `lib/trade/all-listings.ts` — merge across partner slugs
- [ ] `app/api/trade/wallet/nfts` — enrichPortfolioEstValues + cache
- [ ] Wallet connect on `/trade/portfolio` (Connect Wallet + VIEW by address)
- [ ] Footer listed count matches landing aggregate (`getTradeLandingAggregateFromCollections`)
- [ ] No client import of `@/lib/trade/all-listings` value exports (use `@/lib/trade-routes` for `ALL_LISTINGS_SLUG`)

## Stop conditions

- Test + build green
- Remaining items are P1/P2 product gaps → log to backlog, do not implement
- Blocker needs operator (DATABASE_URL, broker PDA) → log and stop

## Output

Return to operator: issues fixed, files changed, test/build status, browser spot-check notes, backlog updates.
