import type { TradeListing } from "@/lib/trade-listings";
import { extractCertNumber } from "@/lib/trade/extract-cert-number";

export type PartnerPlatformParam = "collector_crypt" | "phygitals";

const PARTNER_DEEP_LINK: Record<PartnerPlatformParam, string> = {
  collector_crypt: "https://collectorcrypt.com/marketplace",
  phygitals: "https://phygitals.com/invite/slabvault",
};

const GENERIC_CC_MARKETPLACE = PARTNER_DEEP_LINK.collector_crypt;

function normalizePartnerUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function isGenericPartnerMarketplaceUrl(
  url: string,
  platform: PartnerPlatformParam,
): boolean {
  const normalized = normalizePartnerUrl(url);
  if (platform === "collector_crypt") {
    return normalized === normalizePartnerUrl(GENERIC_CC_MARKETPLACE);
  }
  return normalized === normalizePartnerUrl(PARTNER_DEEP_LINK.phygitals);
}

function buildCollectorCryptItemDeepLink(listing: TradeListing): string | null {
  const cert = extractCertNumber(listing);
  if (cert) {
    return `${GENERIC_CC_MARKETPLACE}?q=${encodeURIComponent(cert)}`;
  }
  return null;
}

/** Trade collection slug → partner platform id (client-safe). */
export function slugToPartnerPlatform(
  slug: string,
): PartnerPlatformParam | null {
  if (slug === "collector-crypt") return "collector_crypt";
  if (slug === "phygitals") return "phygitals";
  return null;
}

/** Partner checkout URL — always returns a usable link for CC / Phygitals rows. */
export function resolvePartnerDeepLink(
  listing: TradeListing,
  platform: PartnerPlatformParam,
): string {
  const vaulted = listing.vaultedUrl?.trim();
  if (vaulted && !isGenericPartnerMarketplaceUrl(vaulted, platform)) {
    return vaulted;
  }

  if (platform === "collector_crypt") {
    const itemLink = buildCollectorCryptItemDeepLink(listing);
    if (itemLink) return itemLink;
  }

  return PARTNER_DEEP_LINK[platform];
}
