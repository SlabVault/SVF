# Meta orchestrator — parallel lanes (all 6 each tick)

**Focus:** M2–M5 milestones + P0–P2 backlog (skip M0/M1 done work) — see [meta-{date} focus matrix](../../docs/integrations/orchestrator-runs/meta-2026-05-22.md#mp-focus-matrix)  
**Repo:** `c:\Users\amars\Desktop\SVF`  
**Concurrency:** [orchestrator-concurrency.md](../../docs/integrations/orchestrator-concurrency.md)

---

You are the **GRAILS meta orchestrator**. Each invocation spawns **all six lane orchestrators in parallel**. Meta re-invokes on schedule; each lane runs **1 iteration** per tick.

## Hard limits

| Constant | Value |
|----------|-------|
| Lanes per tick | **6** (all lanes, parallel) |
| Lane orchestrator iterations | **1** (`LANE_ITERATIONS`) per lane per tick |
| Fix workers per lane | Up to **5** per iteration (`PER_LANE_MAX_PER_ITERATION`) |
| Global fix-worker cap | **24** repo-wide (`GLOBAL_MAX_CONCURRENT_FIX_WORKERS`) |
| Fix workers from meta | **0** — lanes own fix spawns |

### NEVER

- Lane orchestrators must **never** spawn this meta script again.
- Meta must **not** spawn fix workers directly — only lane orchestrators.
- Fix workers must **not** call Task / spawn subagents (leaf nodes only).

## Spawn all six lane orchestrators

Launch **6** Task workers (`generalPurpose`, `run_in_background: true`) — one per lane:

| Lane | Read and execute |
|------|------------------|
| Segment | `scripts/orchestrator/run-segment-lane.md` + `grails-segment-orchestrator` skill |
| UI | `scripts/orchestrator/run-ui-lane.md` + `grails-ui-tensor-orchestrator` skill |
| Backend | `scripts/orchestrator/run-backend-lane.md` + `grails-backend-orchestrator` skill |
| On-chain | `scripts/orchestrator/run-onchain-lane.md` + `grails-onchain-orchestrator` skill |
| Security | `scripts/orchestrator/run-security-lane.md` + `grails-security-orchestrator` skill |
| QA | `scripts/orchestrator/run-qa-lane.md` + `grails-qa-orchestrator` skill |

Each spawned lane orchestrator must:

- Run **1 iteration** (`LANE_ITERATIONS`)
- Log to `docs/integrations/orchestrator-runs/{lane}-{date}.md`
- Spawn up to **5** fix workers (`PER_LANE_MAX_PER_ITERATION`)
- If global cap **≥ 24** in-flight fix workers → log `cap reached`, skip spawns
- Respect per-lane budget: `min(5, 24 - in_flight)`

## Meta log

Append to `docs/integrations/orchestrator-runs/meta-{YYYY-MM-DD}.md`:

```markdown
# Meta orchestrator — {date}

## Tick — {timestamp}

**Lanes this tick:** segment, ui, backend, onchain, security, qa (all parallel)
**Meta tick count today:** {N} — run verify pass when N mod 6 = 0

Spawned 6 lane orchestrators (background). Global concurrency cap: 24 fix workers.

**Do NOT await** lane orchestrators. Meta job complete after spawns + log.
```

## Re-invoke for continuous coverage

Default schedule (45m):

```
/loop 45m Execute scripts/orchestrator/run-all-lanes.md — spawn all 6 GRAILS lane orchestrators in parallel (1 iteration, max 5 fix spawns/lane, global cap 24). Do NOT spawn fix workers from meta. Run verify pass every 6 ticks.
```

Faster MVP (30m):

```
/loop 30m Execute scripts/orchestrator/run-all-lanes.md — spawn all 6 GRAILS lane orchestrators in parallel (1 iteration, max 5 fix spawns/lane, global cap 24). Do NOT spawn fix workers from meta. Run verify pass every 6 ticks.
```

- Preferred for depth on one area: dedicated chat per lane with individual `run-*-lane.md`
- Every **6 meta ticks** (~3–4 h): run `scripts/orchestrator/run-verify-pass.md` before continuing

## Rules

- Do NOT commit unless operator approved.
- Meta orchestrator does not fix code directly — only spawns lane orchestrators.
- **STOP** meta `/loop` until verify pass is GREEN if operator has not verified last batch.

## Start now

Spawn **all 6** lane orchestrator Tasks in parallel, append meta log, note verify-pass due if tick count mod 6 = 0.
