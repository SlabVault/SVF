/**
 * Refresh data/slabs.json, data/pulls.json, and wallet fields in data/site.json.
 * Run: npm run sync
 */

import { syncAllData, getSyncStatus } from "../lib/data-sync";

async function main() {
  const before = await getSyncStatus();
  console.log("Before sync:", before);

  const result = await syncAllData();

  console.log("\nSync result:");
  console.log(`  Success: ${result.success}`);
  console.log(`  Slabs updated: ${result.slabsUpdated} (${result.slabSource ?? "none"})`);
  console.log(`  Pulls updated: ${result.pullsUpdated}`);
  console.log(`  Wallet data updated: ${result.walletDataUpdated}`);
  if (result.errors.length) {
    console.log(`  Notes: ${result.errors.join("; ")}`);
  }

  const after = await getSyncStatus();
  console.log("\nAfter sync:", after);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
