# Custody and Fulfillment Incident Runbook

Operator guide for vault checkout custody issues, stuck reservations, payment–fulfillment gaps, disputes, and mistaken admin fulfillment. v1 uses **manual admin fulfillment** via `/admin/transactions`; auto-fulfillment via `SERVER_WALLET_SECRET` is not enabled in production.

Related runbooks:

- [Operations hardening](./operations-hardening.md) — deploy, cron auth, rollback
- [Migration baseline](./migration-baseline.md) — forward-only schema corrections
- [Vault-to-trade listings](../integrations/vault-to-trade-listings.md) — GRAILS trade lane: fulfillment only after on-chain TCM fill

---

## Scope and hard rules

| Lane | Fulfillment trigger | Never do |
|------|---------------------|----------|
| Legacy vault checkout (`/vault/shop`, `/api/marketplace/*`) | `Transaction.status = PENDING_FULFILLMENT` after server-verified SOL + SVF | Ship, transfer custody, or mark `COMPLETED` without verified payment |
| GRAILS `/trade` (TCM) | On-chain fill tx confirmed → admin queue | Fulfill on reservation or listing view alone |

**Custody rule:** SlabVault does not transfer physical slabs or mark fulfillment complete until payment (legacy) or on-chain sale (trade) is verified server-side.

---

## Contacts (placeholders — fill in ops wiki, never commit real secrets)

| Role | Handle / channel | When to page |
|------|------------------|--------------|
| On-call operator | `<OPS_ONCALL_SLACK>` or `<OPS_PAGER_EMAIL>` | Any P1 custody gap > 2 h or buyer-reported double-charge |
| Vault / shipping lead | `<VAULT_OPS_CONTACT>` | Physical shipment, wrong slab, or inventory mismatch |
| Deployer wallet custodian | `<DEPLOYER_WALLET_CUSTODIAN>` | On-chain transfer from treasury deployer required |
| Engineering escalation | `<ENG_ESCALATION_CHANNEL>` | Schema repair, API 5xx on fulfill, suspected auth bypass |
| Legal / disputes | `<DISPUTES_CONTACT>` | Chargeback threat, fraud, or regulatory inquiry |

Store rotation dates and runbook URLs in your internal ops wiki. Do **not** paste `ADMIN_PASSWORD`, `CRON_SECRET`, `SERVER_WALLET_SECRET`, or buyer PII into tickets or git.

---

## Transaction status reference

| Status | Meaning | Operator action |
|--------|---------|-----------------|
| `PENDING` | Reserved; awaiting checkout | Wait for TTL or investigate stuck reservation (below) |
| `PENDING_FULFILLMENT` | Payment verified; slab not yet delivered | Queue in `/admin/transactions?status=PENDING_FULFILLMENT` |
| `COMPLETED` | Admin marked fulfilled; slab → `SOLD` | Read-only unless rollback required (below) |
| `CANCELLED` | Reservation expired or checkout aborted | Slab should be `AVAILABLE` |
| `FAILED` | Checkout or verification failed | Confirm slab released; no fulfillment |

State machine: `lib/transaction-state.ts`. Admin fulfill API: `PATCH /api/admin/transactions/:id/fulfill` (requires admin session; transitions `PENDING_FULFILLMENT` → `COMPLETED`).

---

## Incident 1 — Reservation stuck

**Symptoms:** Slab shows `RESERVED` but buyer cannot checkout; or slab locked > 15 minutes with no active `PENDING` transaction.

**TTL:** Reservations expire after **15 minutes** (`lib/marketplace-reservations.ts`). Cron releases them every 10 minutes via `POST /api/cron/expire-reservations` (requires `Authorization: Bearer CRON_SECRET`).

### Triage

1. Admin → **Transactions** → filter `PENDING` or search buyer wallet / slab ID.
2. Note `reservedExpiresAt`. If in the past and status still `PENDING`, cron may be failing.
3. Check Vercel cron logs for `/api/cron/expire-reservations` (401 = wrong `CRON_SECRET`; 503 = schema blocking).

### Remediation

