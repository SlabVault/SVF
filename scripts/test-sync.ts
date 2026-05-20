/**
 * Test script for data sync functionality
 * Run with: npx tsx scripts/test-sync.ts
 */

import { syncAllData, getSyncStatus } from "../lib/data-sync";
import { getWalletData } from "../lib/solana-wallet";

async function testWalletQuery() {
  console.log("\n=== Testing Wallet Query ===");
  const treasuryWallet = "2oRZe7z9Jx3rpoUWuidjGhpX9mxxhtps2JqQtdxLfHwg";
  
  try {
    const data = await getWalletData(treasuryWallet, 5);
    if (data) {
      console.log("✓ Wallet query successful");
      console.log(`  Balance: ${data.balanceSol} SOL`);
      console.log(`  Tokens: ${data.tokens.length}`);
      console.log(`  Transactions: ${data.recentTransactions.length}`);
    } else {
      console.log("✗ Wallet query failed");
    }
  } catch (error) {
    console.error("✗ Wallet query error:", error);
  }
}

async function testSyncStatus() {
  console.log("\n=== Testing Sync Status ===");
  
  try {
    const status = await getSyncStatus();
    console.log("✓ Sync status retrieved");
    console.log(`  Last sync: ${status.lastSync}`);
    console.log(`  Slabs: ${status.slabCount}`);
    console.log(`  Pulls: ${status.pullCount}`);
  } catch (error) {
    console.error("✗ Sync status error:", error);
  }
}

async function testFullSync() {
  console.log("\n=== Testing Full Data Sync ===");
  
  try {
    const result = await syncAllData();
    console.log("✓ Full sync completed");
    console.log(`  Success: ${result.success}`);
    console.log(`  Slabs updated: ${result.slabsUpdated}`);
    console.log(`  Pulls updated: ${result.pullsUpdated}`);
    console.log(`  Wallet data updated: ${result.walletDataUpdated}`);
    if (result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.join(", ")}`);
    }
  } catch (error) {
    console.error("✗ Full sync error:", error);
  }
}

async function main() {
  console.log("Starting data sync tests...");
  
  await testWalletQuery();
  await testSyncStatus();
  
  // Test full sync (will modify JSON files)
  await testFullSync();
  
  console.log("\nTests completed");
}

main().catch(console.error);
