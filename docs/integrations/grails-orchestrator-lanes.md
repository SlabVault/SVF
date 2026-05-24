# GRAILS orchestrator lanes

**Last updated:** 2026-05-22  
**Purpose:** Six **continuous** orchestrator lanes that audit, log gaps, spawn fix workers, and loop without user intervention. Each lane owns a slice of GRAILS; lanes run in **separate Cursor chats** (or via `/loop` + run scripts).

**Concurrency:** See [orchestrator-concurrency.md](./orchestrator-concurrency.md) — mandatory global caps.

---

## Continuous loop protocol (all lanes)

Every lane orchestrator follows this protocol on each invocation:

```
LOOP (default 1 iteration per invocation, or until 30 min elapsed):
  1. AUDIT — lane-specific checklist (read docs + code OR browser for UI lane)
  2. LOG gaps to docs/integrations/orchestrator-runs/{lane}-{date}.md
  3. SPAWN — up to 5 background Task workers, one gap each, run_in_background: true
  4. INLINE — trivial fixes (1–5 lines) immediately in orchestrator
  5. DO NOT WAIT for spawn workers — continue to next audit item
  6. If global cap reached → log "cap reached", skip remaining spawns
  7. End iteration log with: spawned count, remaining gaps, recommend next lane
```

**Hard rules (all lanes):**

| Rule | Detail |
|------|--------|
| Max spawns | **5** fix tasks per iteration (`PER_LANE_MAX_PER_ITERATION`) |
| Iterations | **1** per invocation (`LANE_ITERATIONS`); meta re-invokes on next tick |
| Global cap | **24** concurrent fix workers repo-wide (`GLOBAL_MAX_CONCURRENT_FIX_WORKERS`) |
| No blocking | Never `await` spawned workers; keep auditing |
| Spawn shape | `Task` tool, `subagent_type: generalPurpose`, `run_in_background: true` |
| Fix scope | One discrete gap, explicit target files, one primary test file |
| Leaf workers | Fix workers **never** spawn Task workers |
| Meta ban | Lane orchestrators **never** spawn `run-all-lanes.md` |
| Approval gates | No commits, secrets, or mainnet without operator approval |
| Conflict avoidance | See per-lane file ownership; never two lanes edit same file in one iteration |

**Run scripts:** `scripts/orchestrator/run-*-lane.md` — paste into Cursor chat or arm with `/loop`.

**Skills:** `.cursor/skills/grails-*-orchestrator/SKILL.md` — load at start of each lane invocation.

**Journal:** `docs/integrations/orchestrator-runs/` — one log file per lane per day.

---

## Lane overview

| # | Lane | Skill | Run script | Primary focus |
|---|------|-------|------------|---------------|
| 1 | Segment | `grails-segment-orchestrator` | `run-segment-lane.md` | M0–M6 step-by-step plan, one segment per iteration |
| 2 | UI / Tensor parity | `grails-ui-tensor-orchestrator` | `run-ui-lane.md` | Browser crawl tensor.trade → GRAILS `/trade` fixes |
| 3 | Backend / Data | `grails-backend-orchestrator` | `run-backend-lane.md` | CC/Phygitals ingest, sync, Postgres — no Tensor API hard dep |
| 4 | On-chain / TCM | `grails-onchain-orchestrator` | `run-onchain-lane.md` | Tensor Foundation SDKs, BFF tx routes, broker PDA |
| 5 | Security | `grails-security-orchestrator` | `run-security-lane.md` | CSRF, env leaks, write-route validation |
| 6 | QA / Debug | `grails-qa-orchestrator` | `run-qa-lane.md` | `npm test` / `npm run build` → spawn fix on failure |

**Meta orchestrator:** `run-all-lanes.md` — **all 6 lanes per tick** (parallel); global cap **24** fix workers. See [orchestrator-concurrency.md](./orchestrator-concurrency.md).

---

## Lane 1 — Segment

**Goal:** Advance [grails-step-by-step-plan.md](./grails-step-by-step-plan.md) one segment at a time. Does **not** replace human segment review — orchestrator reads current segment and works **only** that segment each invocation.

**File ownership:**

- `docs/integrations/grails-step-by-step-plan.md` (status checkboxes, segment notes)
- Segment-scoped files per plan (see segment Key files table)
- **Avoid:** parallel edits to `app/trade/*`, `components/trade/*` while UI lane is active on same routes

**Spawn rules:**

- Max **5** fix tasks per iteration
- One acceptance criterion or key-file gap per spawn
- Do not spawn M5 cert-compare or M6 multichain work unless current segment is 6 or 7
- Trivial doc checkbox updates: inline, no spawn

**Loop termination:**

- Current segment acceptance criteria all checked → log "segment complete", recommend human review before advancing
- 1 iteration or 30 min → stop; log remaining criteria (meta re-invokes on next tick)
- Operator sets next segment in plan before next invocation

**Conflict avoidance:**

