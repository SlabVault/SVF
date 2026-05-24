/** Grid density for Tensor-style collection desk (s = compact, l = large tiles). */
export type TradeGridDensity = "s" | "m" | "l";

const TRADE_GRID_BASE = "trade-grid grid gap-2.5 md:gap-3";

/** Per-density column classes — `m` matches legacy `TRADE_GRID_CLASS` default. */
export const TRADE_GRID_DENSITY_CLASS: Record<TradeGridDensity, string> = {
  s: `${TRADE_GRID_BASE} grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7`,
  m: `${TRADE_GRID_BASE} grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`,
  l: `${TRADE_GRID_BASE} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`,
};

/** Dense Tensor-style listing grid for `/trade` (medium density). */
export const TRADE_GRID_CLASS = TRADE_GRID_DENSITY_CLASS.m;
