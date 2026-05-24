export const TRADE_LANDING_VIEW_STORAGE_KEY = "svf-grails-trade-landing-view";
export const TRADE_LANDING_TIMEFRAME_STORAGE_KEY = "svf-grails-trade-landing-timeframe";

export type TradeLandingIndexView = "cards" | "table";
export type TradeLandingTimeframe = "1h" | "24h" | "7d";

/** Tensor homepage index default — TABLE on first visit when no stored preference. */
export const DEFAULT_TRADE_LANDING_INDEX_VIEW: TradeLandingIndexView = "table";

export function readTradeLandingViewPreference(): TradeLandingIndexView | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(TRADE_LANDING_VIEW_STORAGE_KEY);
  return raw === "cards" || raw === "table" ? raw : null;
}

export function writeTradeLandingViewPreference(view: TradeLandingIndexView): void {
  window.localStorage.setItem(TRADE_LANDING_VIEW_STORAGE_KEY, view);
}

export function readTradeLandingTimeframePreference(): TradeLandingTimeframe | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(TRADE_LANDING_TIMEFRAME_STORAGE_KEY);
  return raw === "1h" || raw === "24h" || raw === "7d" ? raw : null;
}

export function writeTradeLandingTimeframePreference(
  timeframe: TradeLandingTimeframe,
): void {
  window.localStorage.setItem(TRADE_LANDING_TIMEFRAME_STORAGE_KEY, timeframe);
}
