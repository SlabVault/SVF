---
name: grails-master-ui
description: >-
  Whole-site GRAILS /trade UX checklist — browser-first parity vs tensor.trade,
  token lane (#111314, #641ae6), marketing/trade cohesion, and anti-patterns.
  Use for holistic UI/UX passes across landing, collection desk, portfolio, item,
  footer ticker, and mobile shell.
---

# GRAILS Master UI — whole-site UX

## When to use

- Holistic `/trade/*` polish (not a single component tweak)
- Browser crawl vs [tensor.trade](https://www.tensor.trade/) before/after fixes
- Cohesion check: marketing site vs `.trade-layout` desk
- Pre-release UX audit or regression after ingest/on-chain changes

**Companion skills:** [tensor-tradesite-parity](../tensor-tradesite-parity/SKILL.md) (region map) · [grails-ui-tensor-orchestrator](../grails-ui-tensor-orchestrator/SKILL.md) (continuous loop)

**Reference crawl:** [docs/integrations/tensor-tradesite-crawl-2026-05-21.md](../../docs/integrations/tensor-tradesite-crawl-2026-05-21.md)

---

## Browser-first workflow

1. **Crawl tensor.trade** (cursor-ide-browser MCP) at 1920×1080:
   - `/` — TABLE + CARDS, hero, footer Lite/Pro
   - `/trade/{collection}` — 3-column desk, stats ribbon, tabs, activity
   - `/portfolio` — public shell (inventory needs wallet)
   - `/item/{mint}` — commerce stack + tabs

2. **Crawl GRAILS** on `localhost:3000` (if dev up):
   - `/trade`, `/trade/all`, `/trade/portfolio`
   - `/trade/c/collector-crypt`, `/trade/c/phygitals`
   - `/trade/slab/{certOrMint}` (one live listing)

3. **Snapshot + screenshot** per page; note region gaps in crawl doc orchestrator table.

4. **Fix inline** for trivial gaps (copy, spacing, one CSS class). **Spawn max 5** background workers only for large isolated areas (e.g. portfolio orders table, BIDS tab columns).

5. **Run tests:** `node --test tests/trade-desk-p0.test.ts tests/trade-landing.test.ts tests/trade-portfolio.test.ts`

6. **Append** findings to `docs/integrations/master-fix-backlog-YYYY-MM-DD.md`.

---

## Whole-site checklist

Copy at start of a Master UI pass:

```
- [ ] `.trade-layout` on all /trade routes — no marketing SiteHeader/Footer
- [ ] Single search hierarchy: TradeAppHeader ⌘K only (no desk sub-header duplicate)
- [ ] Nav: COLLECTIONS · TRADE uppercase 11px; no stuck "Rendering…" (no useSearchParams in app header)
- [ ] Tokens: #111314 bg, #641ae6 CTAs, mono ◎, 10–11px uppercase labels
- [ ] Landing: CARDS|TABLE toggle, index table ~40px rows, NEW MINTS chip uppercase
- [ ] Collection desk: 200 / 224 / flex / 280px regions; stats ribbon 7 cells; filter URL sync
- [ ] All listings desk matches single-collection desk quality
- [ ] Portfolio: summary ribbon aligned; sidebar truncate + title tooltips; LIST 1 ITEM pluralization
- [ ] Item page: listed ◎ + USD, BUY / PLACE OFFER, OVERVIEW · ACTIVITY · OFFERS tabs
- [ ] Footer: Live dot, Lite/Pro, Partner listed (aggregate), SOL, 24h vol, TPS — no wallet/footer mismatch
- [ ] Mobile: filter drawer, sticky LIST/DELIST bar, trade mobile action bar on desk
- [ ] No vault amber / grails marketing purple on /trade/*
- [ ] Tests green: trade-desk-p0, trade-landing, trade-portfolio
```

---

## Region → file map

| Region | Primary files |
|--------|----------------|
| App header | `trade-app-header.tsx`, `trade-command-palette.tsx`, `trade-wallet-menu.tsx` |
| Desk sub-header | `trade-desk-header.tsx` (context only — no duplicate search) |
| Landing | `trade-landing-value-hero.tsx`, `trade-landing-market-pulse.tsx`, `trade-landing-desk-client.tsx`, `trade-landing-index-toolbar.tsx`, `trade-landing-featured-banner.tsx` |
| Index table | `tensor/collection-desk-layout.tsx` (`TensorCollectionIndexTable`) |
| Collection desk | `trade-collection-desk-client.tsx`, `tensor/collection-desk-layout.tsx`, `tensor/stats-grid.tsx`, `trade-trait-filters.tsx`, `trade-activity-panel.tsx` |
| All listings | `app/trade/all/page.tsx`, `trade-collection-desk-client.tsx` |
| Portfolio | `trade-portfolio-client.tsx`, `portfolio/*` |
| Item | `trade-item-detail-client.tsx` |
| Footer | `trade-footer-ticker.tsx`, `trade-footer-ticker-server.tsx` |
| Mobile | `trade-filter-drawer.tsx`, `trade-mobile-action-bar.tsx`, `portfolio/trade-portfolio-sticky-bar.tsx` |
| Tokens | `app/globals.css` (`.trade-layout`) |

---

## Anti-patterns (do NOT on `/trade/*`)

| Anti-pattern | Why |
|--------------|-----|
| Vault amber (`--vault-*`) CTAs or backgrounds | Marketing lane only |
| Grails marketing purple gradients | Breaks template token lane |
| Tensor cyan `#8EE3FB` as primary CTA | Live product accent — GRAILS uses `#641ae6` |
| Duplicate search in app + desk headers | Tensor has one nav search |
| `useSearchParams` in sticky app header | Suspense → dev "Rendering…" stuck |
| Fake floor/vol without honest stub label | Credibility |
| Footer "Listed N" implying wallet count | Use **Partner listed** for platform aggregate |
| `LIST 1 ITEMS` / lowercase action labels | Use **LIST 1 ITEM** / **LIST N ITEMS** |
| Mojibake ◎ / · in JSX | Use UTF-8 `◎` and ` · ` |
| REWARDS / trollbox nav | Intentionally omitted |

---

## Typography & spacing targets

| Element | Target |
|---------|--------|
| Nav links | 11px semibold uppercase |
| Micro labels | 10px bold uppercase, tracking 0.06–0.08em |
| Shell body | 13px (trade layout default) |
| Mono values | tabular-nums, ◎ suffix |
| Nav height | `h-11` (~44px) |
| Index table header | ~40px row, 10px uppercase th |
| Stats / summary ribbon | horizontal flex, 1px `#333` dividers |
| Footer ticker | 9–10px uppercase, Lite/Pro toggle |

---

## Spawn rules (Master UI pass)

- **Max 5** background fix workers per pass
- One worker = one isolated area + one primary test file
- Do **not** spawn for ingest, tx routes, or M5/M6 unless UX-only read path
- Inline fix: copy, CSS class, pluralization, encoding, duplicate nav

Example worker titles: *Portfolio orders table density*, *BIDS tab column headers*, *Landing CARDS spread color*, *Item footer stats row*.

---

## Needs connected wallet (defer or screenshot)

- Portfolio inventory grid + bulk LIST/DELIST
- Wallet dropdown full menu parity
- Collection BIDS / ORDERS tab with live rows
- Buy confirmation modal breakdown
- Mobile bottom BUY | SELL bar with live panel

---

## Additional resources

- [Tensor crawl 2026-05-21](../../docs/integrations/tensor-tradesite-crawl-2026-05-21.md)
- [Copy checklist](../../docs/integrations/tensor-tradesite-copy-checklist.md)
- [UX audit](../../docs/integrations/tensor-tradesite-ux-audit.md)
- [Master fix backlog](../../docs/integrations/master-fix-backlog-2026-05-22.md)

---

## Landing page checklist (`/trade`)

Copy at start of a landing-only pass:

```
- [ ] Value hero: "Tensor for graded cards" headline + Explore collections CTA (#trade-collections-index or first live desk)
- [ ] Market pulse ribbon: Partner listed · Best floor · 24h vol · Venues · Data label (honest empty)
- [ ] Featured banner: first live collection buy/sell + ribbon (24h vol · mcap · listed/supply)
- [ ] Index: CARDS|TABLE default table · TRENDING · NEW MINTS · 1h/24h/7d · FILTERS + refresh
- [ ] Index table ~40px rows · mono ◎ · sortable floor/sell/listed/vol/Δ · venue badge column
- [ ] Empty index state when filter matches zero rows
- [ ] Activity: sidebar xl+ · mobile teaser below index (compact feed)
- [ ] Footer ticker: Live · Lite/Pro · Partner listed · floor · SOL · 24h vol · TPS
- [ ] No vault-amber / marketing purple on landing — `.trade-layout` tokens only
- [ ] Tests: trade-landing.test.ts + trade-desk-p0.test.ts green
```

---

## Homepage checklist (`/`)

Copy at start of a marketing-home pass:

```
- [ ] Hero: SlabVault story in ~5s — flywheel chain visible; slab stack on lg+
- [ ] Primary CTA: Explore GRAILS → /trade (amber); secondary Explore vault → /vault
- [ ] GRAILS promo lives in footer CTA section — not hero (vault story first)
- [ ] Flywheel section: 4 steps with amber accents; desktop flow bar
- [ ] Live pulse: real vault stats + recent pulls carousel; honest empty states
- [ ] Trust: treasury teaser → /vault/proof; beta badge on GRAILS; no fake metrics
- [ ] Partner strip: pull partners + GRAILS liquidity logos (subtle, post-hero)
- [ ] Mobile: min-h-11 CTAs; hero readable at 375px; carousel snap scroll
- [ ] Tokens: vault-amber marketing lane; violet only in GRAILS product card
- [ ] Cohesion: SiteHeader/nav typography matches product family with /trade
- [ ] Server components: no new client bloat on home sections
- [ ] Tests: perf-hygiene.test.ts green for app/page.tsx metadata + hero CTAs
```
