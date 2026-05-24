export type ExternalListingSource =
  | "collector_crypt"
  | "phygitals"
  | "magic_eden"
  | "manual";

export type ExternalListingStatus = "active" | "sold" | "unknown";

export type ExternalListingCurrency = "USD" | "SOL" | "USDC";

export type ExternalListingGrader = "PSA" | "BGS" | "CGC" | "SGC";

/** Normalized external marketplace listing (JSON seed + Prisma). */
export type ExternalListingItem = {
  id: string;
  source: ExternalListingSource;
  externalId: string;
  deepLinkUrl: string;
  title: string;
  grade: string;
  grader?: ExternalListingGrader | null;
  certNumber?: string | null;
  priceUsd: number | null;
  priceSol: number | null;
  currency: ExternalListingCurrency;
  imageUrl: string;
  setName?: string | null;
  cardName?: string | null;
  fmvUsd?: number | null;
  status: ExternalListingStatus;
  indexedAt: string;
  staleAfter: string;
  /** On-chain ask seller when present in partner ingest (Tensor index, DAS owner, etc.). */
  sellerWallet?: string | null;
  /** TCM list state PDA when present in Tensor API responses. */
  listState?: string | null;
};
