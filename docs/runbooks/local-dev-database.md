# Local dev database

SlabVaultFi serves `/trade`, `/marketplace`, and partner ingest from **JSON seed files** when no working database is configured. You do not need Postgres for browse-only trade desk development. The app probes Postgres when `DATABASE_URL` is set; on failure it falls back to JSON seed without throwing.

| Data | Fallback file | Refresh command |
|------|---------------|-----------------|
| Partner listings (Collector Crypt, Phygitals) | `data/external-listings.json` | `npm run sync:discover` |
| Vault treasury slabs | `data/slabs.json` | committed seed / `npm run db:seed` when DB is up |

**Partner ingest read priority (request path):** Postgres `ExternalListing` → partner API (CC candidates) → JSON seed → live CC scrape (fallback only when `PARTNER_LIVE_SCRAPE_ENABLED=true` and data is empty/stale). Batch `sync:discover` may scrape CC off the request path.

`lib/marketplace-slabs.ts` and `lib/external-listings.ts` never throw on DB failure — they log once and return JSON fallback data.

**Solana RPC (wallet balances):** public mainnet-beta often returns 403. Set `NEXT_PUBLIC_SOLANA_RPC_URL` (and optionally `HELIUS_API_KEY` for portfolio NFTs). See [solana-rpc.md](./solana-rpc.md).

---

## `.env` — choose one DATABASE_URL mode

| Mode | `DATABASE_URL` value | When to use |
|------|---------------------|-------------|
| **Browse-only** | Omit / comment out | Fastest `/trade` UI work — JSON seed only |
| **Direct Postgres** | `postgresql://user:pass@host:5432/dbname` | Recommended for checkout, admin, and `sync:discover` upserts |
| **Prisma dev proxy** | `prisma+postgres://…` from `npx prisma dev` | Prisma-managed local Postgres; proxy URL **only** works while `prisma dev` is running |

Both `postgresql://` and `prisma+postgres://` are supported when the database is reachable. The app probes connectivity once per cache window (~30s); failed probes fall back to JSON without blocking page loads.

---

## Option A — Easiest (browse-only `/trade`)

**Unset `DATABASE_URL`** in `.env` / `.env.local` (comment it out or delete the line).

```bash
# DATABASE_URL=
```

Restart `npm run dev`. `/trade` loads from `external-listings.json` and `slabs.json`. Checkout and admin routes still require a real database.

---

## Option B — Direct Postgres (recommended when you need checkout / admin)

Use a **direct** connection string, not a Prisma proxy URL:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/slabvault
```

Works with Neon, Docker Postgres, or any hosted Postgres. Apply schema:

```bash
npm run db:preflight:warn
npx prisma migrate dev
npm run db:seed
npm run sync:discover   # also upserts ExternalListing when DATABASE_URL is set
```

Do **not** paste a `prisma+postgres://` URL here unless you are running Option C.

---

## Option C — Prisma managed local Postgres (`prisma dev`)

Some `prisma init` flows print a `prisma+postgres://` URL. That URL only works when the Prisma Postgres dev server is running:

```bash
npx prisma dev
# Copy the printed DATABASE_URL into .env.local, then in another terminal:
npm run dev
```

### Windows / Node 22 troubleshooting

`npx prisma dev` may fail with:

```text
ERROR No such built-in module: node:sqlite
```

Prisma dev depends on Node’s built-in `node:sqlite` module (Node **22.5+** on supported platforms). If you see this error:

1. Upgrade Node to the latest **22.x** LTS (or 23+), then retry.
2. On Windows, built-in SQLite support may still be unavailable — prefer **Option A** or **Option B** instead of fighting `prisma dev`.
3. See [Prisma dev troubleshooting](https://www.prisma.io/docs/postgres/database/local-development#troubleshooting) for CLI-specific fixes.

**Important:** A `prisma+postgres://` URL in `.env` **without** `npx prisma dev` running causes one slow probe per cache window (~30s), then JSON fallback. Fix by switching to Option A or B, or start `npx prisma dev`.

---

## Quick decision guide

| Goal | What to put in `.env` |
|------|------------------------|
| Fastest `/trade` UI work | Omit `DATABASE_URL` (Option A) |
| Full marketplace checkout + admin | `postgresql://…` (Option B) |
| Prisma CLI local Postgres | Run `npx prisma dev`, use printed `prisma+postgres://` (Option C) |

## Related

- [`.env.example`](../../.env.example) — variable comments
- [`migration-baseline.md`](./migration-baseline.md) — non-empty DB migration history
- [`README.md` — Marketplace database](../../README.md#marketplace-database)
