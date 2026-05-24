import type { TradePartnerId } from "@/lib/onchain/collections";
import type { TradeTraitFilters } from "@/lib/trade-listings";
import { DEFAULT_TRADE_FILTERS, TRADE_KNOWN_GRADERS } from "@/lib/trade-listings";

const VALID_VENUE_PARTNERS = new Set<TradePartnerId>([
  "collector_crypt",
  "phygitals",
  "magic_eden",
  "slabvault_treasury",
  "beezie",
  "courtyard",
]);

function splitCsvParam(value: string | null): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((part) => decodeURIComponent(part.trim()))
    .filter(Boolean);
}

function parseOptionalSol(value: string | null): number | null {
  if (!value?.trim()) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/** Parse collection desk filters from `/trade/c/[slug]` search params. */
export function parseTradeFiltersFromSearchParams(
  params: URLSearchParams,
): TradeTraitFilters {
  const knownGraders = new Set<string>(TRADE_KNOWN_GRADERS);
  const graders = splitCsvParam(params.get("grader")).filter((grader) =>
    knownGraders.has(grader.toUpperCase()),
  );

  const partners = splitCsvParam(params.get("venue")).filter(
    (partner): partner is TradePartnerId =>
      VALID_VENUE_PARTNERS.has(partner as TradePartnerId),
  );

  return {
    grades: splitCsvParam(params.get("grade")),
    graders: [...new Set(graders.map((g) => g.toUpperCase()))],
    partners: [...new Set(partners)],
    minAskSol: parseOptionalSol(params.get("min")),
    maxAskSol: parseOptionalSol(params.get("max")),
    searchQuery: params.get("q")?.trim() ?? "",
    setQuery: params.get("set")?.trim() ?? "",
  };
}

/** Serialize filters to URL search params (empty values omitted). */
export function buildTradeFilterSearchParams(
  filters: TradeTraitFilters,
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.graders.length > 0) {
    params.set("grader", filters.graders.join(","));
  }

  if (filters.partners.length > 0) {
    params.set("venue", filters.partners.join(","));
  }

  if (filters.grades.length > 0) {
    params.set(
      "grade",
      filters.grades.map((grade) => encodeURIComponent(grade)).join(","),
    );
  }

  if (filters.minAskSol != null) {
    params.set("min", String(filters.minAskSol));
  }

  if (filters.maxAskSol != null) {
    params.set("max", String(filters.maxAskSol));
  }

  if (filters.searchQuery.trim()) {
    params.set("q", filters.searchQuery.trim());
  }

  if (filters.setQuery.trim()) {
    params.set("set", filters.setQuery.trim());
  }

  return params;
}

export function tradeFilterSearchString(filters: TradeTraitFilters): string {
  return buildTradeFilterSearchParams(filters).toString();
}

export function isDefaultTradeFilters(filters: TradeTraitFilters): boolean {
  return (
    filters.grades.length === 0 &&
    filters.graders.length === 0 &&
    filters.partners.length === 0 &&
    filters.minAskSol == null &&
    filters.maxAskSol == null &&
    !filters.searchQuery.trim() &&
    !filters.setQuery.trim()
  );
}

export { DEFAULT_TRADE_FILTERS };
