import siteJson from "@/data/site.json";
import pullsJson from "@/data/pulls.json";
import slabsJson from "@/data/slabs.json";
import type { GachaTier, PullItem, SiteConfig, SlabItem } from "@/types/content";

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

export function getGachaTiers(site: SiteConfig): GachaTier[] {
  if (site.gachaTiers?.length) return site.gachaTiers;
  const { links } = site;
  return [
    {
      name: "Collector Crypt",
      priceLabel: "Gacha",
      href: links.gachaCollectorCrypt,
    },
    {
      name: "Phygitals",
      priceLabel: "Gacha",
      href: links.gachaPhygitals,
    },
    {
      name: "Beezie",
      priceLabel: "Gacha",
      href: links.gachaBeezie,
    },
  ];
}

export function getPrimaryGachaHref(site: SiteConfig): string {
  const tiers = getGachaTiers(site);
  const collector = tiers.find((t) =>
    t.href.includes("collectorcrypt"),
  );
  return collector?.href ?? tiers[0]?.href ?? site.links.gachaCollectorCrypt;
}
