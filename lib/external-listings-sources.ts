import type { ExternalListingSource } from "@/types/external-listing";

const SOURCE_LABELS: Record<ExternalListingSource, string> = {
  collector_crypt: "Collector Crypt",
  phygitals: "Phygitals",
  magic_eden: "Magic Eden",
  manual: "Manual",
};

const SOURCE_CTA: Record<ExternalListingSource, string> = {
  collector_crypt: "Open on Collector Crypt",
  phygitals: "Open on Phygitals",
  magic_eden: "Open on Magic Eden",
  manual: "View listing",
};

export function getExternalListingSourceLabel(
  source: ExternalListingSource,
): string {
  return SOURCE_LABELS[source] ?? source;
}

export function getExternalListingCtaLabel(
  source: ExternalListingSource,
): string {
  const label = SOURCE_CTA[source] ?? "Open listing";
  return label.includes("↗") ? label : `${label} ↗`;
}

export const DISCOVER_PLATFORM_FILTERS = [
  { value: "all", label: "All platforms" },
  { value: "collector_crypt", label: "Collector Crypt" },
  { value: "phygitals", label: "Phygitals" },
] as const;

export type DiscoverPlatformFilter =
  (typeof DISCOVER_PLATFORM_FILTERS)[number]["value"];

export function parseDiscoverPlatformFilter(
  raw: string | undefined,
): DiscoverPlatformFilter {
  if (raw === "collector_crypt" || raw === "phygitals") return raw;
  return "all";
}
