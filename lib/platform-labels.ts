import type { ExternalListingSource } from "@/types/external-listing";

import { LAUNCH_APP_CTA as BRAND_LAUNCH_APP_CTA } from "@/lib/brand";
import {
  getExternalListingCtaLabel,
  getExternalListingSourceLabel,
} from "@/lib/external-listings-sources";

export const SLABVAULT_PLATFORM_LABEL = "SlabVault";

export const MARKETPLACE_BUY_CTA = "Buy on SlabVault";
export const MARKETPLACE_RESUME_CTA = "Resume checkout";
export const LAUNCH_APP_CTA = BRAND_LAUNCH_APP_CTA;
export const TRADE_PLATFORM_CTA = LAUNCH_APP_CTA;

export type PlatformBadgeKind =
  | "slabvault"
  | "slabvault_vault"
  | "external"
  | "experimental";

export function getPlatformBadgeLabel(
  kind: PlatformBadgeKind,
  externalSource?: ExternalListingSource,
): string {
  if (kind === "slabvault") return SLABVAULT_PLATFORM_LABEL;
  if (kind === "slabvault_vault") return "SlabVault vault";
  if (kind === "experimental") return "Beta";
  if (externalSource) return getExternalListingSourceLabel(externalSource);
  return "Partner";
}

export function getExternalPlatformCta(source: ExternalListingSource): string {
  return getExternalListingCtaLabel(source);
}
