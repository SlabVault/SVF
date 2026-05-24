/**
 * Verifies manual Phygitals seed rows in data/external-listings.json.
 *
 * Usage:
 *   npm run check:phygitals-seed
 */

import externalListingsJson from "@/data/external-listings.json";
import {
  assertActivePhygitalsSeedRows,
  countActivePhygitalsSeedRows,
  MIN_ACTIVE_PHYGITALS_SEED_ROWS,
} from "@/lib/phygitals-listings";
import type { ExternalListingItem } from "@/types/external-listing";

const rows = externalListingsJson as ExternalListingItem[];

try {
  assertActivePhygitalsSeedRows(rows);
  const count = countActivePhygitalsSeedRows(rows);
  console.log(
    `[check:phygitals-seed] ok — ${count} active phygitals row(s) (min ${MIN_ACTIVE_PHYGITALS_SEED_ROWS}).`,
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[check:phygitals-seed] failed — ${message}`);
  process.exit(1);
}
