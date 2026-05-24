# Security Checklist

## Current baseline (implemented)

- [x] `proxy.ts` applies security headers and API rate limiting.
- [x] Production responses disable `x-powered-by` and include stricter baseline headers.
- [x] Admin pages are session-gated via NextAuth and proxy redirect.
- [x] Admin and marketplace write routes accept admin session auth (with bearer fallback).
- [x] Checkout verifies SOL + SVF on-chain signatures server-side.
- [x] Replay protection exists at schema and API layer for payment signatures.
- [x] Reservation TTL and expiry cleanup route protect inventory lock abuse.
- [x] Sync/cron unauthorized responses return bearer challenge headers.
- [x] Operator checks exist for env contract and sync/cron auth (`ops:env`, `ops:verify`).
- [x] Sensitive auth/admin routes set no-store cache headers.
- [x] Proxy applies stricter request throttling for `/api/auth/*`.
- [x] In-memory rate limiter prunes expired windows and caps map growth.
- [x] CSRF origin checks on admin + marketplace write APIs (`lib/csrf.ts`, `tests/csrf.test.ts`).
- [x] Optional signed wallet challenge for reserve (`lib/wallet-challenge.ts`; `RESERVE_REQUIRE_WALLET_CHALLENGE`).
- [x] API guardrail tests for reserve, checkout, fulfill, sync/cron, CSRF, wallet UX (`tests/api-*-guardrails.test.ts`).
- [x] `npm run qa:ci` (lint + test + build) enforced in GitHub Actions CI (`.github/workflows/ci.yml`).

## Pre-production must-pass

### Auth and authorization
- [ ] Replace shared `ADMIN_PASSWORD` model with per-user admin accounts + hashed credentials.
- [x] Add role-based authorization checks for all admin API handlers — all 6 `/api/admin/*` route handlers call `requireAdminRole` after auth (`lib/admin-auth.ts`); bearer token fallback retains full access (transitional until per-user accounts, P0-SEC-11).
- [x] Add CSRF strategy for state-changing admin operations (`lib/csrf.ts` origin checks on admin + marketplace writes).

### API hardening
- [ ] Move rate limiting to a durable backend (Upstash KV/Redis) in production.
- [x] Restrict transaction status data to wallet owner/admin only — `lib/wallet-transaction-access.ts`; signed access via `walletSignature` + `accessExpires` when `TRANSACTION_ACCESS_REQUIRE_WALLET_SIGNATURE=true` (production default). Unverified callers get status-only payload without signatures/fulfillment fields.
- [x] Signed wallet access for purchases list — `components/marketplace-purchases-client.tsx` calls `buildTransactionsListAccessQuery` with `signMessage`; falls back to unsigned `buyerWallet` when wallet cannot sign (P1-WAL-06).
- [x] Add signed wallet challenge for reserve endpoint (anti-griefing) — implemented; enable via `RESERVE_REQUIRE_WALLET_CHALLENGE=true` in production.

### Wallet and payment safety
- [x] Keep checkout idempotent under retries and tab refreshes (guardrail tests in `tests/api-marketplace-checkout-guardrails.test.ts`).
- [ ] Add monitoring for failed chain verification and repeated replay attempts.
- [ ] Formalize transfer vs burn economics wording across product and docs.

### Contracts and custody
- [ ] Audit escrow/fulfillment contract paths before enabling auto-fulfillment.
- [x] Add runbook for custody incidents and manual fulfillment dispute handling — [`docs/runbooks/custody-fulfillment-incidents.md`](docs/runbooks/custody-fulfillment-incidents.md) (reservation stuck, payment verified / fulfillment pending, dispute escalation, manual fulfill rollback, comms templates; cross-link from [`docs/runbooks/operations-hardening.md`](docs/runbooks/operations-hardening.md)).

### Testing and observability
- [x] Add API integration tests for reserve/checkout/fulfill (guardrail + route tests under `tests/`).
- [x] Add HTTP smoke script for post-deploy checks (`npm run e2e:smoke`; full Playwright suite still TODO).
- [ ] Add production error tracking and alerting (Sentry or equivalent).

## Deployment controls

- [x] Production must set: `NEXT_PUBLIC_SITE_URL`, `DATABASE_URL`, `NEXTAUTH_SECRET`, `ADMIN_PASSWORD`, `CRON_SECRET`.
- [x] Cron endpoints must only accept `Authorization: Bearer CRON_SECRET`.
- [x] Verify `/admin` and `/api/*` are disallowed in `robots.txt`.
- [x] Run `npm run ops:check -- --base-url <deployment-url>` after each deploy.

## Partner webhooks (pre-ship)

- [x] `lib/partner-webhook-auth.ts` — `requirePartnerWebhookAuth` validates `Authorization: Bearer` against `PARTNER_WEBHOOK_SECRET`.
- [x] Unit tests in `tests/partner-webhook-auth.test.ts` (`npm run test:guardrails`).
- [x] `PARTNER_WEBHOOK_SECRET` documented in `.env.example`; `npm run ops:env -- --production` warns when `PARTNER_WEBHOOK_ENABLED=true` without a configured secret (P2-SEC-01).
- [ ] Wire partner webhook routes when ingest webhooks ship.
- [x] Partner BFF `?live=1` live-scrape trigger requires sync/cron/admin auth in production (`/api/trade/partners/[platform]/listings` + `/stats`); public reads unchanged without `live=1`.

## GRAILS `/trade` tx BFF (Segment 9)

