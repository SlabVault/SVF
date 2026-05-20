import { getWalletData } from "./solana-wallet";
import { fetchVaultedData, scrapeVaultedProfile } from "./scrapers/vaulted-scraper";
import { fetchCollectorCryptData, scrapeCollectorCryptPulls } from "./scrapers/collector-crypt-scraper";
import type { SlabItem, PullItem } from "@/types/content";
import type { VaultedSlab } from "@/lib/scrapers/vaulted-scraper";
import type { CollectorCryptPull } from "@/lib/scrapers/collector-crypt-scraper";
import siteJson from "@/data/site.json";
import slabsJson from "@/data/slabs.json";
import pullsJson from "@/data/pulls.json";
import { writeFile } from "fs/promises";
import { join } from "path";

// Configuration
const VAULTED_PROFILE_URL = "https://vaulted.id/u/SlabVaultFi";
const COLLECTOR_CRYPT_TREASURY_URL = "https://collectorcrypt.com/account/2oRZe7z9Jx3rpoUWuidjGhpX9mxxhtps2JqQtdxLfHwg";
const TREASURY_WALLET = "2oRZe7z9Jx3rpoUWuidjGhpX9mxxhtps2JqQtdxLfHwg";
const DEPLOYER_WALLET = "CWqc6DQhHxdnDSwrjG3LGnyWPQ3dRNfCY5umvTj8NBE3";

export type SyncResult = {
  success: boolean;
  timestamp: string;
  slabsUpdated: boolean;
  pullsUpdated: boolean;
  walletDataUpdated: boolean;
  errors: string[];
};

/**
 * Main data sync function - fetches data from all sources and updates JSON files
 */
export async function syncAllData(): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    timestamp: new Date().toISOString(),
    slabsUpdated: false,
    pullsUpdated: false,
    walletDataUpdated: false,
    errors: [],
  };

  try {
    console.log("Starting data sync at:", result.timestamp);

    // Sync slabs from Vaulted.id
    const slabsResult = await syncSlabs();
    result.slabsUpdated = slabsResult;
    if (!slabsResult) {
      result.errors.push("Failed to sync slabs from Vaulted.id");
    }

    // Sync pulls from Collector Crypt
    const pullsResult = await syncPulls();
    result.pullsUpdated = pullsResult;
    if (!pullsResult) {
      result.errors.push("Failed to sync pulls from Collector Crypt");
    }

    // Sync wallet data
    const walletResult = await syncWalletData();
    result.walletDataUpdated = walletResult;
    if (!walletResult) {
      result.errors.push("Failed to sync wallet data");
    }

    result.success = result.errors.length === 0;
    console.log("Data sync completed:", result);
    
    return result;
  } catch (error) {
    console.error("Error during data sync:", error);
    result.errors.push(error instanceof Error ? error.message : "Unknown error");
    return result;
  }
}

/**
 * Sync slab data from Vaulted.id
 */
async function syncSlabs(): Promise<boolean> {
  try {
    console.log("Syncing slabs from Vaulted.id...");
    
    // Try API first, fallback to scraping
    let vaultedSlabs: VaultedSlab[] | null = await fetchVaultedData(VAULTED_PROFILE_URL);
    
    if (!vaultedSlabs || vaultedSlabs.length === 0) {
      console.log("API returned no data, trying scraper...");
      const scrapedSlabs = await scrapeVaultedProfile(VAULTED_PROFILE_URL);
      if (!scrapedSlabs || scrapedSlabs.length === 0) {
        console.log("No slab data found from Vaulted.id, keeping existing data");
        return false;
      }
      vaultedSlabs = scrapedSlabs;
    }

    if (!vaultedSlabs || vaultedSlabs.length === 0) {
      console.log("No slab data found, keeping existing data");
      return false;
    }

    // Convert to our format
    const slabs: SlabItem[] = vaultedSlabs.map((slab) => ({
      id: slab.id,
      name: slab.name,
      grade: slab.grade,
      estimatedValueUsd: slab.estimatedValueUsd,
      acquiredAt: slab.acquiredAt,
      imageUrl: slab.imageUrl,
      vaultedUrl: slab.vaultedUrl,
      collectrUrl: slab.collectrUrl || "",
    }));

    // Write to slabs.json
    const slabsPath = join(process.cwd(), "data", "slabs.json");
    await writeFile(slabsPath, JSON.stringify(slabs, null, 2), "utf-8");
    
    console.log(`Updated ${slabs.length} slabs`);
    return true;
  } catch (error) {
    console.error("Error syncing slabs:", error);
    return false;
  }
}

