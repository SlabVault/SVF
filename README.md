# SlabVaultFi website

Marketing site for [SlabVaultFi](https://github.com/SlabVault/SVF): home, vault gallery, pull history, marketplace checkout, and community links. Built with **Next.js (App Router)**, **Tailwind CSS**, **Prisma**, and **Solana wallet-adapter**.

## Content (no code deploys for copy changes)

| File | Purpose |
|------|---------|
| [`data/site.json`](data/site.json) | Branding, all official URLs, treasury/deployer wallets, latest pull/slab highlights, stream embed, roadmap |
| [`data/slabs.json`](data/slabs.json) | Vault grid on `/vault` and marketplace seed data |
| [`data/pulls.json`](data/pulls.json) | Pull ledger on `/pulls` |

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SITE_URL` | **Recommended in production** | Canonical site origin for Open Graph, `sitemap.xml`, and `robots.txt` (e.g. `https://slabvault.xyz`). Defaults to `http://localhost:3000`. |
| `NEXT_PUBLIC_TOKEN_CA` | Optional | Overrides the Solana mint in `data/site.json` for Dexscreener stats. |
| `DATABASE_URL` | **Required for live checkout** | Direct `postgresql://` connection string. Omit to serve demo listings from `data/slabs.json` (browse-only). Do **not** use `prisma+postgres://` for local dev unless you run `npx prisma dev` — use a direct Postgres URL instead. |
| `NEXT_PUBLIC_SOLANA_RPC` | **Recommended** | Solana RPC URL for wallet connect and checkout (client). Defaults to public mainnet-beta. Use Helius/QuickNode in production. |
| `SOLANA_RPC_URL` | Optional | Server-side RPC for payment verification. Falls back to `NEXT_PUBLIC_SOLANA_RPC`. |
| `TREASURY_WALLET_ADDRESS` | Optional | Receives SOL + SVF payments. Default: Squads treasury `2oRZe7z9Jx3rpoUWuidjGhpX9mxxhtps2JqQtdxLfHwg`. |
| `DEPLOYER_WALLET_ADDRESS` | Optional | Deployer vault (SNS: slabvault.sol). Default: `CWqc6DQhHxdnDSwrjG3LGnyWPQ3dRNfCY5umvTj8NBE3`. Slabs are fulfilled from this wallet. |
| `SVF_TOKEN_MINT` | Optional | $SVF SPL mint. Default: `6ZxRa2CWtAcWKb58RMJABuiUYWu9o4oM76QCyMVLpump`. |
| `SERVER_WALLET_SECRET` | Optional | Deployer secret key as JSON byte array for future auto-fulfillment. **Never commit.** v1 uses manual admin fulfillment. |
| `ADMIN_PASSWORD` | Optional | Admin dashboard login (with `NEXTAUTH_SECRET` / `NEXTAUTH_URL`). |
| `CRON_SECRET` | **Required in production** | Protects cron-only routes (`POST /api/sync`, `POST /api/cron/expire-reservations`). Vercel cron must send `Authorization: Bearer CRON_SECRET`. |
| `SYNC_API_TOKEN` | Optional (recommended) | Dedicated bearer token for `/api/sync` automation. If omitted, `/api/sync` bearer auth falls back to `ADMIN_PASSWORD` for backward compatibility. |
| `NEXTAUTH_SECRET` | Optional | Session signing for admin. |
| `NEXTAUTH_URL` | Optional | Same origin as the site (e.g. `http://localhost:3000`). |

Copy [`.env.example`](.env.example) to `.env.local` and adjust.

### Environment contract checks

Run these before production deploys:

```bash
# Validate required production envs and placeholder secrets
npm run ops:env:production

# Full operator checks (env + robots + sync/cron auth checks)
npm run ops:check -- --base-url https://slabvault.xyz
```

## Marketplace database

Use a **direct** PostgreSQL URL in `.env` or `.env.local`:

```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/slabvault
```

If your `.env` has a `prisma+postgres://` URL from `prisma init`, replace it with a direct connection or start the local Prisma Postgres server with `npx prisma dev`. See **`docs/runbooks/local-dev-database.md`** for Option A (no DB / JSON fallback), Option B (direct Postgres), and Option C (`prisma dev` + Windows/Node 22 notes).

**Trade desk without Postgres:** omit `DATABASE_URL` (or leave the proxy URL unset while developing browse-only). Partner listings read from `data/external-listings.json` (`npm run sync:discover`); vault treasury listings read from `data/slabs.json`. Checkout and admin still require a reachable database.

```bash
# Validate migration + schema health (recommended before checkout/admin testing)
npm run db:preflight:warn

# Apply schema (development)
npx prisma migrate dev --name marketplace-checkout

# Or push without migration history
npm run db:push

# Seed AVAILABLE slabs from data/slabs.json
npm run db:seed
```

### Safe baseline for non-empty databases

If your database already contains marketplace tables but lacks migration history (`_prisma_migrations` missing), use the safe baseline flow:

```bash
npm run db:baseline:plan
```

Then follow `docs/runbooks/migration-baseline.md` exactly. This avoids destructive resets and prevents silent schema drift (for example missing `Transaction.paymentSplit`).

For targeted PaymentSplit drift diagnostics:

```bash
npm run db:repair:payment-split:plan
```

### Marketplace flow

1. **List** — `/marketplace` reads slabs from PostgreSQL (falls back to `data/slabs.json` if no `DATABASE_URL`).
2. **Reserve** — Buyer connects wallet, reserves slab → `RESERVED` + pending `Transaction`.
3. **Checkout** — Split payment: SOL transfer + SVF SPL transfer to treasury. Signatures verified server-side.
4. **Fulfillment** — Slab marked `SOLD`; transaction → `PENDING_FULFILLMENT`. Admin marks complete after transferring slab from deployer wallet (Collector Crypt / off-chain for v1).
5. **Reservation cleanup** — A cron route releases expired `RESERVED` slabs every 10 minutes (`POST /api/cron/expire-reservations`).

## GRAILS trade desk — partner listing ingest

`/trade` and `/trade/c/collector-crypt` read graded inventory from partner ingest (not seed-only stubs):

```bash
# Refresh Collector Crypt scrape + Phygitals seed timestamps → data/external-listings.json
npm run sync:discover

# When DATABASE_URL is set, also upserts ExternalListing rows in Postgres
```

| Environment | Data path |
|-------------|-----------|
| Local dev (no DB) | `data/external-listings.json` + `data/slabs.json` (treasury) |
| Staging / prod | Postgres `ExternalListing` cache; JSON fallback if DB empty |

Vercel cron (`vercel.json`) calls `POST /api/sync` every 30 minutes with `CRON_SECRET` — that sync includes partner listings (`external-listings:discover` in sync diagnostics).

Optional env: `TENSOR_API_KEY` (24h vol/Δ on landing), `PARTNER_LIVE_SCRAPE_ENABLED=true` (CC live scrape on collection pages), `HELIUS_API_KEY` (DAS enrichment).

See [`docs/integrations/grails-step-by-step-plan.md`](docs/integrations/grails-step-by-step-plan.md) and [`docs/runbooks/operations-hardening.md`](docs/runbooks/operations-hardening.md).

## Open Graph and Twitter images

- [`app/opengraph-image.tsx`](app/opengraph-image.tsx) — primary 1200×630 OG/Twitter image (`/opengraph-image`), wired in root metadata.
- [`public/og.png`](public/og.png) — optional static fallback; replace with full 1200×630 artwork if you prefer a file-based card.
- [`app/twitter-image.tsx`](app/twitter-image.tsx) — dynamic Twitter route (`/twitter-image`).

## Scripts

```bash
npm install
# Stop any running node dev/build terminals first, then:
npm run dev:clean   # preferred local start — wipes .next then dev (see troubleshooting)
npm run dev         # normal start when .next is healthy
npm run lint
npm run test
npm run test:guardrails
npm run test:api
npm run build   # uses webpack on Windows for reliable production builds
npm run qa:local
npm run qa:ci
npm run db:push
npm run db:seed
npm run db:preflight
npm run db:baseline:plan
npm run db:repair:payment-split:plan
npm run sync    # refresh data/slabs.json, pulls.json, site.json from scrapers
npm run sync:discover  # GRAILS partner listings → external-listings.json (+ Postgres upsert)
npm run ops:env
npm run ops:verify -- --base-url http://localhost:3000
```

**Admin:** `/admin` includes a **Run sync now** button (POST `/api/sync`, requires admin session or `Authorization: Bearer ...`) with `lastSyncAt` from `data/site.json`.

Local preview: [http://localhost:3000](http://localhost:3000).

Copy [`.env.example`](.env.example) to `.env.local` for local overrides. Production values are set in the Vercel project dashboard.

### Dev troubleshooting (corrupted `.next`)

If `/` or `/trade` return **500** with `ENOENT ... .next/dev/routes-manifest.json` or missing `.next/dev/cache/webpack/*.pack.gz`, the dev cache is corrupted — usually from running **`npm run dev` and `npm run build` at the same time**, deleting `.next` while the dev server is still running, or switching between Turbopack (`npm run dev:turbopack`) and webpack (`npm run dev`).

**Recovery:**

1. **Stop all Node processes** — Ctrl+C every dev terminal, close parallel `npm run build` / test runners, and quit stray `node.exe` in Task Manager if needed.
2. Run `npm run dev:clean` (runs `clean:next` which removes stale `.next/lock`, webpack cache, then the full `.next` tree).
3. Use **`npm run dev:clean`** after corruption or when switching bundlers; use **`npm run dev`** only when `.next` is already healthy.
4. Reserve `dev:turbopack` for experiments only — default local dev is webpack (`npm run dev` / `dev:clean`).

MetaMask errors in the browser console are harmless noise from the Ethereum browser extension — SlabVault connects Phantom/Solflare on Solana only.

### Slab images

Slab photos are loaded from **direct HTTPS URLs** in `data/slabs.json` (Vollector / Collector Crypt CloudFront CDN, Collectr, etc.). The shared `SlabImage` component uses native `<img>` tags with lazy loading and placeholders for missing or failed images.

When adding slabs, copy the **front image URL** from the Vollector collectible page (or your CDN). Example host: `d1xpxki1g4htqu.cloudfront.net`. `next.config.ts` also lists allowed hosts if you switch to `next/image` later.

## Custom domain (slabvault.xyz on Hostinger → Vercel)

Develop locally with `npm run dev` as usual. Point DNS at Vercel only when you are ready for production traffic.

### 1. Deploy on Vercel

1. Import the GitHub repo in [Vercel](https://vercel.com/new).
2. Framework preset: **Next.js** (default).
3. **Environment variables** (Production + Preview as needed):
   - `NEXT_PUBLIC_SITE_URL` = `https://slabvault.xyz` (no trailing slash)
   - Add `DATABASE_URL` and other secrets from `.env.example` if you use marketplace/admin features.
4. Deploy. Vercel assigns a `*.vercel.app` URL immediately.

### 2. Add domain in Vercel

1. Project → **Settings** → **Domains**.
2. Add `slabvault.xyz` and `www.slabvault.xyz`.
3. Vercel shows the DNS records to create. Use the values below if Hostinger asks for generic Vercel records.

### 3. Hostinger DNS records

In Hostinger → **Domains** → **slabvault.xyz** → **DNS / Nameservers** → **DNS records**:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| **A** | `@` | `76.76.21.21` | 3600 (or default) |
| **CNAME** | `www` | `cname.vercel-dns.com` | 3600 (or default) |

**Apex vs www:** The **A record** on `@` serves `https://slabvault.xyz`. The **CNAME** on `www` serves `https://www.slabvault.xyz`. In Vercel Domains, set one as primary and redirect the other (recommended: primary `slabvault.xyz`, redirect `www` → apex).

**Alternative (www only):** Skip the apex A record and use Hostinger **domain forwarding** to redirect `slabvault.xyz` → `https://www.slabvault.xyz`, with only the `www` CNAME above.

DNS can take up to 24–48 hours to propagate; often much faster.

### 4. Verify

- Vercel Domains tab shows **Valid Configuration** for both hostnames.
- Visit `https://slabvault.xyz` — should show your latest deployment.
- Local dev at `http://localhost:3000` is unchanged and does not use the custom domain.

## Deploy on Vercel (summary)

1. Import the GitHub repo in [Vercel](https://vercel.com/new).
2. Framework preset: **Next.js** (default).
3. **Environment variables:** set `NEXT_PUBLIC_SITE_URL`, `DATABASE_URL`, `NEXT_PUBLIC_SOLANA_RPC`, and treasury/deployer addresses.
4. Deploy. Vercel runs `next build` automatically.

Market data on the homepage comes from the **Dexscreener public API** (cached ~3 minutes). Numbers are indicative; users should verify on Dexscreener and Birdeye.

## Deployment runbook (migrations + rollback)

1. Ensure production env vars are present in Vercel (`NEXT_PUBLIC_SITE_URL`, `DATABASE_URL`, `NEXTAUTH_SECRET`, `ADMIN_PASSWORD`, `CRON_SECRET`).
2. Run migration deploy against production database:
   ```bash
   npx prisma migrate deploy
   ```
3. Deploy application build.
4. Smoke test critical flow:
   - `/marketplace` loads live listings
   - reserve -> checkout -> admin fulfill works for a test slab
   - `/api/sync` and `/api/cron/expire-reservations` return 401 without bearer token
5. Rollback strategy:
   - Re-deploy previous Vercel deployment
   - If schema rollback is required, apply a dedicated corrective migration (do not manually edit production tables)

For a step-by-step operator checklist (pre-deploy gates, cron auth checks, and rollback workflow), see [`docs/runbooks/operations-hardening.md`](docs/runbooks/operations-hardening.md).

## License

Private / all rights reserved unless the repository owner specifies otherwise.
