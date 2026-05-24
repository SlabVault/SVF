"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";

import {
  DEFAULT_TRADE_FILTERS,
  parseTradeFiltersFromSearchParams,
  tradeFilterSearchString,
} from "@/lib/trade/trade-filter-url";
import type { TradeTraitFilters } from "@/lib/trade-listings";

function readFiltersFromLocation(): TradeTraitFilters {
  if (typeof window === "undefined") return DEFAULT_TRADE_FILTERS;
  return parseTradeFiltersFromSearchParams(new URLSearchParams(window.location.search));
}

/** Collection desk filter state synced to URL via `history.replaceState`. */
export function useTradeDeskFilters(): [
  TradeTraitFilters,
  Dispatch<SetStateAction<TradeTraitFilters>>,
] {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFiltersState] = useState<TradeTraitFilters>(() =>
    parseTradeFiltersFromSearchParams(searchParams),
  );

  useEffect(() => {
    const onPopState = () => {
      setFiltersState(readFiltersFromLocation());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const setFilters = useCallback<Dispatch<SetStateAction<TradeTraitFilters>>>(
    (update) => {
      setFiltersState((current) => {
        const next = typeof update === "function" ? update(current) : update;
        const query = tradeFilterSearchString(next);
        const url = query ? `${pathname}?${query}` : pathname;
        window.history.replaceState(null, "", url);
        return next;
      });
    },
    [pathname],
  );

  return [filters, setFilters];
}
