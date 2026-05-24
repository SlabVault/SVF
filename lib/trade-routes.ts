/** Nav + desk slug for the aggregate all-platform view. */
export const ALL_LISTINGS_SLUG = "all";

/** Canonical routes for the `/trade` aggregator desk. */
export const TRADE_ROUTES = {
  landing: "/trade",
  /** Aggregate desk — listings merged across all partner collections. */
  all: "/trade/all",
  portfolio: "/trade/portfolio",
  collection: (slug: string) => `/trade/c/${slug}`,
  /** Primary item route — cert # or mint address. */
  slab: (certOrMint: string) =>
    `/trade/slab/${encodeURIComponent(certOrMint.replace(/^#/, ""))}`,
  /** @deprecated Prefer TRADE_ROUTES.slab */
  item: (mint: string) => `/trade/item/${encodeURIComponent(mint)}`,
  /** Collection index anchor on the trade landing page. */
  collectionsIndex: "/trade#trade-collections-index",
} as const;

/** Browse area: landing index, aggregate desk, per-collection desks, and item detail. */
export function isTradeCollectionsBrowsePath(pathname: string): boolean {
  return (
    pathname === TRADE_ROUTES.landing ||
    pathname === TRADE_ROUTES.all ||
    pathname.startsWith(`${TRADE_ROUTES.landing}/c/`) ||
    pathname.startsWith(`${TRADE_ROUTES.landing}/slab/`) ||
    pathname.startsWith(`${TRADE_ROUTES.landing}/item/`)
  );
}

export function isTradePortfolioPath(pathname: string): boolean {
  return pathname.startsWith(TRADE_ROUTES.portfolio);
}

/** Server BFF routes for trade desk reads. */
export const TRADE_API_ROUTES = {
  collectionDepth: (slug: string) =>
    `/api/trade/collections/${encodeURIComponent(slug)}/depth`,
  /** Partner ingest (CC, Phygitals) — primary desk read path. */
  partnerListings: (platform: "collector_crypt" | "phygitals") =>
    `/api/trade/partners/${encodeURIComponent(platform)}/listings`,
  activity: (slug: string, limit = 16) =>
    `/api/trade/activity?collection=${encodeURIComponent(slug)}&limit=${limit}`,
} as const;