| Case | Steps |
|------|--------|
| Expired but not released | Manually trigger cron (production only, with bearer): `POST /api/cron/expire-reservations` with `Authorization: Bearer <CRON_SECRET>`. Expect `{ releasedTransactions, releasedSlabs }` > 0. |
| Cron healthy but one slab stuck | Confirm no `PENDING` or `PENDING_FULFILLMENT` tx for that `slabId`. If orphan `RESERVED` with no tx, escalate to `<ENG_ESCALATION_CHANNEL>` for a forward-only corrective migration (do not hand-edit production rows). |
| Buyer griefing / repeat reserves | Enable `RESERVE_REQUIRE_WALLET_CHALLENGE=true` in production if not already set (`SECURITY_CHECKLIST.md`). |

### Verification

- Slab status returns to `AVAILABLE` (or progresses to checkout).
- Re-run `npm run ops:verify -- --base-url <deployment-url>` if cron auth was involved.

---

## Incident 2 — Payment verified, fulfillment pending

**Symptoms:** Buyer paid SOL + SVF; checkout shows success; `Transaction.status = PENDING_FULFILLMENT` for extended period; buyer opened support ticket.

### Triage

1. `/admin/transactions?status=PENDING_FULFILLMENT&action=needs-action`
2. Confirm on-chain payment signatures on the transaction record (admin-only fields; not exposed to unverified wallet callers per `lib/wallet-transaction-access.ts`).
3. Confirm slab still in vault custody and not double-sold.

### Remediation

1. Perform physical / on-chain slab transfer from deployer wallet per vault SOP.
2. Record the Solana tx signature in the admin fulfill form (optional but recommended).
3. Click **Mark fulfilled** → `PATCH /api/admin/transactions/:id/fulfill`.
4. Confirm transaction → `COMPLETED`, slab → `SOLD`, `fulfilledAt` set.

### SLA guidance

| Age | Severity | Action |
|-----|----------|--------|
| < 24 h | Normal queue | Process in FIFO order |
| 24–48 h | Elevated | Notify `<VAULT_OPS_CONTACT>` |
| > 48 h | P1 | Page `<OPS_ONCALL_SLACK>`; send buyer update (template below) |

**Do not** mark fulfilled without completing the actual transfer/shipment.

---

## Incident 3 — Dispute escalation

**Symptoms:** Buyer claims non-delivery, wrong item, double charge, or unauthorized wallet use.

### Triage checklist

- [ ] Transaction ID and buyer wallet
- [ ] Payment signatures verified on-chain (amount, recipient, replay not reused)
- [ ] Current `Transaction.status` and `Slab.status`
- [ ] Any `fulfillmentSignature` on record
- [ ] Shipping / tracking evidence from `<VAULT_OPS_CONTACT>`

### Escalation path

1. **Operator** — Gather facts; do not admit liability in public channels.
2. **Vault ops** — Confirm custody and shipment records.
3. **Eng** — If status/API disagrees with chain reality, open incident thread in `<ENG_ESCALATION_CHANNEL>`.
4. **Disputes** — Chargebacks, fraud, or legal → `<DISPUTES_CONTACT>`.

### Resolution patterns

| Scenario | Typical resolution |
|----------|-------------------|
| Paid, never fulfilled | Complete fulfillment or coordinated refund (off-site wallet transfer; document in internal ticket only) |
| Fulfilled, buyer denies receipt | Provide tracking + on-chain sig; escalate to disputes if unresolved |
| Duplicate checkout / replay blocked | Explain idempotent checkout; point to single `transactionId` |
| GRAILS trade: no on-chain fill | **No fulfillment** — trade lane requires TCM fill confirmation (`docs/integrations/vault-to-trade-listings.md`) |

Refunds are **manual wallet-to-wallet** operations outside this app. Never log private keys or full wallet seeds.

---

## Incident 4 — Manual admin fulfill rollback

**Symptoms:** Operator marked **Mark fulfilled** in error; wrong tx sig; fulfillment before shipment; duplicate completion.

**Important:** `COMPLETED` is terminal in `lib/transaction-state.ts`. There is **no** admin API to revert fulfillment. Rollback requires engineering + DBA review.

