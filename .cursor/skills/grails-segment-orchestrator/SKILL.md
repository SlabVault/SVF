---
name: grails-segment-orchestrator
description: >-
  Continuous orchestrator for GRAILS step-by-step plan segments M0–M6. Reads
  grails-step-by-step-plan.md, works ONE current segment per invocation, spawns
  up to 5 background fix tasks per iteration, loops 1 time per meta tick. Use when advancing
  milestone segments sequentially without parallel trade-lane conflicts.
---

# GRAILS Segment orchestrator

## Purpose

Advance [docs/integrations/grails-step-by-step-plan.md](../../docs/integrations/grails-step-by-step-plan.md) one segment at a time. **Does not replace human segment review** — read current segment, work only its acceptance criteria and key files.

## Continuous loop

**Default:** 1 iteration (`LANE_ITERATIONS`) per invocation, or stop at 30 minutes elapsed. Meta re-invokes on next tick.

**Concurrency:** [orchestrator-concurrency.md](../../docs/integrations/orchestrator-concurrency.md) — max **5** spawns/iteration, **24** global fix workers, never spawn meta orchestrator.

```
LOOP (1 iteration):
  1. AUDIT — read plan; identify current segment (first with unchecked acceptance criteria)
  2. LOG — append to docs/integrations/orchestrator-runs/segment-{YYYY-MM-DD}.md
  3. SPAWN — up to 5 Task workers (generalPurpose, run_in_background: true), one gap each
  4. INLINE — trivial doc/checkbox updates (1–5 lines)
  5. DO NOT WAIT for workers — next audit item
  6. If global cap reached → log cap reached, skip spawns
  7. Footer: spawned count, remaining gaps, recommend next lane
```

## Spawn template

Use Task tool for each gap:

```
Title: Segment {N} — {narrow fix title}

Prompt:
You are a GRAILS segment fix worker for SlabVaultFi (c:\Users\amars\Desktop\SVF).

Segment: {N} — {segment name} (M{milestone})
Gap: {one acceptance criterion or key-file gap}
Target files: {explicit paths from plan Key files}
Primary test: {one test file to run after fix}

Rules:
- Minimal diff only; match existing conventions
- Run the primary test file when done
- Do NOT commit, touch secrets, or deploy mainnet
- Do NOT start Segment N+1 work
- Do NOT edit files owned by UI lane (layout) unless this gap is wiring only
- Do NOT spawn Task workers or subagents (leaf worker only)

Report: files touched, test result, whether plan checkbox can be marked done.
```

Parameters: `subagent_type: generalPurpose`, `run_in_background: true`

## Audit checklist

- [ ] Read `docs/integrations/grails-step-by-step-plan.md` — which segment is current?
- [ ] List unchecked acceptance criteria for current segment only
- [ ] Verify dependencies (prior segments marked done)
- [ ] Check key files exist and match plan scope
- [ ] Run `npm run test` — note failures in current segment scope only
- [ ] Cross-check `docs/integrations/m-milestone-status.md` for drift
- [ ] Identify conflicts with active UI/backend/on-chain lanes (defer if overlap)

## File ownership

- `docs/integrations/grails-step-by-step-plan.md` (status updates)
- Segment key files from plan table only
- **Avoid:** parallel layout work on `components/trade/*` when UI lane active

## Stop conditions

- All acceptance criteria for current segment checked → log "segment complete", **stop**, recommend human review before advancing segment number
- 1 iteration or 30 min → stop, log remaining criteria (meta re-invokes)
- Unchecked criteria require operator action (API keys, staging wallet) → log blocker, stop spawns for those items

## Conflict avoidance

Segment lane owns sequential M3+ implementation. Other lanes run in parallel via separate invocations. If UI lane owns a layout file, segment lane spawns data/wiring only or defers.

## Related

- [grails-orchestrator-lanes.md](../../docs/integrations/grails-orchestrator-lanes.md)
- `scripts/orchestrator/run-segment-lane.md`
