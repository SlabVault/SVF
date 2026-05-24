# Migration Baseline Runbook (Non-Empty DB)

This runbook is for environments where marketplace tables already exist, but Prisma migration history is missing (`_prisma_migrations` does not exist).

## Why this exists

Marking ad-hoc migrations as applied without a verified baseline can hide drift (for example missing `Transaction.paymentSplit`) and break checkout at runtime.

This runbook is intentionally conservative and does **not** assume a destructive reset.

## When to use this runbook

Use this flow if all of the following are true:

- `npm run db:preflight` reports `_prisma_migrations` missing, and
- your database already has non-empty marketplace tables, and
- you need Prisma migrations to become the source of truth going forward.

If your database is empty/new, use normal migrations (`npx prisma migrate dev` in local, `npx prisma migrate deploy` in shared/prod).

## Prisma P3005 (non-empty database)

**Symptom:** `npx prisma migrate dev` fails with:

```text
Error: P3005
The database schema is not empty.
```

**Meaning:** Prisma sees existing tables but no migration history to reconcile against.

**Do not** use `migrate reset` on shared or production databases.

**Do:**

```bash
npm run db:baseline:plan
npm run db:preflight
```

Then follow sections 2–5 below (baseline artifact → resolve → deploy → verify).

## Operator safety gates (required)

Before running baseline commands:

1. Create and verify a fresh database backup.
2. Confirm no one is applying schema changes at the same time.
3. Confirm application writes are paused if this is a production baseline.

## 1) Inspect current state

```bash
npm run db:baseline:plan
npm run db:repair:payment-split:plan
npm run db:preflight
```

`db:baseline:plan` prints environment-specific guidance and confirms whether `_prisma_migrations` is missing.

Use `--json` on any plan script for machine-readable output:

```bash
npm run db:baseline:plan -- --json
npm run db:repair:payment-split:plan -- --json
npm run db:preflight:json
```

## 2) Create a baseline migration artifact

Create a baseline folder if needed, then generate SQL from current Prisma schema:

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/00000000000000_manual_baseline/migration.sql
```

Review the generated SQL before proceeding.

## 3) Mark baseline as applied (no destructive replay)

```bash
npx prisma migrate resolve --applied 00000000000000_manual_baseline
```

This records baseline state in `_prisma_migrations` without re-running full schema creation against an existing database.

## 4) Deploy remaining migrations

```bash
npx prisma migrate deploy
```

If a backfill migration exists (for example transaction split backfills), this step applies it normally.

Expected backfill migration: `20260520223500_transaction_schema_backfill` (idempotent `ADD COLUMN IF NOT EXISTS` + enum backfill).

## 5) Verify and smoke-check

```bash
npm run db:preflight
```

Expected outcome:

- preflight severity is `ok`
- scenario is `ok`
- no missing columns/enums
- no pending migrations

Then smoke test:

- `GET /api/admin/schema-health` (admin auth)
- `GET /api/marketplace/transactions` (admin-authenticated)
- reserve -> checkout flow in `/marketplace`
- `/admin` dashboard schema warning cleared

---

## PaymentSplit schema drift (operator decision tree)

Use this when checkout, reserve, or admin transactions fail with missing `Transaction.paymentSplit` or related columns.

### Step 0 — Diagnose

```bash
npm run db:repair:payment-split:plan
npm run db:preflight
```

Check the **scenario** field:

| Scenario | Meaning |
| --- | --- |
| `payment_split_drift` | Drift with `_prisma_migrations` present |
| `payment_split_drift_untracked` | Drift **and** no migration history |
| `baseline_required` | No drift yet, but migration history missing (P3005) |

### Path A — Tracked database (`payment_split_drift`)

Migration history exists. Apply forward-only migrations:

```bash
npx prisma migrate deploy
npm run db:preflight
npm run db:repair:payment-split:plan
```

If deploy reports applied but columns are still missing:

1. Stop and inspect `_prisma_migrations` vs `prisma/migrations/20260520223500_transaction_schema_backfill/migration.sql`
2. Do not run ad-hoc SQL without a backup and operator sign-off

### Path B — Untracked non-empty database (`payment_split_drift_untracked` / P3005)

**Shared / staging / production:**

```bash
npm run db:baseline:plan
# follow sections 2–5 of this runbook
npx prisma migrate deploy
npm run db:preflight
```

**Do not** use `npm run db:push` outside disposable local databases.

### Path C — Local disposable database only (`db:push`)

Use only when **all** are true:

- `npm run db:preflight` reports `Safe local repair (db push): yes`
- the database is local/disposable (no production or shared staging data)
- you accept that migration history will still be missing until you run the baseline path later

```bash
npm run db:push
npm run db:preflight
```

Then smoke test reserve → checkout.

For proper migration history on local DBs that mirror prod, prefer Path B (baseline + deploy) instead of Path C.

---

## Troubleshooting

- **Missing `paymentSplit` or related columns**: run `npm run db:repair:payment-split:plan`, then choose Path A, B, or C above.
- **P3005 on migrate dev**: stop and run `npm run db:baseline:plan`; do not force migrate dev on a non-empty DB.
- **Connection/proxy issue**: if using `prisma+postgres://` locally, run `npx prisma dev` or switch to a direct `postgresql://` URL.
- **Unknown migration state**: stop and review backup/restore options before running manual SQL.

## Important policy

- Do not use `prisma migrate reset` in shared/prod environments.
- Do not manually mutate production tables as a substitute for migration history.
- Always re-run `npm run db:preflight` before and after schema operations.
