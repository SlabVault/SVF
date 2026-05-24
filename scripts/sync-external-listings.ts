/**
 * Sync external marketplace listings from Collector Crypt into data/external-listings.json.
 * Run: npm run sync:discover
 * Preflight (prod): npm run db:preflight — P0-DAT-04 / P0-OPS-09 before live ExternalListing upsert.
 */

import { syncExternalListingsToJson } from "../lib/external-listings-sync";

async function main() {
  const result = await syncExternalListingsToJson();

  console.log("External listings sync:");
  console.log(`  Success: ${result.success}`);
  console.log(`  Collector Crypt rows: ${result.collectorCryptCount}`);
  console.log(`  Preserved non-CC rows: ${result.manualPreserved}`);
  console.log(`  Phygitals rows: ${result.phygitalsCount}`);
  console.log(`  Total written: ${result.totalWritten}`);
  console.log(`  CC ingest source: ${result.ccIngestSource}`);
  console.log(`  DB configured: ${result.dbConfigured}`);
  console.log(`  DB upsert count: ${result.dbUpsertCount}`);
  if (result.errors.length) {
    console.log(`  Notes: ${result.errors.join("; ")}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
