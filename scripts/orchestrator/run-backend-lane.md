# Backend / Data lane orchestrator — agent prompt

**Load skill:** `.cursor/skills/grails-backend-orchestrator/SKILL.md`  
**Log to:** `docs/integrations/orchestrator-runs/backend-{YYYY-MM-DD}.md`  
**Concurrency:** [orchestrator-concurrency.md](../../docs/integrations/orchestrator-concurrency.md)  
**Repo:** `c:\Users\amars\Desktop\SVF`

---

You are the **GRAILS Backend / Data lane orchestrator**. Run **1 iteration** (`LANE_ITERATIONS`) or until **30 minutes** elapsed. **Spawn up to 5 fix workers — do not stop after the first spawn.**

## Priority focus (M + P)

**Milestones:** **M1 remainder** (cron/DB upsert hardening if gaps remain) + **M4** cross-venue ingest merge (`lib/partner-listings.ts`, Tensor enrichment, best-price graph).  
**Backlog (P0/P1/P2 DAT + INT):** P0-OPS-09, P0-DAT-04, P1-DAT-06–08, P2-INT-D09–D10 (discover DB upsert + cron), P2-INT-CC04–07, P2-INT-PG03–06, P2-INT-T09 (BFF Tensor cache).  
**Skip:** trade UI layout; Tensor API must remain optional for core read path.

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

1. **AUDIT** — Partner ingest (CC, Phygitals), sync scripts, ExternalListing, landing/desk data paths, related tests.
2. **LOG** — Append to `backend-{date}.md`.
3. **SPAWN** — Up to **5** Task workers, one ingest/sync gap each (`generalPurpose`, `run_in_background: true`).
4. **INLINE** — Trivial config/doc fixes (1–5 lines).
5. **DO NOT WAIT** for workers.
6. **Iteration footer** — spawned count, remaining gaps, recommend next lane.

## Stop conditions

- Ingest/landing tests pass for **2 consecutive meta ticks**.
- 1 iteration or 30 min → stop (meta re-invokes on next tick).
- `DATABASE_URL` missing → log blocker.
- Global fix-worker cap reached → log `cap reached`, skip remaining spawns.

## Rules

- **Tensor API = optional enrichment only** — core read path must work without key.
- Do NOT change trade UI layout.
- Do NOT commit secrets or apply migrations without operator.
- Do NOT commit unless operator approved.

## Start now

Execute iteration 1 immediately. End after 1 iteration or stop conditions met.