- Segment lane owns **sequential** M3+ implementation; other lanes run in parallel via **separate invocations** on non-overlapping files
- If UI lane and Segment lane both target same trade component, Segment lane defers to UI lane for layout parity; Segment lane takes data/wire spawns only

---

## Lane 2 — UI / Tensor parity

**Goal:** Match GRAILS `/trade` to tensor.trade product layout and interactions (not vendor template skin). Browser crawl drives gap discovery.

**File ownership:**

- `app/trade/**`
- `components/trade/**`
- `app/globals.css` (`.trade-layout` tokens only)
- `docs/integrations/tensor-tradesite-*.md`
- **Avoid:** `lib/partner-listings.ts`, `app/api/trade/tx/*`, ingest scripts

**Spawn rules:**

- Max **5** fix tasks per iteration
- Use `cursor-ide-browser` MCP: navigate tensor.trade, snapshot, compare to GRAILS files
- One region/behavior gap per spawn (see [tensor-tradesite-parity skill](../../.cursor/skills/tensor-tradesite-parity/SKILL.md))
- Do not spawn M5 cert-unified compare or M6 multichain ingest
- CSS/copy 1–5 line fixes: inline

**Loop termination:**

- Copy checklist P0 gaps = 0 for 2 consecutive iterations → log "parity green (P0)"
- 1 iteration or 30 min → stop; log open P1/P2 gaps (meta re-invokes on next tick)
- Browser MCP unavailable → log blocker, skip crawl, audit checklist from docs only

**Conflict avoidance:**

- Do not edit backend ingest or tx routes
- Coordinate with Segment lane: UI lane owns layout/CSS; Segment owns segment acceptance wiring

---

## Lane 3 — Backend / Data

**Goal:** Keep partner ingest alive — CC, Phygitals, sync cron, Postgres `ExternalListing`, landing/desk data paths. Tensor API is **optional enrichment only**.

**File ownership:**

- `lib/partner-listings.ts`
- `lib/partner-ingest-adapter.ts`
- `lib/external-listings-sync.ts`
- `lib/phygitals-listings.ts`
- `lib/trade-landing.ts`
- `lib/data-sync.ts`
- `scripts/sync-external-listings.ts`
- `app/api/sync/**`
- `prisma/schema.prisma` (ExternalListing only)
- `tests/*partner*`, `tests/*ingest*`, `tests/*landing*`
- **Avoid:** `components/trade/*` layout, on-chain tx builders

**Spawn rules:**

- Max **5** fix tasks per iteration
- One ingest/sync/test gap per spawn
- Never require `TENSOR_API_KEY` for core read path to work
- Schema migrations: spawn with `approvalGates: [commit, mainnet]` note — do not apply without operator

**Loop termination:**

- `npm run test` passes all ingest/landing tests for 2 consecutive iterations
- `sync:discover` dry-run documented green in log
- 1 iteration or 30 min → stop (meta re-invokes on next tick)

**Conflict avoidance:**

- Backend lane does not change trade UI layout (`components/trade/*` desk shell); data props/types only
- On-chain lane owns `lib/onchain/*`; backend lane may read collection registry only

---

## Lane 4 — On-chain / TCM

**Goal:** Tensor Foundation SDK integration — BFF tx routes, wallet sign flow, broker fee PDA, staging write gate.

**File ownership:**

- `lib/onchain/**`
- `app/api/trade/tx/**`
- `components/trade/buy-now-modal.tsx`
- `components/trade/tensor/use-tensor-*.ts`
- `docs/trade-staging-checklist.md`
- `docs/integrations/onchain-trade-stack.md`
- **Avoid:** ingest adapters, marketing pages, vault amber routes

**Spawn rules:**

- Max **5** fix tasks per iteration
- One tx type or SDK wiring gap per spawn
- Staging-only writes; production `TENSOR_TRADE_WRITE_ENABLED` stays false unless operator approves
- Broker PDA / mainnet: log + stop; do not spawn auto-fix

**Loop termination:**

- Staging checklist items for current segment all checked
- Tx route tests green for 2 consecutive iterations
- 1 iteration or 30 min → stop (meta re-invokes on next tick)

**Conflict avoidance:**

- Security lane owns CSRF on tx routes — on-chain lane spawns functional fixes only; security lane adds auth guards
- Do not modify partner ingest merge logic (Backend lane)

---

## Lane 5 — Security

**Goal:** Harden write paths and secrets — CSRF, env leak scans, write-route validation, rate limits.

**File ownership:**

- `app/api/trade/tx/**` (auth/validation layers)
- `lib/http-auth.ts`, CSRF helpers
- `scripts/check-env-contract.ts`
- `docs/SECURITY_CHECKLIST.md`
- `tests/api-*-guardrails.test.ts`, `tests/http-auth.test.ts`
- **Avoid:** feature UI, ingest business logic

**Spawn rules:**

- Max **5** fix tasks per iteration
- One vulnerability or guardrail gap per spawn
- Never log or commit secret values
- Env contract failures: spawn fix or document required operator action

