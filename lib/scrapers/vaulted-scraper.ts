import {
  fetchVollectorData,
  scrapeVollectorProfile,
  type VollectorSlab,
} from "./vollector-scraper";

export type VaultedSlab = {
  id: string;
  name: string;
  grade: string;
  estimatedValueUsd: number | null;
  acquiredAt: string;
  imageUrl: string;
  vaultedUrl: string;
  collectrUrl: string | null;
};

function toVaultedSlab(slab: VollectorSlab): VaultedSlab {
  return {
    id: slab.id,
    name: slab.name,
    grade: slab.grade,
    estimatedValueUsd: slab.estimatedValueUsd,
    acquiredAt: slab.acquiredAt,
    imageUrl: slab.imageUrl,
    vaultedUrl: slab.itemUrl,
    collectrUrl: slab.collectrUrl,
  };
}

/**
 * Vaulted.id shares the same Astro payload format as Vollector.
 */
export async function scrapeVaultedProfile(
  profileUrl: string,
): Promise<VaultedSlab[] | null> {
  const slabs = await scrapeVollectorProfile(profileUrl);
  return slabs ? slabs.map(toVaultedSlab) : null;
}

export async function fetchVaultedData(
  profileUrl: string,
): Promise<VaultedSlab[] | null> {
  const slabs = await fetchVollectorData(profileUrl);
  return slabs ? slabs.map(toVaultedSlab) : null;
}
