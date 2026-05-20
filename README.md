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
| `CRON_SECRET` | Optional | Protects `POST /api/sync`. Vercel cron sends `Authorization: Bearer CRON_SECRET` when set. |
| `NEXTAUTH_SECRET` | Optional | Session signing for admin. |
| `NEXTAUTH_URL` | Optional | Same origin as the site (e.g. `http://localhost:3000`). |

Copy [`.env.example`](.env.example) to `.env.local` and adjust.

## Marketplace database

Use a **direct** PostgreSQL URL in `.env` or `.env.local`:

```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/slabvault
```

If your `.env` has a `prisma+postgres://` URL from `prisma init`, replace it with a direct connection or start the local Prisma Postgres server with `npx prisma dev`.

```bash
# Apply schema (development)
npx prisma migrate dev --name marketplace-checkout

# Or push without migration history
npm run db:push

# Seed AVAILABLE slabs from data/slabs.json
npm run db:seed
```

### Marketplace flow

1. **List** — `/marketplace` reads slabs from PostgreSQL (falls back to `data/slabs.json` if no `DATABASE_URL`).
2. **Reserve** — Buyer connects wallet, reserves slab → `RESERVED` + pending `Transaction`.
3. **Checkout** — Split payment: SOL transfer + SVF SPL transfer to treasury. Signatures verified server-side.
4. **Fulfillment** — Slab marked `SOLD`; transaction → `PENDING_FULFILLMENT`. Admin marks complete after transferring slab from deployer wallet (Collector Crypt / off-chain for v1).

## Open Graph and Twitter images

- [`app/opengraph-image.tsx`](app/opengraph-image.tsx) — primary 1200×630 OG/Twitter image (`/opengraph-image`), wired in root metadata.
- [`public/og.png`](public/og.png) — optional static fallback; replace with full 1200×630 artwork if you prefer a file-based card.
- [`app/twitter-image.tsx`](app/twitter-image.tsx) — dynamic Twitter route (`/twitter-image`).

## Scripts

```bash
npm install
npm run dev
npm run lint
npm run build   # uses webpack on Windows for reliable production builds
npm run db:push
npm run db:seed
npm run sync    # refresh data/slabs.json, pulls.json, site.json from scrapers
```

**Admin:** `/admin` includes a **Run sync now** button (POST `/api/sync`, requires admin session or `CRON_SECRET`) with `lastSyncAt` from `data/site.json`.

Local preview: [http://localhost:3000](http://localhost:3000).

Copy [`.env.example`](.env.example) to `.env.local` for local overrides. Production values are set in the Vercel project dashboard.

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

## License

Private / all rights reserved unless the repository owner specifies otherwise.
