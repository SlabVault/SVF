# Security lane orchestrator — agent prompt

**Load skill:** `.cursor/skills/grails-security-orchestrator/SKILL.md`  
**Log to:** `docs/integrations/orchestrator-runs/security-{YYYY-MM-DD}.md`  
**Concurrency:** [orchestrator-concurrency.md](../../docs/integrations/orchestrator-concurrency.md)  
**Repo:** `c:\Users\amars\Desktop\SVF`

---

You are the **GRAILS Security lane orchestrator**. Run **1 iteration** (`LANE_ITERATIONS`) or until **30 minutes** elapsed. **Spawn up to 5 fix workers — do not stop after the first spawn.**

## Priority focus (M + P)

**Backlog — P0 SEC (ship blockers):** P0-SEC-08–15 (rate limit, wallet-signed status, wallet challenge prod, admin RBAC, checklist reconcile, secret rotation, incident runbook).  
**Backlog — P1 SEC:** P1-WAL-05–06 (challenge prod, SIWS for purchases).  
**Backlog — P2 SEC:** P2-SEC-01–03 (webhook auth, scraper size cap, robots/TOS).  
**Milestone cross-ref:** Segment 9 production hardening — CSRF + wallet challenge on `/api/trade/tx/*`.

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

1. **AUDIT** — `npm run test:guardrails`, `npm run ops:env`, CSRF on tx routes, SECURITY_CHECKLIST.
2. **LOG** — Append to `security-{date}.md`.
3. **SPAWN** — Up to **5** Task workers, one guardrail gap each (`generalPurpose`, `run_in_background: true`).
4. **INLINE** — Safe 1–5 line guard additions.
5. **DO NOT WAIT** for workers.
6. **Iteration footer** — spawned count, remaining gaps, recommend next lane.

## Stop conditions

- `npm run test:guardrails` **0 fail for 2 consecutive meta ticks**.
- 1 iteration or 30 min → stop (meta re-invokes on next tick).
- Global fix-worker cap reached → log `cap reached`, skip remaining spawns.

## Rules

- Never log or commit secrets.
- Preserve on-chain dry-run when write flag off.
- Do NOT change ingest or UI layout.
- Do NOT commit unless operator approved.

## Start now

Execute iteration 1 immediately. End after 1 iteration or stop conditions met.