### Before rollback

1. Stop further action on the transaction (note incident ID).
2. Confirm whether physical slab or on-chain asset actually moved.
3. If asset already with buyer, rollback is **inventory/accounting only** — coordinate with `<VAULT_OPS_CONTACT>` and `<DISPUTES_CONTACT>`.

### Rollback procedure (production)

1. **Do not** delete rows or run `prisma migrate reset` on production.
2. Engineering drafts a **forward-only corrective migration** (see [migration baseline](./migration-baseline.md)):
   - Revert `Transaction.status` from `COMPLETED` to `PENDING_FULFILLMENT` (or `FAILED` / `CANCELLED` if checkout invalid).
   - Clear or correct `fulfillmentSignature`, `fulfilledAt` as needed.
   - Restore `Slab.status` from `SOLD` to `AVAILABLE` or appropriate state.
3. Two-person review: migration SQL + expected before/after counts.
4. Apply via `npx prisma migrate deploy` in controlled window; verify in `/admin/transactions`.
5. Post-incident: document root cause; consider UI guard (confirm dialog) if repeat mistake.

### API errors during fulfill (not rollback)

| Code | Meaning | Action |
|------|---------|--------|
| `FULFILL_ILLEGAL_STATUS_TRANSITION` | Wrong current status | Refresh admin UI; complete payment path first |
| `FULFILL_IDEMPOTENCY_SIGNATURE_MISMATCH` | Already completed with different sig | Escalate eng; do not retry with conflicting sig |
| `FULFILL_STATE_CONFLICT` | Concurrent update | Retry once after refresh |

---

## Communication templates (placeholders)

Replace `{...}` before sending. Keep wallet addresses truncated in public replies.

### Payment confirmed — fulfillment in progress

```text
Subject: SlabVault order {TRANSACTION_ID} — fulfillment in progress

Hi {BUYER_NAME},

We've confirmed your payment for {SLAB_TITLE}. Your order is in our fulfillment queue.
Most orders ship within {SLA_DAYS} business days. You'll receive tracking at {BUYER_EMAIL} when dispatched.

Transaction reference: {TRANSACTION_ID}
Support: {SUPPORT_EMAIL}
```

### Fulfillment complete

```text
Subject: SlabVault order {TRANSACTION_ID} — shipped / transferred

Hi {BUYER_NAME},

Your order for {SLAB_TITLE} is complete.
{if on-chain} Transfer signature: {FULFILLMENT_SIGNATURE} {/if}
{if physical} Tracking: {TRACKING_URL} {/if}

Thank you for collecting with SlabVault.
```

### Delay apology (> 48 h pending)

```text
Subject: Update on SlabVault order {TRANSACTION_ID}

Hi {BUYER_NAME},

We're still processing your order for {SLAB_TITLE} and apologize for the delay.
Our team is actively working on fulfillment. Expect an update within {ETA_HOURS} hours.

Reference: {TRANSACTION_ID} | Support: {SUPPORT_EMAIL}
```

### Dispute — facts requested (neutral)

```text
Subject: SlabVault order {TRANSACTION_ID} — information needed

Hi {BUYER_NAME},

We're reviewing your message regarding order {TRANSACTION_ID}.
Please confirm: wallet used at checkout, date/time of payment, and description of the issue.

We'll respond within {DISPUTE_SLA_DAYS} business days after we receive this information.
```

---

## Quick reference commands

```bash
# Post-deploy smoke (includes cron auth)
npm run ops:verify -- --base-url https://slabvault.xyz

# Manually release expired reservations (production; bearer required)
curl -X POST "https://slabvault.xyz/api/cron/expire-reservations" \
  -H "Authorization: Bearer <CRON_SECRET>"
```

Admin UI: `/admin/transactions` · Fulfill API: `PATCH /api/admin/transactions/:id/fulfill`

---

## Checklist closure

This runbook satisfies **P0-SEC-15** (custody incidents and manual fulfillment dispute handling). Track escrow/auto-fulfillment audit separately under **Contracts and custody** in `SECURITY_CHECKLIST.md`.
