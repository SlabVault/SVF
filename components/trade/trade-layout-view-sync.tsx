"use client";

import { useEffect } from "react";

import {
  applyTradeFooterViewToDocument,
  readTradeFooterViewPreference,
} from "@/lib/trade-footer-view-prefs";

/** Hydrates Lite/Pro footer preference onto the document for layout CSS hooks. */
export function TradeLayoutViewSync() {
  useEffect(() => {
    const stored = readTradeFooterViewPreference();
    applyTradeFooterViewToDocument(stored ?? "pro");
  }, []);

  return null;
}
