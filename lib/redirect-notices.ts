export type ArchivedRouteSource =
  | "vault-shop"
  | "discover"
  | "marketplace"
  | "vault-purchases";

const NOTICES: Record<ArchivedRouteSource, { title: string; body: string }> = {
  "vault-shop": {
    title: "Vault shop moved to Trade",
    body: "Buying and selling graded slabs now happens on the trade desk — one aggregator for partner liquidity and vault listings.",
  },
  discover: {
    title: "Discover merged into Trade",
    body: "Browse and fill graded-card listings on the trade desk instead of the archived discover lane.",
  },
  marketplace: {
    title: "Marketplace moved to Trade",
    body: "The legacy marketplace checkout is archived. Use Trade for listings, filters, and wallet-native settlement.",
  },
  "vault-purchases": {
    title: "Purchases moved to Trade portfolio",
    body: "Order history and reservations from the archived vault shop live under Trade → Portfolio.",
  },
};

export function parseArchivedRouteSource(
  value: string | undefined,
): ArchivedRouteSource | null {
  if (!value) return null;
  return value in NOTICES ? (value as ArchivedRouteSource) : null;
}

export function getArchivedRouteNotice(source: ArchivedRouteSource) {
  return NOTICES[source];
}
