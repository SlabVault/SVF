# GRAILS milestone status (M0–M6)

**Last updated:** 2026-05-24 (M5 compare honesty alignment)  
**Sources:** [grails-step-by-step-plan.md](./grails-step-by-step-plan.md), codebase audit, [tensor-tradesite-copy-checklist.md](./tensor-tradesite-copy-checklist.md), [trade-staging-checklist.md](../trade-staging-checklist.md), [m3-recovery-status-2026-05-22.md](./m3-recovery-status-2026-05-22.md), [partner-aggregation-quickest-path.md](./partner-aggregation-quickest-path.md)  
**Rule:** One segment per session — no parallel implementation on the same trade lane.

---

## Summary

**M0–M1 done** (2026-05-21). **Current focus:** Segment 3 (M2 desk UX) + M3 prep ([partner-aggregation-quickest-path.md](./partner-aggregation-quickest-path.md)). M3 on-chain writes remain **partial** — BFF/SDK wired; verified staging fill + broker PDA are operator blockers.

Headline gaps vs full GRAILS vision remain **M1 prod ingest**, **M2 UX parity**, **M3 verified staging fill**, **M4 cross-venue best-price**, **M5 cert index/resolver** (item compare strip partial live), **M6 multichain ingest**.

---

## Milestone table

| Milestone | Status | What's done | What's left | Blockers |
|-----------|--------|-------------|-------------|----------|
| **M0 — Foundation & docs truth** | **Done** | Collection registry (7 partners: CC, Phygitals, ME, treasury, Beezie, Courtyard) with chain + settlement mode; `PartnerIngestAdapter` contract; `npm run dev:clean`; `docs/STATUS.md` + epics mapped to M0–M6; sequential workflow rule; 246+ unit tests green | Per-partner adapter *implementations* deferred to M1 (CC/Phygitals live in `lib/partner-listings.ts` today) | None |
| **M1 — Live listing data** | **Partial** | CC scraper + `npm run sync:discover`; partner listings merge; live landing stats; collection desk grids from JSON/DB; activity feed with synthetic flag; Tensor seller enrichment when keyed | Phygitals live API; cron → prod Postgres `ExternalListing`; ME depth via `TENSOR_API_KEY` | `DATABASE_URL` + migration on prod; optional Tensor key |
| **M2 — Trade desk UX shell** | **Partial** (~55%) | Tensor template + pro 3-column desk; grader/grade/price/q URL filters; BIDS tab live; venue badges; sweep/buy/list panel; stats ribbon + footer ticker (partial); item prev/next | ⌘K collections-only (no cert/mint); OFFERS/ORDERS/TRAITS/HODLERS content stubbed; grid density + toolbar search; copy checklist P0; footer 24h vol · Lite/Pro · TPS | Segment 2 data; tensor.trade side-by-side screenshots |
| **M3 — On-chain Solana writes** | **Partial** | BFF routes buy/list/delist/bid/cancel-bid; SDK wiring; write gate; buy/list/delist modals + hooks; portfolio LIST/DELIST; collection BIDS; wallet open-bids read; staging checklist doc | Verified staging mainnet fill; Postgres orders/idempotency; CSRF on write routes; broker PDA | Staging env + funded wallet; broker PDA ops |
| **M4 — Cross-venue depth & vault listings** | **Mostly missing** | Venue badges; Tensor enrichment merge on partner rows | Best-price graph; vault TCM list; batch sweep | M3 write path; `TENSOR_API_KEY`; vault wallet |
| **M5 — Cert-unified compare index** | **Partial** | Cert-first route; item COMPARE tab + `ItemVenueCompareStrip` when ≥2 `alternateVenueAsks` from merge graph ([partner-aggregation-quickest-path.md](./partner-aggregation-quickest-path.md)); FMV row stub | Unified cert index; `GET /api/trade/resolve?cert=`; ⌘K cert/mint search; `/trade/compare/[cert]` route; provenance block — see [m3-recovery-status-2026-05-22.md](./m3-recovery-status-2026-05-22.md) § Alignment update | M1 + M4 depth |
| **M6 — Multichain partners (Phase 3)** | **Mostly missing** | Registry preview rows + landing copy for Beezie (Base) and Courtyard (Polygon) | Adapters + chain filter + ingest rows | Partner APIs; M5 cert dedupe across chains |

---

## Adjacent work (not M0–M6 but tracked)

| Area | Status | Notes |
|------|--------|-------|
| **Portfolio & wallet flows** | Partial | LIST/DELIST wired; RECEIVED OFFERS · ACTIVITY · ORDERS & BIDS tabs still `soon: true` |
| **Production hardening** | Partial | CSRF on legacy checkout; not on `/api/trade/tx/*`; Sentry not wired |
| **Mobile & polish** | Mostly missing | Filter drawer partial; bottom nav / sticky item BUY bar TODO |
| **On-chain whitelist epic** | Not started | `TC-EP-WL` (TC-085–092) |

---

## Verification gates (from plan)

| Milestone | Gate | Today |
|-----------|------|-------|
| M0 | Docs match code; registry lists all partners; one workstream rule | **Pass** (2026-05-21) |
| M1 | CC grid ≥ seed count; floor/listed non-null on landing; tests green | **Partial** |
| M2 | Browser audit P0/P1 closed vs tensor.trade CC (~55% per copy checklist) | **Partial** |
| M3 | Devnet/staging buy tx e2e; portfolio shows owned asset | **Not verified** |
| M4 | Two venues same collection; best-price tile correct | **Not started** |
| M5 | Cert search returns multi-venue rows | **Partial** — item strip live when merge yields ≥2 asks; index resolver + palette cert search still M5 Soon |
| M6 | Beezie/Courtyard rows in index with chain badge | **Not started** |

---

## Related

- **Primary walkthrough:** [grails-step-by-step-plan.md](./grails-step-by-step-plan.md)
- **Orchestrator:** [../STATUS.md](../STATUS.md)
- **Epic backlog:** [../tensor-clone-epics.md](../tensor-clone-epics.md)
- **Staging ops:** [../trade-staging-checklist.md](../trade-staging-checklist.md)
- **Architecture:** [../trade-architecture.md](../trade-architecture.md)
