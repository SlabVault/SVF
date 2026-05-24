import {
  readAllTensorBidStates,
  removeTensorBidState,
} from "@/lib/trade/tensor-bid-session";

/** Open bid row — Tensor user NFT/collection bids + optional session fallback. */
export type WalletOpenBid = {
  bidStateAddress: string;
  mint: string | null;
  collId: string | null;
  label: string;
  priceSol: number;
  bidType: "nft" | "collection";
  /** True when sourced from sessionStorage only (not yet in Tensor read index). */
  fromSession?: boolean;
};

export type WalletBidsResponse = {
  configured: boolean;
  bids: WalletOpenBid[];
  cursor: string | null;
  error?: string;
};

/** Merge session-stored bid states not already returned by the read API. */
export function mergeSessionWalletBids(
  apiBids: WalletOpenBid[],
  options?: { mints?: Iterable<string> },
): WalletOpenBid[] {
  const knownStates = new Set(apiBids.map((bid) => bid.bidStateAddress));
  const mintFilter =
    options?.mints != null ? new Set([...options.mints].map((m) => m.trim())) : null;

  const sessionRows = readAllTensorBidStates().filter((row) => {
    if (knownStates.has(row.bidStateAddress)) return false;
    if (mintFilter && !mintFilter.has(row.mint)) return false;
    return true;
  });

  const sessionBids: WalletOpenBid[] = sessionRows.map((row) => ({
    bidStateAddress: row.bidStateAddress,
    mint: row.mint,
    collId: null,
    label: `${row.mint.slice(0, 4)}…${row.mint.slice(-4)}`,
    priceSol: 0,
    bidType: "nft",
    fromSession: true,
  }));

  return [...apiBids, ...sessionBids];
}

export function clearSessionBidAfterCancel(bid: WalletOpenBid): void {
  if (bid.mint) removeTensorBidState(bid.mint);
}
