# Performance Hygiene Runbook

This runbook covers low-cost checks that keep runtime and hydration overhead under control as SlabVaultFi evolves.

## Primary goals

- Keep server-rendered paths server-first unless interactivity is required.
- Avoid avoidable hydration on list-heavy pages (`/`, `/marketplace`, `/vault`).
- Preserve accessibility and responsive behavior while optimizing.

## Guardrails

- Use `"use client"` only when a component needs hooks, browser APIs, or client-only libraries.
- Prefer server components for cards, badges, static sections, and status filters.
- Keep image priorities selective:
  - only above-the-fold/LCP media should be `priority`
  - list grids should prioritize only the first visible rows
- Add `loading.tsx` for data-heavy route groups so navigations render instant skeletons.
- Keep fallbacks layout-stable to avoid CLS regressions.

Current loading skeletons: `/marketplace`, `/vault`, `/pulls`.

## Lightweight checks

Run these before shipping:

```bash
npm run perf:check
```

`perf:check` validates key hydration/runtime invariants:

- `components/slab-image.tsx` stays server-rendered (no `"use client"`).
- `components/slab-card.tsx` stays server-rendered (no `"use client"`).
- `components/marketplace-status-filter.tsx` stays server-rendered and does not depend on `useSearchParams`.
- `app/marketplace/loading.tsx`, `app/vault/loading.tsx`, and `app/pulls/loading.tsx` exist for instant loading UI on navigation.
- `components/slab-image.tsx` keeps lazy-loading and `fetchPriority` hints.
- Root layout mounts `GrowthInstrumentation` and public routes use `buildPageMetadata`.
- Key conversion CTAs include `data-growth-event` or `trackingEvent` attributes.

## Validation bundle

Use this baseline bundle for perf-safe merges:

```bash
npm run perf:check && npm run lint && npm run test && npm run build
```
