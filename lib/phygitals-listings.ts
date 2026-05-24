import type { ExternalListingItem } from "@/types/external-listing";

/**
 * Phygitals does not expose a public listing API for GRAILS ingest yet.
 * Trade reads Phygitals from `data/external-listings.json` (manual seed rows).
 * @see docs/integrations/phygitals-collectorcrypt.md
 */
export const PHYGITALS_LIVE_INGEST_AVAILABLE = false;

/** Minimum active Phygitals rows required in `data/external-listings.json`. */
export const MIN_ACTIVE_PHYGITALS_SEED_ROWS = 1;

export function isActivePhygitalsRow(row: ExternalListingItem): boolean {
  return row.source === "phygitals" && row.status === "active";
}

export function countActivePhygitalsSeedRows(rows: ExternalListingItem[]): number {
  return rows.filter(isActivePhygitalsRow).length;
}

export function assertActivePhygitalsSeedRows(
  rows: ExternalListingItem[],
  min = MIN_ACTIVE_PHYGITALS_SEED_ROWS,
): void {
  const count = countActivePhygitalsSeedRows(rows);
  if (count < min) {
    throw new Error(
      `data/external-listings.json needs at least ${min} active phygitals row(s); found ${count}. Add manual seed rows per docs/integrations/phygitals-collectorcrypt.md.`,
    );
  }
}

/** Bump indexedAt on active Phygitals seed rows after each discover sync. */
export function refreshPhygitalsSeedRows(
  rows: ExternalListingItem[],
  indexedAt: string,
  staleAfter: string,
): ExternalListingItem[] {
  return rows.map((row) =>
    isActivePhygitalsRow(row) ? { ...row, indexedAt, staleAfter } : row,
  );
}
