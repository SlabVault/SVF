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

## Open Graph and Twitter images

- [`app/opengraph-image.tsx`](app/opengraph-image.tsx) — dynamic Open Graph image (1200×630) via the Next.js App Router file convention (`/opengraph-image`).
- [`app/twitter-image.tsx`](app/twitter-image.tsx) — dynamic Twitter large card (`/twitter-image`).

Root `metadata` sets titles, descriptions, and your X handle; Next wires the dynamic image routes automatically. If you want an extra **static** 1200×630 file for non-Next tools, add `public/og.png` yourself and extend `metadata.openGraph.images` / `metadata.twitter.images` in [`app/layout.tsx`](app/layout.tsx).

## Scripts

```bash
npm install
npm run dev
npm run lint
npm run build
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
