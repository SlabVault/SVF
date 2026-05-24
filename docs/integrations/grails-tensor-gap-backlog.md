# GRAILS / Tensor gap backlog (M7+)

**Last updated:** 2026-05-22  
**Synthesized from:** [tensor-tradesite-copy-checklist.md](./tensor-tradesite-copy-checklist.md), [segment-3-exit-audit.md](./segment-3-exit-audit.md), [m-milestone-status.md](./m-milestone-status.md), [browser-gap-matrix.md](../redesign/browser-gap-matrix.md), user screenshot feedback (landing polish, collection desk vs Meegos), codebase stubs.

**Verification (2026-05-22 segment 3 worker):** `tests/trade-desk-p0.test.ts` cross-check; checklist rows #4/#16/#22/#5 synced to codebase (TPS RPC, grid toolbar, OFFERS connect shell, ⌘K cert prefix).

**Effort:** **S** = 1–2 sessions, **M** = 3–5 sessions, **L** = epic / multi-week.

---

## P0 (next session — top 5)

1. **Landing index polish** — checklist #8 **done** (columns + sort); rank/thumb row chrome + ingest-backed 24h vol/Δ when Tensor unkeyed remain. **M** — M7  
2. **Collection desk vs Meegos** — partner/ME routes use same Pro desk shell as CC (ribbon depth, tabs, activity feed). **M** — M8  
3. **Broker mainnet fill** — staging→prod verified buy/list/delist + idempotency/orders. **L** — M11  
4. **Seller metadata on listings** — listState/seller on tiles for on-chain grid buy. **M** — M11  
5. **ORDERS tab** — replace `soon: true` in `trade-collection-desk-client.tsx` with real orders read model. **M** — M8  

**P0 checklist regions #1–10 (2026-05-22):** 4 **done** (#3 hide chrome, #4 footer ticker, #7 CARDS|TABLE, #8 index table) · 5 **partial** (#1 top bar, #2 desk header, #5 ⌘K, #9 chips, #10 landing ribbon) · 1 **missing** (#6 hero). Segment 3 copy-checklist P0 closure criterion **not met** (6/10 open).

---

## P1

| ID | Item | Effort |
|----|------|--------|
| P1-1 | Portfolio **received offers** tab | M |
| P1-2 | Portfolio **ORDERS & BIDS** tab | M |
| P1-3 | Stats ribbon: sell now, vol(all), sales, price Δ (ingest/Tensor statsV2) | M |
| P1-4 | ~~Grid toolbar: search, s/m/l density, refresh~~ → **done** (checklist #16) | S |
| P1-5 | Item **OFFERS** tab — live offers read (connect shell shipped; checklist #22 **partial**) | M |
| P1-6 | **Beezie + Courtyard ingest** (beyond registry preview) | L |
| P1-7 | Global search — collections + cert # prefix **partial**; full mint resolver M5 | M |
| P1-8 | Filter accordion: set + traits + counts | M |

---

## P2

| ID | Item | Effort |
|----|------|--------|
| P2-1 | ~~**TPS live** in `trade-footer-ticker.tsx`~~ → **done** (`lib/trade/solana-tps.ts`; checklist #4) | S |
| P2-2 | ~~Footer 24h vol + Lite/Pro toggle~~ → **done** (checklist #4) | M |
| P2-3 | ~~**AMM / instant sell** first grid cell~~ → **done** (checklist #17) | M |
| P2-4 | Featured collection hero on landing | S |
| P2-5 | ~~Item prev/next in filtered set~~ → **done** (checklist #25) | S |
| P2-6 | TRAITS / HODLERS tab content | M |
| P2-7 | Cancel-listing tab when user listings API ready | S |
| P2-8 | Cross-venue best-price (M4) | L |
| P2-9 | Cert compare index (M5) | L |

---

## Milestones M7+

| Milestone | Goal | Effort |
|-----------|------|--------|
| **M7** | Landing & index credibility (table-first, chips, ingest metrics) | M |
| **M8** | Collection Pro desk + Meegos parity; ORDERS; instant sell cell | L |
| **M9** | Portfolio & offers (received/placed/orders tabs) | M |
| **M10** | Beezie/Courtyard multichain ingest rows | L |
| **M11** | Production on-chain writes (broker mainnet, CSRF, Postgres) | L |
| **M12** | Live footer (TPS, vol) + item commerce depth | M |

**Order:** M7 → M8 → (M9 ∥ M10) → M11 → M12.

---

## Screenshot feedback map

| Feedback | IDs |
|----------|-----|
| Landing sloppy | P0-1, P1-3, P2-4 |
| Desk ≠ Meegos | P0-2, P1-4 |
| ORDERS stub | P0-5 |
| Received offers | P1-1 |
| TPS stub | ~~P2-1~~ done (RPC `getRecentPerformanceSamples`) |
| Beezie/Courtyard preview only | P1-6 |
| Instant sell | P2-3 |
| Broker mainnet | P0-3 |

---

## Checklist cross-walk

See [tensor-tradesite-copy-checklist.md](./tensor-tradesite-copy-checklist.md) items 1–10; each maps to P0/P1/P2 rows above.

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-21 | Initial M7+ backlog; verify 283 tests, build pass |
| 2026-05-22 | Segment 3 exit worker: P0 checklist cross-walk (#1–10 = 4 done); closed P2-1/2/3/5 + P1-4; #5 ⌘K cert prefix + #22 OFFERS shell notes |