**Loop termination:**

- `npm run test:guardrails` 0 fail for 2 consecutive iterations
- `npm run ops:env` clean (or only documented expected warnings)
- 1 iteration or 30 min → stop (meta re-invokes on next tick)

**Conflict avoidance:**

- Add guards without breaking on-chain lane dry-run tests — coordinate via shared test files
- Do not change ingest data shapes

---

## Lane 6 — QA / Debug

**Goal:** Keep CI green — run `npm run test`, `npm run build`, `npm run lint`; spawn targeted fixes on failure.

**File ownership:**

- Any file implicated by failing test/build output
- `tests/**`
- **Avoid:** drive product features; fix only what failures require

**Spawn rules:**

- Max **5** fix tasks per iteration
- One failing test file or build error per spawn
- Flaky tests: spawn with reproduce steps, do not disable without operator

**Loop termination:**

- `npm run test` 0 fail for **2 consecutive iterations** → log "green"
- `npm run build` succeeds
- 1 iteration or 30 min → stop (meta re-invokes on next tick); log remaining failures

**Conflict avoidance:**

- QA spawns are regression fixes only — no refactors
- Prefer minimal diff in file that owns the failing assertion

---

## Starting continuous loops

### Option A — One lane per chat (recommended)

Open **one** Cursor agent chat per lane for focused depth, or use meta `run-all-lanes.md` for all six in parallel. Paste the matching run script:

1. `scripts/orchestrator/run-segment-lane.md`
2. `scripts/orchestrator/run-ui-lane.md`
3. `scripts/orchestrator/run-backend-lane.md`
4. `scripts/orchestrator/run-onchain-lane.md`
5. `scripts/orchestrator/run-security-lane.md`
6. `scripts/orchestrator/run-qa-lane.md`

Each chat runs its lane's **1-iteration** loop independently; re-invoke or `/loop` for depth. Run verify pass every **6 meta ticks** when using meta orchestrator.

### Option B — `/loop` skill (single lane, recurring)

```
/loop 30m Read scripts/orchestrator/run-qa-lane.md and execute the QA lane orchestrator (1 iteration, max 5 fix spawns). Load .cursor/skills/grails-qa-orchestrator/SKILL.md. Do NOT stop after one spawn batch.
```

Repeat with other `run-*-lane.md` files in **separate chats** for focused depth.

### Option C — Meta orchestrator (all lanes parallel)

Paste `scripts/orchestrator/run-all-lanes.md` — spawns **all 6 lanes** each tick. Re-invoke on schedule:

```
/loop 45m Execute scripts/orchestrator/run-all-lanes.md — spawn all 6 GRAILS lane orchestrators in parallel (1 iteration, max 5 fix spawns/lane, global cap 24). Do NOT spawn fix workers from meta. Run verify pass every 6 ticks.
```

Use `/loop 30m` for faster MVP cadence. Run `run-verify-pass.md` every **6 meta ticks** (~3–4 hours).

### Option D — Verify pass (post-batch)

Paste `scripts/orchestrator/run-verify-pass.md` after orchestrator runs — readiness check without spawning fix workers.

### Option E — PowerShell + legacy SDK (supplement)

Existing `scripts/orchestrate-next.ps1` + `docs/runbooks/autonomous-orchestration.md` remain for backlog-driven work. **GRAILS lane orchestrators are the primary loop for trade milestone work.**

---

## Conflict matrix

| Files / area | Segment | UI | Backend | On-chain | Security | QA |
|--------------|---------|----|---------|----------|----------|-----|
| `app/trade/*` pages | segment scope | **owner** | read | read | — | fix only |
| `components/trade/*` | segment scope | **owner** | — | tx modals | — | fix only |
| `lib/partner-listings.ts` | — | — | **owner** | — | — | fix only |
| `app/api/trade/tx/*` | M3 scope | — | — | **owner** | guards | fix only |
| `lib/onchain/*` | M3 scope | — | — | **owner** | — | fix only |
| `tests/**` | segment tests | ui tests | ingest tests | tx tests | guardrails | **owner** |
| `docs/integrations/grails-step-by-step-plan.md` | **owner** | read | read | read | read | read |

**Rule:** If two lanes need the same file, higher-priority owner wins; other lane logs gap and skips spawn.

---

## Related docs

| Doc | Role |
|-----|------|
| [grails-step-by-step-plan.md](./grails-step-by-step-plan.md) | Segment lane source of truth |
| [tensor-tradesite-copy-checklist.md](./tensor-tradesite-copy-checklist.md) | UI lane gap list |
| [orchestrator-concurrency.md](./orchestrator-concurrency.md) | Global spawn limits and incident notes |
| [orchestrator-runs/README.md](./orchestrator-runs/README.md) | Log format |
| [autonomous-orchestration.md](../runbooks/autonomous-orchestration.md) | Legacy backlog orchestration |
