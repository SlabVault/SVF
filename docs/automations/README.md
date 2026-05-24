# Cursor Automation drafts (review before enabling)

These JSON drafts are **not live automations**. Review each workflow, then either:

1. Open the **prefill URL** in Cursor (fastest), or
2. Ask an agent to call `create_automation` via MCP after you approve.

Current automations in your account: **0** (checked 2026-05-21).

## Draft 1 — QA CI guard (weekday schedule)

**Schedule:** Mon–Fri 06:00 UTC  
**Action:** Run `npm run qa:ci`; fix on failure; no commit unless configured.

| Field | Value |
|-------|-------|
| File | [qa-ci-guard.json](./qa-ci-guard.json) |
| Prefill | [Open in Cursor](https://cursor.com/automations/new?prefill=eyJuYW1lIjoiU1ZGIFFBIENJIEd1YXJkIiwiZGVzY3JpcHRpb24iOiJSdW4gcWE6Y2kgb24gc2NoZWR1bGU7IHNwYXduIGZpeCBhZ2VudCBvbiBmYWlsdXJlIiwid29ya2Zsb3ciOnsidHJpZ2dlcnMiOlt7InR5cGUiOiJzY2hlZHVsZSIsImNyb24iOiIwIDYgKiAqIDEtNSJ9XSwiYWN0aW9ucyI6W3sidHlwZSI6ImFnZW50IiwicHJvbXB0IjoiUnVuIG5wbSBydW4gcWE6Y2kgaW4gdGhlIHJlcG8uIElmIGl0IGZhaWxzLCBkaWFnbm9zZSBhbmQgZml4IHRoZSBzbWFsbGVzdCBjb3JyZWN0IGNoYW5nZS4gRG8gbm90IGNvbW1pdCB1bmxlc3MgZXhwbGljaXRseSBjb25maWd1cmVkLiJ9XSwibW9kZWwiOnsiaWQiOiJjb21wb3Nlci0yIn0sImdpdENvbmZpZyI6eyJyZXBvcyI6W3sidXJsIjoiaHR0cHM6Ly9naXRodWIuY29tL1NsYWJWYXVsdC9TVkYifV19fX0) |

## Draft 2 — CI failure fix (GitHub trigger)

**Trigger:** GitHub `check_suite_completed` (failed checks)  
**Action:** Read logs, minimal fix, `qa:ci`, open PR (no merge).

| Field | Value |
|-------|-------|
| File | [ci-failure-fix.json](./ci-failure-fix.json) |
| Prefill | [Open in Cursor](https://cursor.com/automations/new?prefill=eyJuYW1lIjoiU1ZGIENJIEZhaWx1cmUgRml4Iiwid29ya2Zsb3ciOnsiYWN0aW9ucyI6W3sicHJvbXB0IjoiR2l0SHViIENJIGZhaWxlZCBvbiB0aGlzIHJlcG8uIFJlYWQgdGhlIGxhdGVzdCBmYWlsZWQgY2hlY2sgbG9ncywgaWRlbnRpZnkgdGhlIHJvb3QgY2F1c2UsIGFwcGx5IHRoZSBzbWFsbGVzdCBmaXgsIHJ1biBucG0gcnVuIHFhOmNpIGxvY2FsbHksIGFuZCBvcGVuIGEgUFIuIERvIG5vdCBtZXJnZS4iLCJ0eXBlIjoiYWdlbnQifV0sImdpdENvbmZpZyI6eyJyZXBvcyI6W3sidXJsIjoiaHR0cHM6Ly9naXRodWIuY29tL1NsYWJWYXVsdC9TVkYifV19LCJtb2RlbCI6eyJpZCI6ImNvbXBvc2VyLTIifSwidHJpZ2dlcnMiOlt7ImV2ZW50IjoiY2hlY2tfc3VpdGVfY29tcGxldGVkIiwidHlwZSI6ImdpdGh1YiJ9XX19) |

**Note:** Connect the SlabVault/SVF GitHub repo in Automations settings when saving.

## Draft 3 — Weekly STATUS.md refresh

**Schedule:** Monday 09:00 UTC  
**Action:** Regenerate `docs/STATUS.md` from backlog + git + CI snapshot.

| Field | Value |
|-------|-------|
| File | [weekly-status-refresh.json](./weekly-status-refresh.json) |
| Prefill | [Open in Cursor](https://cursor.com/automations/new?prefill=eyJuYW1lIjoiU1ZGIFdlZWtseSBTVEFUVVMgUmVmcmVzaCIsIndvcmtmbG93Ijp7ImFjdGlvbnMiOlt7InByb21wdCI6IlJlZnJlc2ggZG9jcy9TVEFUVVMubWQgZm9yIFNsYWJWYXVsdEZpLiBSZWFkIGRvY3MvbXZwLWJhY2tsb2cubWQsIHJlY2VudCBnaXQgbG9nLSwgYW5kIG5wbSBydW4gcWE6Y2kgcmVzdWx0cyBpZiBhdmFpbGFibGUuIFN1bW1hcml6ZTogY3VycmVudCBzcHJpbnQgZm9jdXMsIFAwIG9wZW4gY291bnQsIFAyLUlOVCBUZW5zb3IgbGFuZSBuZXh0IDMgaXRlbXMgbGFzdCBDSSBzdGF0dXMsIGJsb2NrZXJzIG5lZWRpbmcgaHVtYW4gYXBwcm92YWwuIEtlZXAgdW5kZXIgMTIwIGxpbmVzLiBEbyBub3QgY29tbWl0IHVubGVzcyBPUkNIRVNUUkFURV9BTExPV19DT01NSVQ9MS4iLCJ0eXBlIjoiYWdlbnQifV0sImdpdENvbmZpZyI6eyJyZXBvcyI6W3sidXJsIjoiaHR0cHM6Ly9naXRodWIuY29tL1NsYWJWYXVsdC9TVkYifV19LCJtZW1vcnlFbmFibGVkIjp0cnVlLCJtb2RlbCI6eyJpZCI6ImNvbXBvc2VyLTIifSwidHJpZ2dlcnMiOlt7ImNyb24iOiIwIDkgKiAqIDEiLCJ0eXBlIjoic2NoZWR1bGUifV19fQ) |

Enable **memory** so weekly runs learn blockers and sprint context.

## Draft 4 — Tensor lane progression

**Schedule:** Tue + Thu 14:00 UTC  
**Action:** One P2-INT-T* / P2-INT-OC* Phase 1 item; PR only.

| Field | Value |
|-------|-------|
| File | [tensor-lane-progression.json](./tensor-lane-progression.json) |
| Prefill | [Open in Cursor](https://cursor.com/automations/new?prefill=eyJuYW1lIjoiU1ZGIFRlbnNvciBMYW5lIFByb2dyZXNzaW9uIiwid29ya2Zsb3ciOnsiYWN0aW9ucyI6W3sicHJvbXB0IjoiQWR2YW5jZSB0aGUgU2xhYlZhdWx0RmkgVGVuc29yIGludGVncmF0aW9uIGxhbmUgKFAyLUlOVC1UKiBhbmQgUDItSU5ULU9DKiBUT0RPIGl0ZW1zIGluIGRvY3MvbXZwLWJhY2tsb2cubWQpLiBQaWNrIHRoZSBoaWdoZXN0LXByaW9yaXR5IGluY29tcGxldGUgUGhhc2UgMSBpdGVtIChUMDYtVDExLCBUMTkgYmVmb3JlIFBoYXNlIDIpLiBJbXBsZW1lbnQgb25lIGl0ZW0gZW5kLXRvLWVuZCwgcnVuIG5wbSBydW4gcWE6Y2ksIHVwZGF0ZSBkb2NzL1NUQVRVUy5tZCBhbmQgbWFyayBiYWNrbG9nIHJvdyBET05FLiBPcGVuIFBSOyBkbyBub3QgbWVyZ2UuIE5ldmVyIGVuYWJsZSBSV0FfVFJBREVfV1JJVEVfRU5BQkxFRCBvciBtYWlubmV0IHByb2dyYW0gZGVwbG95cyB3aXRob3V0IGh1bWFuIGFwcHJvdmFsLiIsInR5cGUiOiJhZ2VudCJ9XSwiZ2l0Q29uZiI6eyJyZXBvcyI6W3sidXJsIjoiaHR0cHM6Ly9naXRodWIuY29tL1NsYWJWYXVsdC9TVkYifV19LCJtZW1vcnlFbmFibGVkIjp0cnVlLCJtb2RlbCI6eyJpZCI6ImNvbXBvc2VyLTIifSwidHJpZ2dlcnMiOlt7ImNyb24iOiIwIDE0ICogKiAyLDQiLCJ0eXBlIjoic2NoZWR1bGUifV19) |

## Enable checklist

- [ ] Privacy mode allows Automations (not NO_STORAGE)
- [ ] GitHub repo `SlabVault/SVF` connected
- [ ] Review prompts — adjust commit policy (`ORCHESTRATE_ALLOW_COMMIT`)
- [ ] Enable branch protection + required `qa:ci` check (P0-OPS-06)
- [ ] Save each automation; confirm first run in [cursor.com/automations](https://cursor.com/automations)
- [ ] Optional: Slack notification action for failed runs

## Creating via MCP (after review)

```
create_automation({
  name: "SVF Tensor Lane Progression",
  description: "...",
  workflow: <contents of tensor-lane-progression.json workflow key>
})
```

Do **not** create until you explicitly approve a draft.
