---
name: grails-qa-orchestrator
description: >-
  Continuous QA orchestrator for GRAILS — runs npm test, build, and lint; spawns
  up to 5 background fix tasks on failure per iteration, loops 1 time per meta tick. Stops when
  npm test has 0 failures for 2 consecutive iterations. Use for CI regression
  loops and build/debug automation.
---

# GRAILS QA / Debug orchestrator

## Purpose

Keep CI green: `npm run test`, `npm run build`, `npm run lint`. Spawn targeted fixes on failure. Regression fixes only — no feature work.

## Continuous loop

**Default:** 1 iteration (`LANE_ITERATIONS`) per invocation, or stop at 30 minutes elapsed. Meta re-invokes on next tick.

**Concurrency:** [orchestrator-concurrency.md](../../docs/integrations/orchestrator-concurrency.md) — max **5** spawns/iteration, **24** global fix workers, never spawn meta orchestrator.

```
LOOP (1 iteration):
  1. AUDIT — run npm run test (then build/lint if test green)
  2. LOG — append to docs/integrations/orchestrator-runs/qa-{YYYY-MM-DD}.md
  3. SPAWN — up to 5 Task workers (generalPurpose, run_in_background: true), one failure each
  4. INLINE — trivial test expectation fixes (1–5 lines) if obvious
  5. DO NOT WAIT for workers — continue audit
  6. If global cap reached → log cap reached, skip spawns
  7. Footer: spawned count, remaining failures, recommend next lane
```

## Spawn template

```
Title: QA fix — {test file or build error}

Prompt:
You are a GRAILS QA fix worker for SlabVaultFi (c:\Users\amars\Desktop\SVF).

Failure:
{exact test name or build error excerpt — no secrets}

Target files: {files implicated by stack trace}
Primary test: {failing test file path}

Rules:
- Minimal regression fix only — no refactors, no new features
- Run: npm run test -- {specific file if supported} or full npm run test
- Do NOT commit
- Do NOT disable tests without operator approval
- Do NOT spawn Task workers or subagents (leaf worker only)

Report: root cause, files touched, test result.
```

Parameters: `subagent_type: generalPurpose`, `run_in_background: true`

## Audit checklist

- [ ] `npm run test` — capture pass/fail count and first 3 failures
- [ ] If test green: `npm run build`
- [ ] If build green: `npm run lint` (optional same iteration)
- [ ] Classify failures: lint | test | build | flaky
- [ ] Map each failure to owning lane (defer product gaps to that lane)
- [ ] Track consecutive green iterations (need 2 for stop)

## File ownership

- Any file implicated by failing output
- `tests/**` (primary)

## Stop conditions

- **`npm run test` 0 failures for 2 consecutive meta ticks** → log "green", stop
- `npm run build` succeeds at stop
- 1 iteration or 30 min → stop, log remaining failures (meta re-invokes)
- All failures require operator action → log blocker

## Conflict avoidance

QA spawns fix regressions only. Product gaps → log and recommend owning lane (UI, backend, etc.).

## Related

- [grails-orchestrator-lanes.md](../../docs/integrations/grails-orchestrator-lanes.md)
- [orchestrator-runs/README.md](../../docs/integrations/orchestrator-runs/README.md)
- `scripts/orchestrator/run-qa-lane.md`
