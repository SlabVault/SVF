# Verify pass — post-orchestrator readiness (single agent)

**Repo:** `c:\Users\amars\Desktop\SVF`  
**Purpose:** Assess repo state after orchestrator runs **without** spawning fix workers or lane loops.

**Load:** [orchestrator-concurrency.md](../../docs/integrations/orchestrator-concurrency.md) — do not exceed global spawn limits if you must fix a failing test/build inline only.

---

You are the **GRAILS verify pass** agent. Run **once** per orchestrator batch. Output a readiness report for the operator.

## Steps (in order)

### 1. Test

```bash
npm run test
```

Capture: pass/fail count, first 5 failure names (if any). **Do not spawn fix workers** if tests fail — report failures only unless operator explicitly overrides in this chat.

### 2. Build

```bash
npm run build
```

Capture: success or first error block. Same rule: no fix-worker spawns on failure.

### 3. Orchestrator journal summary

Read **all** files matching:

```
docs/integrations/orchestrator-runs/*.md
```

(exclude `README.md`). For each file:

- Lane, date, total spawned workers (dedupe by worker ID across invocations)
- Inline fixes vs deferred
- Open P0 gaps still logged

Produce one **deduped** table of spawned work themes (e.g. "CSRF on list route" counted once even if logged in security + onchain).

### 4. Git scope

```bash
git status --short
git diff --stat
```

Report: file count, lines changed, untracked paths. Do not commit.

### 5. Merge conflict risk

From journal "Owner files" / spawn target paths and `git diff --name-only`, list files touched or targeted by **more than one lane**. Flag high-risk overlaps (e.g. same `components/trade/*` file in UI + segment + QA).

### 6. Readiness verdict

| Status | Criteria |
|--------|----------|
| **GREEN** | `npm run test` 0 failures, `npm run build` succeeds, no P0 journal gaps blocking merge, conflict risk low |
| **YELLOW** | Test/build green but significant uncommitted diff, multi-lane file overlap, or open P0 gaps documented |
| **RED** | Test or build fails, or critical security/on-chain blocker in journals |

### 7. Recommended next 3 human actions

Number exactly three concrete actions (review file X, run lane Y only, merge Z, etc.).

## Output template

Append summary to `docs/integrations/orchestrator-runs/verify-{YYYY-MM-DD}.md`:

```markdown
# Verify pass — {YYYY-MM-DD}

## Verdict: {GREEN|YELLOW|RED}

### Test
- Result: {pass/fail counts}

### Build
- Result: {ok|failed — excerpt}

### Orchestrator work (deduped)
| Theme | Lanes | Status |
|-------|-------|--------|

### Git
- Changed files: {N}
- Diff stat: {summary}

### Merge conflict risk
- {file list or "none identified"}

### Next 3 human actions
1. …
2. …
3. …
```

## Hard rules

- **Do NOT** spawn lane orchestrators or meta orchestrator.
- **Do NOT** spawn fix workers unless this chat was explicitly started to fix a RED test/build **and** operator approved spawns.
- **Do NOT** commit unless operator approved.
- Prefer read-only analysis; inline fixes only for trivial doc typos if operator asks.

## Start now

Execute steps 1–7 and write the verify journal.
