# GRAILS North Star

**Last updated:** 2026-05-23  
**One line:** Tensor for RWA graded cards — cert-first discovery, cross-venue listings, honest pricing context, best buy path on Solana.

SlabVault is vault proof; **GRAILS** is where collectors browse liquidity and settle.

---

## Product chain (today → future)

```text
Cert #  →  Listings (merged)  →  FMV / insured spread (future)  →  Best buy path
```

| Stage | What it means | Today |
|-------|----------------|-------|
| **Cert** | PSA/CGC cert is the stable identity for a physical slab | Cert on tiles + item hero; prefix search in ⌘K opens `/trade/slab/[cert]`; unified multi-venue cert index is **M5 (Soon)** |
| **Listings** | Same cert may appear on CC, Phygitals, treasury, preview venues | **Live** — Postgres → partner API → JSON → scrape fallback; `/trade/all` dedupes by cert/mint, lowest ask wins |
| **FMV / insured spread** | Fair-market and insurance context vs ask (deal quality, not hype) | **Future** — `estimatedValueUsd` on some rows only; no insured-spread product yet |
| **Best buy path** | Cheapest valid ask + wallet-native fill (or honest deep link) | **Partial** — merge picks winning venue; on-site TCM fill gated on `TENSOR_TRADE_WRITE_ENABLED` + seller enrichment |

---

## Buyer journey (v1)

1. **Enter by cert or desk** — `/trade/all`, collection desk, or ⌘K cert prefix.
2. **See merged depth** — venue badges, floor, listed count from partner ingest (Tensor optional enrichment).
3. **Compare (partial)** — item strip live when the same cert lists on 2+ venues (CC · Phygitals asks + buy/deep-link CTAs). Unified cert index + mint search in ⌘K still **M5 (Soon)**.
4. **Buy** — Connect wallet → `BuyNowModal` → BFF tx when write path enabled; else partner deep link.

---

## Non-goals (honest scope)

- Tensor API is **not** primary ingest — display comes from DB/partner paths ([partner-aggregation-quickest-path.md](./partner-aggregation-quickest-path.md)).
- Multichain settlement (Beezie/Courtyard) = compare + deep link in v1, not GRAILS fill.
- FMV/insured spread is a **future trust layer**, not shipped pricing advice.

---

## Related

- [grails-step-by-step-plan.md](./grails-step-by-step-plan.md) — M0–M6 segments  
- [STATUS.md](../STATUS.md) — honest % by lane  
- [vault-to-trade-listings.md](./vault-to-trade-listings.md) — treasury sells via `/trade` only
