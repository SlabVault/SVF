/**
 * Types adapted from vendor/marketplace-nextjs-template/web/app/page.tsx
 * @see vendor/marketplace-nextjs-template/web/components/ui/NftCard.tsx
 */

export type TensorListing = {
  price: string | null;
  txId: string;
  seller: string;
  listState: string;
  source: string;
  blockNumber: string;
  priceUnit: string | null;
};

export type TensorCollectionStats = {
  buyNowPrice: string;
  buyNowPriceNetFees: string;
  floor7d: number;
  floor24h: number;
  marketCap: string;
  numBids: number;
  numListed: number;
  numListed7d: number;
  numListed24h: number;
  numMints: number;
  pctListed: number;
  sales1h: number;
  sales7d: number;
  sales24h: number;
  salesAll: number;
  volume1h: string;
  volume7d: string;
  volume24h: string;
  volumeAll: string;
};

/** Template NFT shape — mapped from partner/treasury TradeListing rows. */
export type TensorNft = {
  mint: string;
  slug: string;
  name: string;
  imageUri: string;
  owner: string;
  listing: TensorListing;
  /** Ask in SOL for display (partner ingest). */
  askSol: number;
  /** Deep link when buy-on-partner is required. */
  partnerUrl: string | null;
  certOrMint: string;
  grade: string | null;
  rank?: number;
};
