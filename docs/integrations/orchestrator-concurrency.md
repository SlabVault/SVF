# GRAILS orchestrator concurrency limits

**Last updated:** 2026-05-22  
**Incident:** Operator ran meta + six lane orchestrators with legacy defaults; machine sustained **140+ simultaneous background Tasks** for ~4 hours.

---

## What went wrong (2026-05-21 run)

The documented “safe” ceiling was **10 fix workers × 5 iterations × 6 lanes = 60** spawns per meta tick — but that math only counted **leaf fix workers**, not nested orchestrators.

| Layer | Legacy default | Actual burst |
|-------|----------------|--------------|
| Meta (`run-all-lanes.md`) | 6 lane orchestrators **in parallel** | 6 long-running orchestrators |
| Each lane orchestrator | 5 iterations × up to 10 spawns | up to **50** fix workers per lane |
| Fix workers | Unrestricted | Some spawned **additional** Task workers |
| **Theoretical peak** | 60 | **6 × 50 = 300** fix workers + 6 orchestrators |

Nested spawning compounded: lane orchestrators did not await workers but kept spawning; fix workers sometimes spawned more Tasks. The host could not schedule or review output meaningfully.

**Lesson:** Treat concurrency as a **global budget**, not per-lane multiplication. Orchestrators are coordinators; fix workers are leaves.

---

## Strategy (2026-05-22 — parallel lanes, capped spawns)

Round-robin (one lane per 45m tick) was too slow for MVP. Meta now runs **all 6 lanes in parallel** each tick, with hard caps so burst stays bounded:

| Constant | Value | Meaning |
|----------|-------|---------|
| Lanes per meta tick | **6** (all lanes, parallel) | Meta spawns every lane orchestrator each invocation |
| `LANE_ITERATIONS` | **1** | One audit/spawn cycle per lane per meta tick |
| `PER_LANE_MAX_PER_ITERATION` | **5** | Max fix workers one lane may spawn in its single iteration |
| `GLOBAL_MAX_CONCURRENT_FIX_WORKERS` | **24** | Hard cap repo-wide (6 × 5); lanes defer if global full |
| Meta loop interval | **45m** default; **30m** optional for faster MVP | Re-invoke meta script on schedule |

**Per meta tick (bounded):** up to 6 lane orchestrators + up to **24** fix workers (not 140+).

---

## Hard limits (mandatory)

All lane run scripts (`.cursor/skills/grails-*-orchestrator/SKILL.md`, `scripts/orchestrator/run-*-lane.md`) and the meta script **must** enforce:

| Constant | Value | Meaning |
|----------|-------|---------|
| `GLOBAL_MAX_CONCURRENT_FIX_WORKERS` | **24** | Max fix workers **across the entire repo** at once |
| `PER_LANE_MAX_PER_ITERATION` | **5** | Max fix workers one lane may spawn in a single iteration |
| `LANE_ITERATIONS` | **1** | One loop iteration per lane invocation; meta re-invokes on next tick |
| Meta parallelism | **6 lane orchestrators** (all lanes each tick) | Meta spawns all lanes in parallel |

### NEVER rules

1. **Lane orchestrator → meta orchestrator** — A lane must never spawn `run-all-lanes.md` or another meta orchestrator.
2. **Fix worker → Task worker** — Fix workers are **leaf nodes**. They edit code and report; they do **not** call the Task tool or spawn subagents.
3. **Unbounded background** — If global cap is reached, log `cap reached (concurrency cap)` and **skip remaining spawns** until next invocation.

### Before each spawn batch

Orchestrators should estimate in-flight fix workers from today's journals (`docs/integrations/orchestrator-runs/*-{date}.md` spawned tables). If **≥ 24** rows marked `spawned (not awaited)` without completion notes, **do not spawn** — log `cap reached`, inline trivial fixes only or stop.

Each lane must also respect its own remaining budget: `min(PER_LANE_MAX_PER_ITERATION, GLOBAL_MAX - in_flight)`.

---

## Meta orchestrator (`run-all-lanes.md`)

- **All 6 lanes every tick** — spawn segment, ui, backend, onchain, security, and qa lane orchestrators **in parallel**.
- Each spawned lane runs **1 iteration** with up to **5** fix workers.
- **Do not await** lane orchestrators; meta job completes after spawns + meta log.
- **Verify pass:** run `scripts/orchestrator/run-verify-pass.md` every **6 meta ticks** (~3–4 hours at 30–45m interval) before continuing loops.

### Meta `/loop` prompt (operator restarts manually)

Default (45m):

```
/loop 45m Execute scripts/orchestrator/run-all-lanes.md — spawn all 6 GRAILS lane orchestrators in parallel (1 iteration, max 5 fix spawns/lane, global cap 24). Do NOT spawn fix workers from meta. Run verify pass every 6 ticks.
```

Faster MVP (30m):

```
/loop 30m Execute scripts/orchestrator/run-all-lanes.md — spawn all 6 GRAILS lane orchestrators in parallel (1 iteration, max 5 fix spawns/lane, global cap 24). Do NOT spawn fix workers from meta. Run verify pass every 6 ticks.
```

---

## Safe operating procedure

1. **STOP** all-lanes `/loop` until a verify pass is **GREEN** — see `scripts/orchestrator/run-verify-pass.md`.
2. Run verify pass **once** (no fix-worker spawns unless test/build fail).
3. Resume meta `/loop` (all 6 lanes parallel) or one dedicated chat per lane with the same caps.
4. Re-run verify pass every **6 meta ticks** and after large batches before merging.

---

## Related

- [grails-orchestrator-lanes.md](./grails-orchestrator-lanes.md) — lane ownership and loop protocol
- [orchestrator-runs/README.md](./orchestrator-runs/README.md) — journal format
- `scripts/orchestrator/run-verify-pass.md` — post-run readiness check