- [x] Write paths gated by `TENSOR_TRADE_WRITE_ENABLED` (server) + `NEXT_PUBLIC_TENSOR_TRADE_WRITE_ENABLED` (UI).
- [x] `TENSOR_API_KEY` is server-only (never `NEXT_PUBLIC_*`).
- [x] Optional origin gate on `/api/trade/tx/*` — set `TENSOR_TX_REQUIRE_TRUSTED_ORIGIN=true` in production after write paths ship (documented in `.env.example`; staging steps in `docs/trade-staging-checklist.md`). Helper: `requireTrustedTensorTxOrigin` in `lib/onchain/tensor-tx-bff.ts` — when enabled, rejects GET tx builders whose `Origin`/`Referer` is outside `getTrustedOrigins()` (`NEXT_PUBLIC_SITE_URL`, `NEXTAUTH_URL`; localhost allowed in dev). Returns `403` / `TRADE_TX_ORIGIN_REJECTED`. Default off. Wired on buy, list, bid, delist, and cancel-bid routes (before write gate).
- [x] CSRF N/A for GET tx builders; use origin gate + rate limits instead of `requireCsrfProtection` (POST-only). Policy documented on buy route; all five tx builders are GET-only.
- [x] `tests/api-trade-tx-guardrails.test.ts` in `npm run test:guardrails` (glob `api-*-guardrails`).
- [x] Wallet challenge on trade tx routes — `TRADE_TX_REQUIRE_WALLET_CHALLENGE` wired on buy, list, bid, delist, and cancel-bid (`requireTradeTxWalletChallenge`). `npm run ops:env -- --production` warns when `TENSOR_TRADE_WRITE_ENABLED` is true without this flag.
- [ ] **Upstash migration for `/api/trade/tx/*` rate limits:** `proxy.ts` already applies a strict bucket (20 req/min per client IP) on `/api/trade/tx/*` via `checkRateLimit()` in `lib/security.ts`. Set production `KV_REST_API_URL` + `KV_REST_API_TOKEN` (see `.env.example`) so limits are durable across Vercel instances; without both vars, each instance keeps separate in-memory counters. After deploy, confirm `X-RateLimit-Limit: 20` on tx routes and `429` under burst (`tests/proxy-rate-limit.test.ts`). Closes when production uses Upstash and ops runbook verification is done (`docs/runbooks/operations-hardening.md`).

## Post-deployment routine

- [ ] Weekly dependency and vulnerability review.
- [ ] Monthly security regression test of checkout + admin surfaces.
- [x] Quarterly key rotation for admin, cron, and sync bearer secrets (`docs/runbooks/operations-hardening.md` §6; `npm run ops:rotation:check`).

## Residual dependency risks (deferred this pass)

Last reviewed: **2026-05-21** (`npm audit`, 955 total deps)

| Severity | Count | Package | Advisory | Safe fix available? |
|----------|-------|---------|----------|---------------------|
| High | 3 | `bigint-buffer` → `@solana/spl-token` | [GHSA-3gc7-fjrx-p6mg](https://github.com/advisories/GHSA-3gc7-fjrx-p6mg) (buffer overflow in `toBigIntLE`) | No — audit proposes `@solana/spl-token@0.1.8` (breaking major downgrade) |
| Moderate | 3 | `postcss` → `next@16.2.6` | [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) (XSS via unescaped `</style>`) | No — audit proposes invalid `next@9.3.3` downgrade |
| Moderate | 1 | `next-auth` (via `@auth/core`, `next`) | Transitive chain from auth stack | No — wait for upstream patch |
| Low | 2 | `cookie` → `@auth/core` → `next-auth` | [GHSA-pxg6-pf52-xh8x](https://github.com/advisories/GHSA-pxg6-pf52-xh8x) (OOB cookie chars) | No — downgrade path not merge-safe |

**Audit totals:** 8 vulnerabilities (0 critical, 3 high, 3 moderate, 2 low).

### Deferred items (operator decision required)

- [ ] `bigint-buffer` (`GHSA-3gc7-fjrx-p6mg`, high) via `@solana/spl-token`.
  - Current `npm audit` remediation requires forced downgrade to `@solana/spl-token@0.1.8` (breaking and not merge-safe with current Solana stack).
  - **Operator decision needed:** approve a coordinated Solana dependency strategy (alternate library path, temporary feature isolation, or accepted risk with compensating controls).
- [ ] `postcss` (`GHSA-qx2v-qp2m-jg93`, moderate) transitive under `next@16.2.6`.
  - `npm audit` currently proposes an invalid/unsafe major jump (`next@9.3.3`) and no safe automated fix.
  - **Operator decision needed:** wait for Next.js patched release or approve a tested framework upgrade window.
- [ ] `cookie` (`GHSA-pxg6-pf52-xh8x`, low) transitive under `@auth/core` / `next-auth`.
  - Automated remediation path forces a non-merge-safe downgrade path in audit output.
  - **Operator decision needed:** track upstream `next-auth` advisory resolution and upgrade when a verified patch path is available.

### Safe actions taken this pass

- Reconciled checklist with shipped CSRF, wallet challenge, guardrail tests, and CI `qa:ci` wiring.
- Documented current audit snapshot in this checklist (no forced dependency downgrades).
- Centralized `metadataBase` via `getMetadataBase()` in `lib/seo.ts`.
- Added growth instrumentation on primary nav, live-pull, quick-link, and purchase CTAs.
- Added route loading skeleton for `/vault` and LCP `priority` hints on listing detail images.
