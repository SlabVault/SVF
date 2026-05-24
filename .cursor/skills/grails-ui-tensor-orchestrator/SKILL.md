---
name: grails-ui-tensor-orchestrator
description: >-
  Continuous UI orchestrator for GRAILS /trade Tensor.trade parity. Browser-crawls
  tensor.trade via cursor-ide-browser MCP, compares to GRAILS components, spawns up
  to 5 background fix tasks per iteration, loops 1 time per meta tick. Use for trade desk UX
  shell, collection desk, item detail, portfolio layout gaps.
---

# GRAILS UI / Tensor parity orchestrator

## Purpose

Match GRAILS `/trade` to [tensor.trade](https://www.tensor.trade/) product layout and interactions. GRAILS skin (`#641ae6`, dark desk) — not Tensor cyan template.

**Reference skill:** [tensor-tradesite-parity](../tensor-tradesite-parity/SKILL.md) — design tokens, page templates, component catalog.

## Continuous loop

**Default:** 1 iteration (`LANE_ITERATIONS`) per invocation, or stop at 30 minutes elapsed. Meta re-invokes on next tick.

**Concurrency:** [orchestrator-concurrency.md](../../docs/integrations/orchestrator-concurrency.md) — max **5** spawns/iteration, **24** global fix workers, never spawn meta orchestrator.

```
LOOP (1 iteration):
  1. AUDIT — browser crawl tensor.trade OR checklist from docs if MCP blocked
  2. LOG — append to docs/integrations/orchestrator-runs/ui-{YYYY-MM-DD}.md
  3. SPAWN — up to 5 Task workers (generalPurpose, run_in_background: true)
  4. INLINE — 1–5 line CSS/copy fixes
  5. DO NOT WAIT for workers — keep crawling
  6. If global cap reached → log cap reached, skip spawns
  7. Footer: spawned count, remaining gaps, recommend next lane
```

## Browser audit (cursor-ide-browser MCP)

1. `browser_navigate` → `https://www.tensor.trade/`
2. Snapshot homepage: nav, hero, CARDS|TABLE, toolbar, footer ticker
3. Navigate collection desk (e.g. `/trade/collector_crypt`) — trade panel, filters, stats ribbon, tabs, grid, activity
4. Navigate item page — commerce stack, tabs
5. Compare each region to GRAILS files in [tensor-tradesite-parity](../tensor-tradesite-parity/SKILL.md) catalog
6. Update gap table in [tensor-tradesite-crawl-2026-05-21.md](../../docs/integrations/tensor-tradesite-crawl-2026-05-21.md)

## Spawn template

```
Title: UI parity — {region} — {narrow fix}

Prompt:
You are a GRAILS UI fix worker for SlabVaultFi (c:\Users\amars\Desktop\SVF).

Gap: {tensor.trade behavior} vs GRAILS {component/file}
Target files: {components/trade/... explicit paths}
Primary test: {one test file, e.g. tests/trade-*.test.ts}

Design rules:
- Use .trade-layout tokens (#111314, #641ae6) — NO vault amber, NO tensor cyan CTAs
- Match region widths: trade panel ~200px, filters ~224px, activity ~280px
- Wallet-gate tx buttons only; browse paths stay public

Rules:
- Minimal diff; one behavior/region per task
- Do NOT touch ingest (lib/partner-listings.ts) or tx routes unless gap is button wiring only
- Do NOT spawn M5 cert compare or M6 multichain
- Run primary test when done
- Do NOT commit
- Do NOT spawn Task workers or subagents (leaf worker only)

Report: files touched, test result, checklist item closed (if any).
```

Parameters: `subagent_type: generalPurpose`, `run_in_background: true`

## Audit checklist

- [ ] Browser crawl: `/`, `/trade/{collection}`, item page (or doc fallback)
- [ ] [tensor-tradesite-copy-checklist.md](../../docs/integrations/tensor-tradesite-copy-checklist.md) P0 items
- [ ] Region widths and tabs vs parity skill tables
- [ ] `.trade-layout` wrapper on all `/trade/*` routes
- [ ] Stats ribbon, footer ticker, grid toolbar, trait filter URL sync
- [ ] Venue badge on listing tiles
- [ ] OFFERS/ORDERS stubs labeled honestly
- [ ] No vault-amber / grails-purple on trade routes

## File ownership

- `app/trade/**`, `components/trade/**`
- `app/globals.css` (`.trade-layout` only)
- `docs/integrations/tensor-tradesite-*.md`

## Stop conditions

- Copy checklist P0 gaps = 0 for **2 consecutive iterations** → log "parity green (P0)"
- 1 iteration or 30 min → stop (meta re-invokes)
- Browser MCP unavailable → audit from docs only; log blocker

## Conflict avoidance

UI lane owns layout/CSS. Do not edit backend ingest or on-chain tx builders. Segment lane defers layout to this lane.

## Anti-spawn

Do **not** spawn for: M5 cert-unified compare, M6 multichain ingest, fake floor/vol data, full portfolio without wallet screenshots.

## Related

- [grails-orchestrator-lanes.md](../../docs/integrations/grails-orchestrator-lanes.md)
- `scripts/orchestrator/run-ui-lane.md`
