import siteJson from "@/data/site.json";
import pullsJson from "@/data/pulls.json";
import slabsJson from "@/data/slabs.json";
import type { PullItem, SiteConfig, SlabItem } from "@/types/content";

export function getSiteConfig(): SiteConfig {
  const ca =
    process.env.NEXT_PUBLIC_TOKEN_CA?.trim() || siteJson.contractAddress;
  return { ...siteJson, contractAddress: ca } as SiteConfig;
}

export function getSlabs(): SlabItem[] {
  return slabsJson as SlabItem[];
}

export function getPulls(): PullItem[] {
  return pullsJson as PullItem[];
}
