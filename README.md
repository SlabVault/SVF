# SlabVaultFi website

Marketing site for [SlabVaultFi](https://github.com/SlabVault/SVF): home, vault gallery, pull history, and community links. Built with **Next.js (App Router)** and **Tailwind CSS**.

## Content (no code deploys for copy changes)

| File | Purpose |
|------|---------|
| [`data/site.json`](data/site.json) | Branding, all official URLs, latest pull/slab highlights, stream embed, roadmap |
| [`data/slabs.json`](data/slabs.json) | Vault grid on `/vault` |
| [`data/pulls.json`](data/pulls.json) | Pull ledger on `/pulls` |

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SITE_URL` | **Recommended in production** | Canonical site origin for Open Graph, `sitemap.xml`, and `robots.txt` (e.g. `https://www.slabvaultfi.com`). Defaults to `http://localhost:3000`. |
| `NEXT_PUBLIC_TOKEN_CA` | Optional | Overrides the Solana mint in `data/site.json` for Dexscreener stats. |
| `SOLANA_RPC_URL` | Optional | Solana RPC provider URL for wallet queries and data sync. Defaults to public mainnet-beta RPC. Recommended: Helius, QuickNode, or similar for production. |
| `DATABASE_URL` | Optional for v1 | PostgreSQL for live marketplace checkout. **Omit** to serve demo listings from `data/slabs.json`. |
| `ADMIN_PASSWORD` | Optional | Admin dashboard login (with `NEXTAUTH_SECRET` / `NEXTAUTH_URL`). |
| `NEXTAUTH_SECRET` | Optional | Session signing for admin. |
| `NEXTAUTH_URL` | Optional | Same origin as the site (e.g. `http://localhost:3000`). |

Copy [`.env.example`](.env.example) to `.env.local` and adjust. Marketplace without a working DB still shows slabs from `data/slabs.json`.

Root `metadataBase` uses `NEXT_PUBLIC_SITE_URL` (see `app/layout.tsx`). Set it in production so OG URLs, `sitemap.xml`, and canonical links resolve to your live domain.

## Marketplace database

```bash
npm run db:push   # apply Prisma schema
npm run db:seed   # seed slabs from data/slabs.json
```

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
```

Local preview: [http://localhost:3000](http://localhost:3000).

## Deploy on Vercel

1. Import the GitHub repo in [Vercel](https://vercel.com/new).
2. Framework preset: **Next.js** (default).
3. **Environment variables:** set `NEXT_PUBLIC_SITE_URL` to your production URL (include `https://`, no trailing slash).
4. Deploy. Vercel runs `next build` automatically.

Market data on the homepage comes from the **Dexscreener public API** (cached ~3 minutes). Numbers are indicative; users should verify on Dexscreener and Birdeye.

## License

Private / all rights reserved unless the repository owner specifies otherwise.
