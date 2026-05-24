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
  console.log(`  Degraded: ${result.degraded}`);
  console.log(`  Slabs updated: ${result.slabsUpdated} (${result.slabSource ?? "none"})`);
  console.log(`  Pulls updated: ${result.pullsUpdated}`);
  console.log(`  Wallet data updated: ${result.walletDataUpdated}`);
  if (result.staleSources.length) {
    console.log(`  Stale sources: ${result.staleSources.join(", ")}`);
  }
  if (result.errors.length) {
    console.log(`  Notes: ${result.errors.join("; ")}`);
  }
  if (result.operatorHints.length) {
    console.log("  Operator hints:");
    for (const hint of result.operatorHints) {
      console.log(`    - ${hint}`);
    }
  }

  if (result.sourceStatuses.length) {
    console.log("  Source statuses:");
    for (const status of result.sourceStatuses) {
      const age =
        status.ageMinutes === null
          ? "n/a"
          : `${status.ageMinutes}m`;
      console.log(
        `    - ${status.key}: ${status.status}${status.isStale ? " (stale)" : ""}; age=${age}; ${status.detail}`,
      );
    }
  }

  const after = await getSyncStatus();
  console.log("\nAfter sync:", after);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
