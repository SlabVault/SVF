# Discover aggregator setup

> **Status: ARCHIVED (May 2026)**  
> The custom `/discover` deep-link aggregator MVP is **removed from public navigation and redirects to `/trade`**. **Primary purchase lane:** [`/trade`](../integrations/rwa-trading-platform.md) (Tensor-fork aggregator desk). Code, sync scripts, and schema remain for operator tooling only.

Read-only `/discover` previously indexed graded slabs on partner Solana marketplaces (Collector Crypt, Phygitals, manual seed rows). That lane is superseded by on-site trading at `/trade`.

## Public behavior (current)

| Route | Behavior |
|-------|----------|
| `/discover`, `/discover/*` | **308 → `/trade`** |
| Nav / sitemap | Discover **omitted** — Trade only |
| `DISCOVER_AGGREGATOR_ENABLED` | **Ignored** — no public reactivation |

## Operator tooling (retained)

```bash
# Refresh Collector Crypt rows into data/external-listings.json
npm run sync:discover
```

Target **50+ active rows** before using seed data in staging experiments. JSON seed is used when `DATABASE_URL` is unset or the DB is unreachable.

When `DATABASE_URL` is set, `npm run sync:discover` also upserts active rows into Postgres `ExternalListing`. Use `postgresql://` for a direct Postgres connection; use `prisma+postgres://` only with Prisma dev or Accelerate (see `.env.example`).

## Verify locally

```bash
npm run dev
# http://localhost:3000/discover → redirects to /trade
npm run e2e:smoke -- --base-url http://localhost:3000
```

## Related files

- `lib/discover-config.ts` — always returns `false` (archived)
- `lib/partner-listings.ts` — **primary** trade read path for CC + Phygitals (`/api/trade/partners/*`)
- `lib/external-listings-sync.ts` — Collector Crypt ingest
- `data/external-listings.json` — JSON seed fallback
- `docs/integrations/phygitals-collectorcrypt.md` — partner BFF contract (partner-first; Tensor API optional)
- `docs/integrations/solana-marketplace-aggregator.md` — original research (ARCHIVED)
