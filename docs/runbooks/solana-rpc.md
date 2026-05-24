# Solana RPC (wallet balances + server tx)

Wallet connect and portfolio SOL balance use a **browser-reachable** RPC. Server routes (payment verify, `/api/trade/tx/*`, Helius DAS) use a **server** RPC. The public `api.mainnet-beta.solana.com` endpoint is rate-limited and often returns **403 Access forbidden** — set a dedicated provider for local dev and production.

## Required env vars

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Client | Wallet adapter `ConnectionProvider`, portfolio balance chip, checkout client reads. **Primary name.** |
| `NEXT_PUBLIC_SOLANA_RPC` | Client | Legacy alias — still supported. |
| `SOLANA_RPC_URL` | Server | Payment verify, tx simulation, Tensor BFF. |
| `HELIUS_API_KEY` | Server | Builds `https://mainnet.helius-rpc.com/?api-key=…` when `SOLANA_RPC_URL` is unset. Also powers DAS wallet NFT holdings (`/api/trade/wallet/nfts`). |
| `HELIUS_RPC_URL` | Server | Optional override for Helius RPC base URL. |

**Never** put `HELIUS_API_KEY` in a `NEXT_PUBLIC_*` variable — it would ship to the browser bundle.

## Local dev quick start

1. Create a free Helius (or QuickNode) mainnet RPC URL.
2. Add to `.env.local`:

```bash
NEXT_PUBLIC_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
HELIUS_API_KEY=YOUR_KEY
```

3. Restart `npm run dev`.

If only `HELIUS_API_KEY` is set, **server** routes use Helius automatically; the **client** still needs `NEXT_PUBLIC_SOLANA_RPC_URL` (same Helius URL is fine — the key is already public in browser network traffic when used as RPC URL).

## Graceful degradation

When RPC returns 403/401/429 or balance fetch fails:

- Wallet **still connects** (signing is local).
- SOL balance shows **—** instead of throwing.
- Console logs: `Configure NEXT_PUBLIC_SOLANA_RPC_URL (Helius or QuickNode) for wallet balances.`
- Unhandled promise rejections from balance reads are suppressed in `components/wallet-provider.tsx`.

Portfolio NFT grid uses Helius DAS via `/api/trade/wallet/nfts` — without `HELIUS_API_KEY`, holdings show empty with an inline hint.

## RPC response caching (Helius credit savings)

| Path | Cache | TTL | Notes |
|------|-------|-----|-------|
| Client `getBalance` | Memory + `sessionStorage` per pubkey | **60s** | In-flight dedupe; `fetchSolBalanceLamports` in `lib/solana-config.ts` |
| Server `/api/trade/wallet/nfts` | Next.js `unstable_cache` keyed by `owner` | **120s** | `Cache-Control: private, max-age=60` on JSON response |
| Helius DAS `searchAssets` fetch | Next.js fetch `revalidate` in `lib/helius-das.ts` | **120s** | Underlying DAS POST |

**Do not cache:** tx submission, blockhash for writes, or any `/api/trade/tx/*` routes.

Implementation: `lib/rpc-cache.ts` (client balance), `app/api/trade/wallet/nfts/route.ts` (server inventory).

## Code map

- `lib/solana-config.ts` — URL resolution, Helius builder, cached balance fetch
- `lib/rpc-cache.ts` — client balance cache (60s TTL, dedupe)
- `components/wallet-provider.tsx` — client endpoint + rejection guard
- `lib/marketplace-config.ts` — re-exports `getSolanaRpcUrl()` for checkout/payment
- `lib/helius-das.ts` — DAS reads (server Helius only)

See also: [local-dev-database.md](./local-dev-database.md) for Postgres; [../trade-staging-checklist.md](../trade-staging-checklist.md) for staging env.
