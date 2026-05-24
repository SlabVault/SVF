# Autonomous Orchestration Runbook

Hands-off development for SlabVaultFi using Cursor `/loop`, local SDK scripts, and optional Cursor Automations. **Nothing in this runbook commits secrets or creates production automations without your explicit approval.**

---

## What you get

| Tool | Purpose |
|------|---------|
| `docs/STATUS.md` | Human + agent snapshot of lanes, integrations, blockers |
| `docs/mvp-backlog.md` | Prioritized task IDs (source of truth) |
| `npm run orchestrate:investigate` | Progress JSON (git + backlog stats) |
| `npm run orchestrate:lanes` | Parallel lane map for multi-agent work |
| `npm run orchestrate:next` | Next task JSON + agent prompt |
| `scripts/orchestrate-next.ps1` | Windows loop — emits `AGENT_LOOP_TICK` every 30 minutes |
| `@cursor/sdk` scripts | Optional `--dispatch` to run a local Cursor agent from CLI |

---

## Prerequisites

1. **Node.js** — same version used for the app (`npm ci` in repo root).
2. **Cursor API key** (optional, for `--dispatch` only):
   - Create at [cursor.com/dashboard/cloud-agents](https://cursor.com/dashboard/cloud-agents)
   - Copy to `.env` (never commit):
     ```bash
     CURSOR_API_KEY=cursor_...
     ```
   - `.env.example` documents the variable name only.
3. **Git** — orchestration reads branch/dirty state when available.

---

## Approval gates (mandatory)

Autonomous agents **must stop and ask** before:

| Gate | Examples | Override |
|------|----------|----------|
| **commit** | Any `git commit`, amend, or push unless you explicitly approved in the session | Set `ORCHESTRATE_ALLOW_COMMIT=1` in the agent environment |
| **secrets** | Writing `.env`, API keys, wallet seeds, `SERVER_WALLET_SECRET`, cron tokens | Never auto-override |
| **mainnet** | Anchor/program deploy to mainnet, production env changes, `migrate deploy` on prod DB | Never auto-override |

Scripts tag gates per task in `orchestrate:next` output (`approvalGates` array). Agents should treat `commit`, `secrets`, and `mainnet` as hard stops without operator sign-off.

---

## Quick start — hands-off mode (Windows)

### Step 1 — Install dependencies

```powershell
cd C:\Users\amars\Desktop\SVF
npm ci
```

### Step 2 — Configure API key (optional)

```powershell
copy .env.example .env
# Edit .env — add CURSOR_API_KEY only if using --dispatch
```

### Step 3 — Verify orchestration scripts

```powershell
npm run orchestrate:investigate
npm run orchestrate:lanes
npm run orchestrate:next
npm run test
```

### Step 4 — Start the 30-minute loop

In a dedicated terminal (leave running):

```powershell
.\scripts\orchestrate-next.ps1
```

One-shot tick (no background loop):

```powershell
.\scripts\orchestrate-next.ps1 -RunOnce
```

Filter to a lane:

```powershell
.\scripts\orchestrate-next.ps1 -Lane security -IntervalMinutes 30
```

### Step 5 — Arm Cursor `/loop` in the IDE

In Cursor chat, start a monitored loop that wakes on the PowerShell sentinel:

```
/loop 30m Execute the latest AGENT_LOOP_TICK prompt from the orchestrator terminal. Read docs/STATUS.md and docs/mvp-backlog.md. Implement one backlog item. Run npm run test. Do NOT commit unless I approved. Stop before secrets or mainnet changes.
```

**Important:** Run the prompt **once immediately** after arming `/loop`. The PowerShell script sleeps first, so the first `AGENT_LOOP_TICK` arrives after 30 minutes — avoiding a double-run on startup.

Alternative — IDE-only loop without PowerShell:

```
/loop 30m Read docs/STATUS.md and docs/mvp-backlog.md. Run npm run orchestrate:next. Implement the returned task. Run npm run test. Do NOT commit unless approved. Stop before secrets or mainnet.
```

---

## SDK scripts reference

All scripts live under `scripts/cursor-sdk/` and run via `tsx`.

### `orchestrate:investigate`

```powershell
npm run orchestrate:investigate
npm run orchestrate:investigate -- --pretty
npm run orchestrate:investigate -- --dispatch   # needs CURSOR_API_KEY
```

Outputs JSON: git snapshot, backlog counts by priority, top open items, STATUS.md section summary. Without `CURSOR_API_KEY`, returns the JSON snapshot only. `--dispatch` runs a one-shot local agent audit.

### `orchestrate:lanes`

```powershell
npm run orchestrate:lanes
npm run orchestrate:lanes -- --max 8
```

Default mode groups open TODO items into lanes (`security`, `ops`, `trade`, `product`, …). Use **one lane per parallel agent**; avoid two agents on `ops` or `security` without coordination.

SDK parallel investigation (requires `CURSOR_API_KEY`):

```powershell
npm run cursor:parallel
npm run cursor:parallel -- --lanes=tensor-ui,onchain
```

### `orchestrate:next`

```powershell
npm run orchestrate:next
npm run orchestrate:next -- --lane trade
npm run orchestrate:next -- --dispatch   # needs CURSOR_API_KEY
```

Picks the highest-priority open backlog item (optionally filtered by lane). Output includes:

- `task.id`, `task.title`, `task.prompt`
- `task.approvalGates`
- `orchestration.sentinel` = `AGENT_LOOP_TICK`

---

## PowerShell loop internals

`scripts/orchestrate-next.ps1`:

1. `cd` to repo root
2. Every N minutes (default 30), runs `npm run orchestrate:next --silent`
3. Prints: `AGENT_LOOP_TICK {"prompt":"...","task":{...}}`

Cursor agents with **monitored shell output** can regex-match `^AGENT_LOOP_TICK` and execute the embedded `prompt`.

Parameters:

| Flag | Default | Description |
|------|---------|-------------|
| `-IntervalMinutes` | 30 | Sleep between ticks |
| `-Lane` | (all) | Pass `--lane` to autonomous-loop |
| `-RunOnce` | off | Emit one tick and exit |

---

## Scheduled QA + backlog triage (MCP draft — review before save)

Queried **2026-05-21** via `cursor-backend-control` → `list_automations`: **0 automations** configured for the current user.

**Do not call `create_automation` until you review.** Use the prefill URLs below or regenerate with `build_automation_prefill_url` + workflow JSON.

### Recommended: every 6 hours

| Field | Value |
|-------|-------|
| **Name** | SVF — QA + backlog triage (6h) |
| **Trigger** | Cron `0 */6 * * *` (every 6 hours) |
| **Repository** | `https://github.com/SlabVault/SVF` |
| **Branch** | `main` |
| **Tools** | Open pull request (small fixes only), memories enabled |

**Actions each run:**

1. **QA gate** — `npm run qa:ci` equivalent (`lint` → `test` → `build`)
2. **P0/P1 triage** — read `docs/mvp-backlog.md`, report open blockers and stale DONE rows
3. **Tensor epic** — recommend next 2-week slice from P2-INT-T* / P2-INT-OC* (Tensor-for-Slabs clone)

### Alternative: daily

| Field | Value |
|-------|-------|
| **Name** | SVF — QA + backlog triage (daily) |
| **Trigger** | Cron `0 9 * * *` (09:00 UTC) |

Pick **one** schedule — 6h catches CI regressions faster; daily is cheaper.

### Prefill URLs

Generated via MCP `build_automation_prefill_url` on **2026-05-21**. After opening, confirm repo access, model, and permission scope before saving.

| Schedule | Open |
|----------|------|
| **Every 6h** (recommended) | Run MCP `build_automation_prefill_url` with the workflow JSON below — returns a one-click URL with the full prompt embedded |
| **Daily 09:00 UTC** | [Open daily prefill](https://cursor.com/automations/new?prefill=eyJuYW1lIjoiU1ZGIOKAlCBRQSArIGJhY2tsb2cgdHJpYWdlIChkYWlseSkiLCJkZXNjcmlwdGlvbiI6IkRhaWx5IGF0IDA5OjAwIFVUQzogcWE6Y2ksIFAwL1AxIGJhY2tsb2cgdHJpYWdlLCBuZXh0IFRlbnNvciBjbG9uZSBlcGljLiIsIndvcmtmbG93Ijp7ImFnZW50T3B0aW9ucyI6eyJvcGVuUHVsbFJlcXVlc3QiOnRydWV9LCJnaXRDb25maWciOnsiYnJhbmNoIjoibWFpbiIsInJlcG9zaXRvcnkiOiJodHRwczovL2dpdGh1Yi5jb20vU2xhYlZhdWx0L1NWRiJ9LCJtZW1vcnlFbmFibGVkIjp0cnVlLCJtb2RlbCI6ImRlZmF1bHQiLCJwcm9tcHQiOiJTYW1lIGFzIFNWRiA2aCBhdXRvbWF0aW9uIOKAlCBydW4gcWE6Y2kgZXF1aXZhbGVudCwgdHJpYWdlIGRvY3MvbXZwLWJhY2tsb2cgUDAvUDEsIHJlY29tbWVuZCBuZXh0IFRlbnNvci1mb3ItU2xhYnMgZXBpYy4gU2VlIGRvY3MvcnVuYm9va3MvYXV0b25vbW91cy1vcmNoZXN0cmF0aW9uLm1kIGZvciBmdWxsIHByb21wdC4iLCJ0cmlnZ2VycyI6W3sic2NoZWR1bGUiOnsiY3JvbiI6IjAgOSAqICogKiJ9fV19fQ) (prompt defers to workflow JSON in this runbook) |

Regenerate after prompt edits: pass the workflow JSON below to MCP `build_automation_prefill_url`.

### Workflow JSON (6h variant)

```json
{
  "name": "SVF — QA + backlog triage (6h)",
  "description": "Every 6 hours: run qa:ci equivalent, triage docs/mvp-backlog P0/P1, recommend next Tensor-for-Slabs clone epic. Opens PR only for safe, scoped fixes.",
  "workflow": {
    "triggers": [{ "schedule": { "cron": "0 */6 * * *" } }],
    "prompt": "You are the SlabVaultFi autonomous orchestration agent for the Tensor-for-Slabs clone (repo: SlabVault/SVF).\n\n## Scope\nRead-only triage by default. Open a PR only for small, safe fixes (lint, test, docs) that do not touch secrets, production env, or mainnet program deploys.\n\n## Step 1 — QA gate (qa:ci equivalent)\nRun in order:\n1. `npm ci` (if node_modules missing or lockfile changed)\n2. `npm run lint`\n3. `npm run test`\n4. `npm run build`\n\nIf any step fails:\n- Capture the first failing command and error excerpt.\n- Classify: lint | test | build | dependency.\n- If fix is clearly local and low-risk (≤3 files, no secrets), fix and open a PR titled `fix(ci): <short summary>`.\n- Otherwise, write a triage note — do NOT open a PR.\n\n## Step 2 — P0/P1 backlog triage\nRead `docs/mvp-backlog.md` (last audited 2026-05-21).\n\nReport:\n- Count of open P0 and P1 TODO items.\n- Top 5 blockers by impact (prefer SEC, OPS, MKT, TST).\n- Any DONE items that look stale vs codebase (spot-check 2–3 claims).\n- Items that became unblocked since last run.\n\nReference IDs like `P0-SEC-08`, `P1-PRD-*`.\n\n## Step 3 — Next Tensor clone epic\nUsing `docs/integrations/tensor-repo-vendoring.md`, `docs/integrations/tensor-fork-feasibility.md`, and P2-INT-T* / P2-INT-OC* rows in mvp-backlog:\n\nRecommend ONE next epic (2-week slice) with:\n- Epic title (e.g. \"Tensor template port — /trade shell\")\n- Backlog IDs covered\n- Exit criteria (testable)\n- Dependencies / blockers\n- Suggested branch name\n\nPrefer week-1 spike path: `marketplace-nextjs-template` → `app/trade/*`, `Unified-Wallet-Kit`, `tensorswap-sdk` CC read-only depth.\n\n## Output format\nPost a structured markdown report (no Slack unless configured). If opening PR, link it in the report.\n\n## Hard stops\n- Never commit `.env`, keys, or wallet secrets.\n- Never deploy Anchor programs to mainnet.\n- Never force-push or merge without human review.\n- Do not call `create_automation` or change production Vercel env.",
    "gitConfig": {
      "repository": "https://github.com/SlabVault/SVF",
      "branch": "main"
    },
    "model": "default",
    "memoryEnabled": true,
    "agentOptions": { "openPullRequest": true }
  }
}
```

Daily trigger swap: `"triggers": [{ "schedule": { "cron": "0 9 * * *" } }]`

### Initial Tensor epic candidates

| ID | Epic slice |
|----|------------|
| P2-INT-T03 | Port `marketplace-nextjs-template` → `app/trade/*` |
| P2-INT-T04 | `Unified-Wallet-Kit` on `/trade` route group |
| P2-INT-T05 | CC collection read-only depth via `tensorswap-sdk` |
| P2-INT-OC05 | Pin tensor-foundation/IDLs in `programs/idl-lock.json` |

### Review checklist before `create_automation`

- [ ] GitHub repo `SlabVault/SVF` connected to Cursor Cloud Agents
- [ ] Schedule: **6h** vs **daily** (not both)
- [ ] Permission scope: Private vs Team Owned
- [ ] Open PR tool enabled only if you want autonomous fix PRs
- [ ] Prompt hard stops reviewed (no secrets, no mainnet deploys)

---

## Cursor Automation draft (30m backlog tick — confirm before enabling)

**Do not enable until you review.** This repo does **not** auto-create the automation via MCP — copy the draft below into [cursor.com/automations](https://cursor.com/automations) after editing.

### Draft: SlabVaultFi — 30m backlog tick

| Field | Value |
|-------|-------|
| **Name** | SVF — orchestrate next backlog item |
| **Trigger** | Schedule — every 30 minutes (or webhook from CI) |
| **Repository** | Your SlabVaultFi GitHub remote |
| **Branch** | `main` or your active feature branch |
| **Model** | Composer 2 (or team default) |

**Prompt template:**

```
Repo: SlabVaultFi. Read docs/STATUS.md and docs/mvp-backlog.md.

Run equivalent of: npm run orchestrate:next
Implement exactly one returned backlog item (highest P0/P1 open).

Rules:
- Run npm run test before finishing.
- Do NOT git commit or push unless the operator explicitly approved in this thread.
- Do NOT write secrets to the repo or logs.
- STOP and ask before: mainnet deploys, production DATABASE_URL changes, wallet/program deploys.

When done, summarize: task ID, files touched, test result, and whether STATUS.md needs an update.
```

**Suggested guardrails in Automation UI:**

- Disable auto-commit / auto-push
- Require PR for merges
- Restrict to paths: `app/`, `lib/`, `components/`, `scripts/`, `tests/`, `docs/` (exclude `.env*`)

### Optional webhook trigger

Instead of schedule, POST to your automation webhook after `qa:ci` fails on `main` with payload:

```json
{ "prompt": "CI failed on main. Run npm run orchestrate:investigate and fix the highest-priority regression. Do not commit without approval." }
```

---

## Multi-agent parallel lanes

Example — three terminals / three agents:

```powershell
# Terminal A — trade lane
.\scripts\orchestrate-next.ps1 -Lane trade

# Terminal B — security lane (coordinate with ops)
.\scripts\orchestrate-next.ps1 -Lane security -IntervalMinutes 45

# Terminal C — investigate only (no loop)
npm run orchestrate:investigate -- --pretty
```

Check lane capacity first:

```powershell
npm run orchestrate:lanes
```

---

## Updating status after work

1. Mark the backlog row `DONE` (or `IN PROGRESS`) in `docs/mvp-backlog.md`.
2. Refresh **Current focus** / **Blockers** in `docs/STATUS.md`.
3. Run `npm run test` (and `npm run qa:ci` before merge).

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `CURSOR_API_KEY is required` | Set key in `.env` or omit `--dispatch` |
| Empty `task` in JSON | All backlog items may be DONE — add TODO rows |
| Loop never wakes agent | Ensure terminal has monitored output; match `AGENT_LOOP_TICK` regex |
| Agent commits unexpectedly | Reinforce approval gate in `/loop` prompt; disable Automation auto-commit |
| Wrong task picked | Pass `--lane` or reorder backlog priorities in `mvp-backlog.md` |

---

## Related docs

- [mvp-backlog.md](../mvp-backlog.md)
- [STATUS.md](../STATUS.md)
- [Automation drafts (review before save)](../automations/README.md) — QA guard, CI failure fix, weekly STATUS, Tensor lane
- [tensor-repo-vendoring.md](../integrations/tensor-repo-vendoring.md)
- [operations-hardening.md](./operations-hardening.md)
- [Cursor SDK scripts README](../../scripts/cursor-sdk/README.md)
- [Cursor SDK skill](https://cursor.com/docs/api/sdk/typescript)

---

## Approach comparison (honest limits)

| Approach | Hands-off when IDE closed | Best for | Still needs human |
|----------|---------------------------|----------|-------------------|
| **Cursor Automations** (cloud) | Yes | Scheduled QA, CI fix PRs, weekly STATUS, Tensor lane | Merge PRs, prod env, mainnet, creating automations (review drafts first) |
| **Local SDK** (`orchestrate:*`) | Only if Task Scheduler / loop running | Private experiments, same-machine agents | Laptop sleep, local `.env` exposure, commits |
| **PowerShell loop** + `/loop` | While terminal + IDE open | Lowest setup, monitored shell ticks | Manual `/loop` arming, terminal must stay open |
| **GitHub Actions** (`ci.yml`) | Yes | Deterministic `qa:ci` gate | No autonomous fixes unless you add separate agent workflow |
| **Manual Multitask** | No | Ambiguous / product judgment | Your time |

**Recommended hybrid:** GitHub Actions gate + Cursor Automations for fix PRs / Tensor lane + optional local `orchestrate:dry-run` for preview.

