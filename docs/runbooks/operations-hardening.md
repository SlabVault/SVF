# Operations Hardening Runbook

This runbook is for production operators who need consistent deploy, auth, and rollback checks.

For stuck reservations, payment–fulfillment gaps, buyer disputes, and mistaken admin fulfillment, see [Custody and fulfillment incidents](./custody-fulfillment-incidents.md).

## 1) Pre-deploy environment gates

Before migrations or app deploy:

```bash
npm ci
npm run ops:env:production
```

Required production contract:

- `NEXT_PUBLIC_SITE_URL`
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `ADMIN_PASSWORD`
- `CRON_SECRET`
- `NEXT_PUBLIC_SOLANA_RPC` or `SOLANA_RPC_URL`

Recommended:

- `SYNC_API_TOKEN` (separate automation token for `/api/sync` bearer auth)

**GRAILS trade tx rate limits (`/api/trade/tx/*`):** Unsigned tx builders are throttled in `proxy.ts` at 20 requests per minute per client IP (stricter than the default 100/min API bucket). Enforcement goes through `lib/security.ts` `checkRateLimit()`, which uses Upstash Redis REST when both `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set, and otherwise falls back to per-instance in-memory counters that do not share state across Vercel serverless instances. For production, provision an Upstash database, add those two vars to the deployment environment, redeploy, and spot-check that tx routes return `X-RateLimit-Limit: 20` and `429 Too many requests` after sustained bursts; track closure in `SECURITY_CHECKLIST.md` (GRAILS `/trade` tx BFF) and `tests/proxy-rate-limit.test.ts`.

## 2) Migration/deploy sequence

1. Confirm fresh DB backup exists.
2. Run migration deploy:
   ```bash
   npx prisma migrate deploy
   ```
3. Deploy application build.
4. Run smoke checks:
   ```bash
   npm run ops:verify -- --base-url https://slabvault.xyz
   ```

`ops:verify` checks:

- `vercel.json` cron contract includes `/api/sync` and `/api/cron/expire-reservations`
- `/robots.txt` disallows `/admin` and `/api`
- anonymous `/api/sync` returns `401` + bearer challenge
- anonymous `POST /api/cron/expire-reservations` returns `401` + bearer challenge

## 3) Cron/sync auth operational checks

Expected bearer header format:

```txt
Authorization: Bearer <token>
```

Tokens:

- Vercel cron routes use `CRON_SECRET`
- `/api/sync` supports:
  - `CRON_SECRET`
  - `SYNC_API_TOKEN` (recommended for automation)
  - admin session auth
  - `ADMIN_PASSWORD` bearer (legacy compatibility)

## GRAILS partner listing sync (`sync:discover`)

Partner inventory for `/trade` (Collector Crypt + Phygitals seed) is refreshed by:

```bash
npm run sync:discover
```

Production/staging: Vercel cron `POST /api/sync` every 30 minutes (`vercel.json`) also runs `syncExternalListingsToJson()` and upserts active rows into Postgres `ExternalListing` when `DATABASE_URL` is set.

| Step | Command / route |
|------|-----------------|
| Local JSON refresh | `npm run sync:discover` |
| Staging/prod cron | `POST /api/sync` with `Authorization: Bearer CRON_SECRET` |
| Apply schema | `npm run db:push` or `npx prisma migrate deploy` |

Phygitals has **no live API** — seed rows in `data/external-listings.json` are refreshed on each sync (indexedAt bump). Collector Crypt rows come from the treasury account scrape when upstream is reachable.

Optional: `TENSOR_API_KEY` adds 24h volume/Δ on `/trade` landing when configured.

Sync diagnostics now expose source-level health via `GET /api/sync`:

- `sourceStatuses[]` includes per-source `status` (`success`/`failure`), `isStale`, and `ageMinutes`
- `operatorHints[]` provides remediation cues when upstreams fail or data is stale
- `staleSources[]` and `degraded` provide quick machine-readable triage signals

Admin write APIs (`/api/admin/*`, admin marketplace mutation routes) now support:

- Admin session auth (preferred for dashboard/browser workflows)
- `Authorization: Bearer ADMIN_PASSWORD` (legacy/operator fallback)

Treat bearer fallback as transitional and phase it out once operator tooling uses session-based or dedicated automation auth.

## 4) Rollback guide

If deployment regresses:

1. Re-deploy previous healthy Vercel deployment first (application rollback).
2. Verify critical routes and auth responses.
3. If schema correction is required, create/apply a forward-only corrective migration:
   - Do **not** manually mutate production tables.
   - Do **not** run destructive reset flows in shared/prod.
4. Re-run:
   ```bash
   npm run db:preflight
   npm run ops:verify -- --base-url https://slabvault.xyz
   ```

## 5) Continuous operator routine

- Weekly: run `npm run ops:env:production` against current secrets config.
- On every release: run `npm run ops:verify -- --base-url <deployment-url>`.
- Quarterly: run the [Quarterly secret rotation](#6-quarterly-secret-rotation) procedure (target: first week of Jan / Apr / Jul / Oct).
- Optional due-date reminders: `npm run ops:rotation:check` (reads `OPS_*_ROTATED_AT` timestamps only; never prints secret values).

## 6) Quarterly secret rotation

Rotate these production secrets on a **90-day** cadence (or after any suspected leak). Never paste values into chat, tickets, git, or CI logs.

| Secret | Used by | Rotation impact |
|--------|---------|-----------------|
| `NEXTAUTH_SECRET` | NextAuth session signing (`lib/auth.ts`, admin session) | **Invalidates all admin browser sessions** on deploy |
| `ADMIN_PASSWORD` | Admin login + legacy `Authorization: Bearer` on admin/sync routes | Operators must re-login; bearer scripts need new token |
| `CRON_SECRET` | Vercel cron → `POST /api/sync`, `POST /api/cron/expire-reservations` | Cron jobs fail until Vercel env + redeploy align |
| `SYNC_API_TOKEN` | Optional dedicated bearer for `POST /api/sync` automation | External sync callers must update bearer header |

### Generate replacements (offline)

Use a password manager or CSPRNG. Example (prints to your terminal only — do not commit output):

```bash
openssl rand -base64 32
```

Generate **four independent** values. Confirm `ADMIN_PASSWORD`, `CRON_SECRET`, and `SYNC_API_TOKEN` (if set) are pairwise different before applying.

### Vercel env update order (single redeploy)

Goal: one production redeploy with all new values to avoid long windows where cron and app disagree.

1. **Preflight** (local or CI with production env pulled — values stay in your shell only):
   ```bash
   npm run ops:env:production
   npm run ops:verify -- --base-url https://slabvault.xyz
   ```
2. **Vercel → Project → Settings → Environment Variables (Production)**  
   Update all four keys in the dashboard (or `vercel env add` per key). Suggested paste order in the UI (any order is fine if you redeploy once):
   - `SYNC_API_TOKEN` (if used by external automation — update callers **after** deploy)
   - `CRON_SECRET`
   - `ADMIN_PASSWORD`
   - `NEXTAUTH_SECRET`
3. **Redeploy** production once (Promote or redeploy latest) so all serverless instances read the new env bundle.
4. **Post-rotate operator actions**
   - Sign in again at `/admin/login` (sessions were cleared if `NEXTAUTH_SECRET` changed).
   - Update any runbooks/scripts that call `/api/sync` with `Authorization: Bearer <SYNC_API_TOKEN>` or legacy admin bearer.
   - Vercel cron picks up `CRON_SECRET` automatically from project env; no `vercel.json` edit required.
5. **Record rotation dates** (ISO-8601, no secrets) in Vercel for `npm run ops:rotation:check`:
   - `OPS_NEXTAUTH_SECRET_ROTATED_AT=2026-05-22`
   - `OPS_ADMIN_PASSWORD_ROTATED_AT=2026-05-22`
   - `OPS_CRON_SECRET_ROTATED_AT=2026-05-22`
   - `OPS_SYNC_API_TOKEN_ROTATED_AT=2026-05-22` (omit if `SYNC_API_TOKEN` is unset)
6. **Verify**
   ```bash
   npm run ops:env:production
   npm run ops:rotation:check
   npm run ops:verify -- --base-url https://slabvault.xyz
   ```

### Zero-downtime notes

- **Single redeploy** is the supported path: old instances drain within minutes; at most one cron interval may see `401` if rotation happens mid-window — acceptable for quarterly maintenance; prefer low-traffic window.
- **Do not** rotate one secret at a time across multiple deploys unless you are intentionally isolating blast radius (cron will fail between `CRON_SECRET` change and redeploy).
- **`NEXTAUTH_SECRET`** rotation logs out every admin session; schedule with an on-call operator available.
- **`DATABASE_URL`** and RPC keys are **out of scope** for this quarterly pass unless separately mandated.

### Failure recovery

If cron or sync returns `401` after rotation:

1. Confirm Production env in Vercel matches the bearer your caller sends (no trailing whitespace).
2. Redeploy if env was changed without a new deployment.
3. Re-run `npm run ops:verify -- --base-url <deployment-url>`.
4. If still failing, roll back to the previous Vercel deployment **only** if old env values were preserved in Vercel history; otherwise re-set secrets and redeploy again (never revert secrets in git).
