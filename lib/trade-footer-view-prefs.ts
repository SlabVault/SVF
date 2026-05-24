export const TRADE_FOOTER_VIEW_STORAGE_KEY = "svf-grails-trade-footer-view";

export type TradeFooterView = "lite" | "pro";

export function readTradeFooterViewPreference(): TradeFooterView | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(TRADE_FOOTER_VIEW_STORAGE_KEY);
  return raw === "lite" || raw === "pro" ? raw : null;
}

export function writeTradeFooterViewPreference(view: TradeFooterView): void {
  window.localStorage.setItem(TRADE_FOOTER_VIEW_STORAGE_KEY, view);
}

export function applyTradeFooterViewToDocument(view: TradeFooterView): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.tradeFooterView = view;
}
