---
name: grails-security-orchestrator
description: >-
  Continuous security orchestrator for GRAILS CSRF, env leak detection, write-route
  validation, and guardrail tests. Spawns up to 5 fix tasks per iteration, loops 1 time per meta tick. Use when hardening /api/trade/tx routes and ops env contract.
---

# GRAILS Security orchestrator

## Purpose

Harden GRAILS write paths: CSRF + wallet challenge on `/api/trade/tx/*`, env contract compliance, rate limits, guardrail tests.

## Continuous loop

**Default:** 1 iteration (`LANE_ITERATIONS`) per invocation, or stop at 30 minutes elapsed. Meta re-invokes on next tick.

**Concurrency:** [orchestrator-concurrency.md](../../docs/integrations/orchestrator-concurrency.md) — max **5** spawns/iteration, **24** global fix workers, never spawn meta orchestrator.

```
LOOP (1 iteration):
  1. AUDIT — guardrail tests, env contract, tx route auth, SECURITY_CHECKLIST
  2. LOG — append to docs/integrations/orchestrator-runs/security-{YYYY-MM-DD}.md
  3. SPAWN — up to 5 Task workers (generalPurpose, run_in_background: true)
  4. INLINE — trivial header/check additions (1–5 lines) when safe
  5. DO NOT WAIT for workers
  6. If global cap reached → log cap reached, skip spawns
  7. Footer: spawned count, remaining gaps, recommend next lane
```

## Spawn template

```
Title: Security — {guardrail gap}

Prompt:
You are a GRAILS security fix worker for SlabVaultFi (c:\Users\amars\Desktop\SVF).

Gap: {CSRF / validation / env leak / rate limit gap}
Target files: {app/api/trade/tx/..., lib/http-auth.ts, tests/...}
Primary test: {tests/api-*-guardrails.test.ts or tests/http-auth.test.ts}

Rules:
- Never log or commit secret values
- Preserve on-chain dry-run behavior when write flag off
- Minimal diff; run primary test + npm run test:guardrails when done
- Do NOT change ingest business logic or UI layout
- Do NOT commit
- Do NOT spawn Task workers or subagents (leaf worker only)

Report: files touched, tests passed, checklist item closed.
```

Parameters: `subagent_type: generalPurpose`, `run_in_background: true`

## Audit checklist

- [ ] `npm run test:guardrails` — 0 failures
- [ ] `npm run ops:env` / `scripts/check-env-contract.ts`
- [ ] CSRF on `/api/trade/tx/*` (compare legacy marketplace pattern)
- [ ] Write routes reject unauthenticated / invalid wallet challenge
- [ ] No secrets in client bundles or public env (`NEXT_PUBLIC_*` audit)
- [ ] [SECURITY_CHECKLIST.md](../../docs/SECURITY_CHECKLIST.md) trade section
- [ ] Rate limit stubs or Upstash wiring documented
- [ ] Idempotency / orders schema gaps noted (spawn or defer)

## File ownership

- `app/api/trade/tx/**` (auth layers)
- `lib/http-auth.ts`, CSRF helpers
- `scripts/check-env-contract.ts`
- `docs/SECURITY_CHECKLIST.md`
- `tests/api-*-guardrails.test.ts`, `tests/http-auth.test.ts`

## Stop conditions

- `npm run test:guardrails` 0 fail for **2 consecutive iterations**
- `npm run ops:env` clean (or only documented expected warnings)
- 1 iteration or 30 min → stop (meta re-invokes)

## Conflict avoidance

Add guards without breaking on-chain dry-run tests. Coordinate via shared test files. Do not change ingest data shapes.

## Related

- [grails-step-by-step-plan.md](../../docs/integrations/grails-step-by-step-plan.md) Segment 9
- [grails-orchestrator-lanes.md](../../docs/integrations/grails-orchestrator-lanes.md)
- `scripts/orchestrator/run-security-lane.md`
