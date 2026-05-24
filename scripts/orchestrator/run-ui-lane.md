# UI / Tensor parity lane orchestrator — agent prompt

**Load skills:** `.cursor/skills/grails-ui-tensor-orchestrator/SKILL.md` + `.cursor/skills/tensor-tradesite-parity/SKILL.md`  
**Log to:** `docs/integrations/orchestrator-runs/ui-{YYYY-MM-DD}.md`  
**Concurrency:** [orchestrator-concurrency.md](../../docs/integrations/orchestrator-concurrency.md)  
**Repo:** `c:\Users\amars\Desktop\SVF`

---

You are the **GRAILS UI / Tensor parity lane orchestrator**. Run **1 iteration** (`LANE_ITERATIONS`) or until **30 minutes** elapsed. **Spawn up to 5 fix workers — do not stop after the first spawn.**

## Priority focus (M + P)

**Milestone:** **M2** — Segment 3 trade desk UX shell (tensor.trade parity on real M1 data).  
**Backlog (P1/P2 UX + INT):** P1-UX-12–14, P2-INT-T06–T08, P2-INT-T12, P2-INT-T17 (activity tab), P2-INT-T19, copy checklist P0/P1 gaps.  
**Skip:** M5 cert compare UI, M6 multichain, homepage/`/` redesign.

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

1. **AUDIT** — Browser crawl [tensor.trade](https://www.tensor.trade/) via **cursor-ide-browser** MCP (`CallMcpTool`). Compare to GRAILS `/trade` files. Fallback: copy checklist + crawl doc if MCP blocked.
2. **LOG** — Append to `ui-{date}.md`; update crawl doc gap table.
3. **SPAWN** — Up to **5** Task workers, one UI gap each (`generalPurpose`, `run_in_background: true`).
4. **INLINE** — 1–5 line CSS/copy fixes.
5. **DO NOT WAIT** for workers — keep crawling next region/page.
6. **Iteration footer** — spawned count, remaining gaps, recommend next lane.

## Browser MCP workflow

- `browser_navigate` → tensor.trade homepage, collection desk, item page
- `browser_snapshot` + screenshot per major region
- Map gaps to GRAILS component files from parity skill

## Stop conditions

- Copy checklist **P0 gaps = 0 for 2 consecutive meta ticks** → log parity green, stop.
- 1 iteration or 30 min → stop (meta re-invokes on next tick).
- Browser MCP unavailable → doc-only audit; log blocker.
- Global fix-worker cap reached → log `cap reached`, skip remaining spawns.

## Rules

- Template purple `#641ae6` — NOT tensor cyan CTAs.
- Do NOT spawn M5 cert compare or M6 multichain.
- Do NOT edit ingest or tx route internals.
- Do NOT commit unless operator approved.

## Start now

Execute iteration 1 immediately. End after 1 iteration or stop conditions met.
