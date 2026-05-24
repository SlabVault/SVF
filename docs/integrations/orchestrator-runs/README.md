# Orchestrator run journal

Daily logs for GRAILS lane orchestrators. Each lane writes one file per calendar day.

---

## File naming

```
docs/integrations/orchestrator-runs/{lane}-{YYYY-MM-DD}.md
```

| Lane key | Example file |
|----------|--------------|
| `segment` | `segment-2026-05-22.md` |
| `ui` | `ui-2026-05-22.md` |
| `backend` | `backend-2026-05-22.md` |
| `onchain` | `onchain-2026-05-22.md` |
| `security` | `security-2026-05-22.md` |
| `qa` | `qa-2026-05-22.md` |
| `verify` | `verify-2026-05-22.md` |

Append to the same file if the lane runs multiple invocations on the same day.

---

## Log format

Each orchestrator invocation appends structured blocks. Use this template:

```markdown
# {Lane} orchestrator — {YYYY-MM-DD}

## Invocation {N} — {ISO timestamp}

**Iteration:** {1–3} of 3 (or "early stop: {reason}")  
**Elapsed:** {minutes}m

### Audit summary

- {bullet: what was checked}
- {bullet: gaps found}

### Gaps

| ID | Gap | Severity | Owner files | Action |
|----|-----|----------|-------------|--------|
| G1 | {description} | P0/P1/P2 | `{path}` | spawn / inline / deferred |

### Spawned workers

| Worker | Gap ID | Task title | Status |
|--------|--------|------------|--------|
| bg-{id} | G1 | {narrow fix title} | spawned (not awaited) |

**Spawned count:** {N} (max 3 this iteration)  
**Inline fixes:** {list or "none"}

### Iteration footer

- **Remaining gaps:** {count} — {brief list}
- **Recommend next lane:** {lane name or "continue same lane"}
- **Stop reason:** {continuing | max iterations | time limit | green | blocker}

---

## End of invocation

**Total iterations:** {N}  
**Total spawned:** {N}  
**Green criteria met:** {yes/no — which}  
**Operator action needed:** {none | list}
```

---

## Status values

| Status | Meaning |
|--------|---------|
| `spawned (not awaited)` | Background Task launched; orchestrator continued |
| `inline fixed` | Orchestrator applied 1–5 line fix directly |
| `deferred` | Gap logged; no spawn (conflict, approval gate, out of scope) |
| `green` | Lane stop condition met (e.g. 0 test failures × 2 iterations) |
| `blocker` | Cannot proceed (missing MCP, env, operator decision) |

---

## Green / stop shorthand

Orchestrators may end a daily log with a one-line summary:

```markdown
## Status: green

`npm run test` — 0 failures, 2 consecutive iterations (2026-05-22T14:30Z)
```

or

```markdown
## Status: active

Remaining P0 gaps: 3 (see G4–G6). Recommend UI lane next.
```

---

## Rules

1. **Never delete** prior invocation blocks — append only.
2. **Never log secrets** — redact env values, keys, wallet addresses in error excerpts unless already public in repo.
3. **Spawn IDs** — use `bg-1`, `bg-2`, … per invocation for traceability.
4. **Cross-lane handoff** — iteration footer `Recommend next lane` helps operator prioritize chats.

---

## Related

- [orchestrator-concurrency.md](../orchestrator-concurrency.md) — global spawn limits
- [grails-orchestrator-lanes.md](../grails-orchestrator-lanes.md) — lane definitions and loop protocol
- `scripts/orchestrator/run-*-lane.md` — prompts that produce these logs
