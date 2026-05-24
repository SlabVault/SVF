# Cursor SDK orchestrator

Local [Cursor TypeScript SDK](https://cursor.com/docs/api/sdk/typescript) scripts for repo audits, parallel work lanes, and backlog-driven orchestration. See [autonomous-orchestration runbook](../../docs/runbooks/autonomous-orchestration.md).

## Setup

```bash
npm install --save-dev @cursor/sdk

# API key from https://cursor.com/dashboard/cloud-agents
# Add to .env (never commit real keys):
CURSOR_API_KEY=cursor_your_key_here
```

## SDK scripts (Agent.prompt)

| npm script | What it does |
|------------|--------------|
| `npm run cursor:investigate` | One-shot progress audit vs backlog + integration docs |
| `npm run cursor:parallel` | Three parallel lanes (Tensor UI, on-chain, qa:ci) |
| `npm run cursor:parallel -- --lanes=tensor-ui,onchain` | Subset of lanes |

### Copy-paste

```bash
# Progress audit (requires CURSOR_API_KEY)
CURSOR_API_KEY=cursor_... npx tsx scripts/cursor-sdk/investigate-progress.ts

# All parallel lanes
CURSOR_API_KEY=cursor_... npx tsx scripts/cursor-sdk/parallel-lanes.ts

# Single lane
CURSOR_API_KEY=cursor_... npx tsx scripts/cursor-sdk/parallel-lanes.ts --lanes=qa-ci
```

### Parallel lanes (`cursor:parallel`)

| Lane ID | Focus | Primary docs / paths |
|---------|--------|----------------------|
| `tensor-ui` | `/trade` UI vs Tensor.trade audit gaps | `docs/integrations/tensor-tradesite-ux-audit.md`, `app/trade/**` |
| `onchain` | Read/write Tensor + broker stack gaps | `docs/integrations/onchain-trade-stack.md`, `lib/onchain/**` |
| `qa-ci` | Fix `npm run qa:ci` (lint, test, build) | CI-equivalent local gate |

Lanes are independent `Agent.prompt` calls — safe to run in parallel when touching different areas. The qa-ci lane may edit files; review diffs before commit.

## Backlog orchestration (no API key)

| npm script | What it does |
|------------|--------------|
| `npm run orchestrate:investigate` | Progress JSON (git + backlog stats) |
| `npm run orchestrate:lanes` | Group open backlog into parallel lanes |
| `npm run orchestrate:next` | Next task JSON + agent prompt |
| `npm run orchestrate:dry-run` | Next trade lane task + prompt (no API) |
| `npm run orchestrate:dispatch` | Run local `Agent.prompt` for next trade task |
| `npm run orchestrate:loop` | One dry-run tick (cron-friendly) |
| `npm run orchestrate:loop:run` | Long loop with `--dispatch` |

```bash
npm run orchestrate:investigate
npm run orchestrate:lanes
npm run orchestrate:next -- --lane trade
npm run orchestrate:dispatch -- --lane trade
```

## SDK patterns (`shared.ts`)

- **Explicit local cwd** — `REPO_ROOT` resolved from script path, not shell cwd
- **`Agent.prompt`** — one-shots auto-dispose; no `asyncDispose` leak
- **`CursorAgentError` vs `result.status`** — exit 1 vs 2
- **`settingSources: []`** — no ambient Cursor settings in automation

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | All lane(s) finished successfully |
| `1` | Startup failure (`CursorAgentError` — auth, config, network) |
| `2` | Agent started but run failed (`result.status === "error"`) |

## Policy

| Variable | Effect |
|----------|--------|
| `ORCHESTRATE_ALLOW_COMMIT=1` | Agent may commit (orchestrate scripts) |
| `CURSOR_API_KEY` | Required for `cursor:*` and `--dispatch` |