/**
 * Sync pull data from Collector Crypt
 */
async function syncPulls(): Promise<boolean> {
  try {
    console.log("Syncing pulls from Collector Crypt...");
    
    // Try API first, fallback to scraping
    let collectorPulls: CollectorCryptPull[] | null = await fetchCollectorCryptData(COLLECTOR_CRYPT_TREASURY_URL);
    
    if (!collectorPulls || collectorPulls.length === 0) {
      console.log("API returned no data, trying scraper...");
      const scrapedPulls = await scrapeCollectorCryptPulls(COLLECTOR_CRYPT_TREASURY_URL);
      if (!scrapedPulls || scrapedPulls.length === 0) {
        console.log("No pull data found from Collector Crypt, keeping existing data");
        return false;
      }
      collectorPulls = scrapedPulls;
    }

    if (!collectorPulls || collectorPulls.length === 0) {
      console.log("No pull data found, keeping existing data");
      return false;
    }

    // Convert to our format
    const pulls: PullItem[] = collectorPulls.map((pull) => ({
      id: pull.id,
      date: pull.date,
      source: pull.source,
      summary: pull.summary,
      costUsd: pull.costUsd,
      outcomeUsd: pull.outcomeUsd,
      clipUrl: pull.clipUrl,
    }));

    // Write to pulls.json
    const pullsPath = join(process.cwd(), "data", "pulls.json");
    await writeFile(pullsPath, JSON.stringify(pulls, null, 2), "utf-8");
    
    console.log(`Updated ${pulls.length} pulls`);
    return true;
  } catch (error) {
    console.error("Error syncing pulls:", error);
    return false;
  }
}

/**
 * Sync wallet data from Solana
 */
async function syncWalletData(): Promise<boolean> {
  try {
    console.log("Syncing wallet data from Solana...");
    
    // Get treasury wallet data
    const treasuryData = await getWalletData(TREASURY_WALLET);
    
    if (!treasuryData) {
      console.log("Failed to fetch treasury wallet data");
      return false;
    }

    // Get deployer wallet data
    const deployerData = await getWalletData(DEPLOYER_WALLET);
    
    if (!deployerData) {
      console.log("Failed to fetch deployer wallet data");
      return false;
    }

    // Update site.json with wallet balances
    const updatedSite = {
      ...siteJson,
      treasuryBalanceSol: treasuryData.balanceSol,
      deployerBalanceSol: deployerData.balanceSol,
      lastWalletSync: new Date().toISOString(),
    };

    // Write to site.json
    const sitePath = join(process.cwd(), "data", "site.json");
    await writeFile(sitePath, JSON.stringify(updatedSite, null, 2), "utf-8");
    
    console.log(`Updated wallet balances: Treasury=${treasuryData.balanceSol} SOL, Deployer=${deployerData.balanceSol} SOL`);
    return true;
  } catch (error) {
    console.error("Error syncing wallet data:", error);
    return false;
  }
}

/**
 * Manual sync function for testing or on-demand updates
 */
export async function manualSync(): Promise<SyncResult> {
  console.log("Running manual data sync...");
  return await syncAllData();
}

/**
 * Get current sync status
 */
export async function getSyncStatus(): Promise<{
  lastSync: string | null;
  slabCount: number;
  pullCount: number;
}> {
  return {
    lastSync: siteJson.lastWalletSync || null,
    slabCount: slabsJson.length,
    pullCount: pullsJson.length,
  };
}
