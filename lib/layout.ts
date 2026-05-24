/** Shared grid for vault inventory and marketplace listings. */
export const SLAB_GRID_CLASS =
  "slab-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-3";

export {
  TRADE_GRID_CLASS,
  TRADE_GRID_DENSITY_CLASS,
  type TradeGridDensity,
} from "@/lib/trade/grid-density";

/** Shared card shell for listing-style cards (vault + marketplace + discover). */
export const SLAB_CARD_SHELL_CLASS =
  "group flex h-full min-h-[22rem] flex-col overflow-hidden p-0 transition-[border-color,box-shadow] hover:border-vault-violet/30 hover:shadow-[0_0_28px_-12px_rgba(139,92,246,0.45)] sm:min-h-[24rem]";

/** Shared body padding for listing card content areas. */
export const SLAB_CARD_BODY_CLASS =
  "flex flex-1 flex-col gap-2 bg-gradient-to-b from-vault-panel/30 to-vault-deep/30 p-4 sm:p-5";

/** Vertical rhythm for stacked page sections. */
export const SECTION_STACK_CLASS = "space-y-6";

/** Standard section heading (h2). */
export const SECTION_HEADING_CLASS =
  "font-heading text-2xl font-bold tracking-tight sm:text-3xl";

/** Standard section lead paragraph. */
export const SECTION_LEAD_CLASS =
  "mt-2 max-w-2xl text-sm text-muted sm:text-base";

/** Standard page title (h1). */
export const PAGE_TITLE_CLASS =
  "font-heading text-4xl font-bold tracking-tight sm:text-5xl";

/** Shared stat / feature card padding. */
export const FEATURE_CARD_CLASS =
  "rounded-xl border border-line/80 bg-vault-deep/50 p-5 sm:p-6";
