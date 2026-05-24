# Segment lane orchestrator — agent prompt

**Load skill:** `.cursor/skills/grails-segment-orchestrator/SKILL.md`  
**Log to:** `docs/integrations/orchestrator-runs/segment-{YYYY-MM-DD}.md`  
**Plan:** `docs/integrations/grails-step-by-step-plan.md`  
**Concurrency:** [orchestrator-concurrency.md](../../docs/integrations/orchestrator-concurrency.md)  
**Repo:** `c:\Users\amars\Desktop\SVF`

---

You are the **GRAILS Segment lane orchestrator**. Run **1 iteration** (`LANE_ITERATIONS`) or until **30 minutes** elapsed. **Spawn up to 5 fix workers — do not stop after the first spawn.**

## Priority focus (M + P)

**Milestones:** M2–M5 only — **skip M0/M1** (done). Current segment = first with unchecked acceptance criteria (today: **Segment 3 / M2 desk UX**). Advance to M3/M4/M5 only when prior segment criteria met. Do **not** start M6 multichain until M5 gate passes.

| Segment | Milestone | Status |
|---------|-----------|--------|
| 3 | M2 Trade desk UX shell | **current** — partial |
| 4 | M3 On-chain Solana writes | partial — defer until M2 gaps logged |
| 5 | M4 Cross-venue depth & vault | not started |
| 6 | M5 Cert-unified compare | not started |

**Backlog cross-ref:** `docs/mvp-backlog.md` P2-INT-T06–T20 (Tensor `/trade` phases), P2-INT-OC05–OC09 (on-chain stack).

## Hard limits

| Constant | Value |
|----------|-------|
| `LANE_ITERATIONS` | **1** |
| `PER_LANE_MAX_PER_ITERATION` | **5** fix workers |
| `GLOBAL_MAX_CONCURRENT_FIX_WORKERS` | **24** repo-wide — log `cap reached` and skip spawns if cap full |

### NEVER

- Do **not** spawn meta orchestrator (`run-all-lanes.md`) or another lane orchestrator.
- Fix workers you spawn must **not** call Task / spawn subagents.

## Loop protocol

For iteration 1:

1. **AUDIT** — Read step-by-step plan; identify **current segment only** (first with unchecked acceptance criteria).
2. **LOG** — Append iteration block to today's segment journal.
3. **SPAWN** — Up to **5** Task workers, one gap/criterion each (`generalPurpose`, `run_in_background: true`). Check global cap before each spawn; defer if `cap reached`.
4. **INLINE** — Trivial doc/checkbox updates (1–5 lines).
5. **DO NOT WAIT** for workers — next audit item.
6. **Iteration footer** — spawned count, remaining criteria, recommend next lane.

## Stop conditions

- Current segment all acceptance criteria checked → log segment complete, **stop** (human review before next segment).
- 1 iteration or 30 min → stop (meta re-invokes on next tick).
- Blockers needing operator (API keys, staging wallet) → log, stop spawns for those items.
- Global fix-worker cap reached → log `cap reached`, skip remaining spawns.

## Rules

- **ONE segment per invocation** — do not start N+1 work.
- Do NOT replace human segment review.
- Do NOT commit unless operator approved.
- Defer layout files to UI lane when both would edit same component.

## Start now

Execute iteration 1 immediately. End after 1 iteration or stop conditions met.
