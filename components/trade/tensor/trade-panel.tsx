"use client";

import { useEffect, useId, useMemo, useState, type CSSProperties } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import { DelistModal } from "@/components/trade/delist-modal";
import { ListForSaleModal } from "@/components/trade/list-for-sale-modal";
import { PlaceOfferModal } from "@/components/trade/place-offer-modal";
import { getTradeCollectionBySlug } from "@/lib/onchain/collections";
import {
  resolveTradeListingMint,
  sortTradeListings,
  type TradeListing,
} from "@/lib/trade-listings";
import {
  isTradeWriteEnabledClient,
  tradeWriteDisabledTooltip,
} from "@/lib/trade/trade-modal";
import { clearSessionBidAfterCancel } from "@/lib/trade/wallet-bids";
import { cn } from "@/lib/utils";

import {
  mapTradeListingToTensorNft,
  tradeListingHasOnChainBuyMetadata,
} from "./map-listing";
import { resolvesOnChainSettlement, useTensorBuy } from "./use-tensor-buy";
import { useTensorCancelBid } from "./use-tensor-cancel-bid";
import { useWalletOpenBids } from "./use-wallet-open-bids";

type Props = {
  className?: string;
  collectionSlug: string;
  listings: TradeListing[];
  floorSol: number | null;
  /** Aggregate `/trade/all` desk — sweep excludes partner-only rows. */
  aggregateDesk?: boolean;
  onModeChange?: (mode: "buy" | "sell") => void;
};

type TradeMode = "buy" | "sell";
type BuyTab = "sweep" | "bid" | "cancel";
type SellTab = "list" | "sell" | "delist";
type SweepUnit = "count" | "sol";

function gateTitle(writeEnabled: boolean, connected: boolean, extra?: string): string | undefined {
  if (!writeEnabled) return tradeWriteDisabledTooltip();
  if (!connected) return "Connect a wallet on Solana to continue.";
  return extra;
}

function sliderTrackFillStyle(
  value: number,
  min: number,
  max: number,
): CSSProperties {
  if (max <= min) {
    return { "--slider-fill": "0%" } as CSSProperties;
  }
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  return { "--slider-fill": `${pct}%` } as CSSProperties;
}

/** Buy / sell / sweep panel — Tensor Pro left column with gated on-chain actions. */
function listingEligibleForSweep(
  listing: TradeListing,
  collectionSlug: string,
): boolean {
  return (
    resolvesOnChainSettlement(listing, collectionSlug) &&
    tradeListingHasOnChainBuyMetadata(listing)
  );
}

export function TensorTradePanel({
  className,
  collectionSlug,
  listings,
  floorSol,
  aggregateDesk = false,
  onModeChange,
}: Props) {
  const [mode, setMode] = useState<TradeMode>("buy");
  const [buyTab, setBuyTab] = useState<BuyTab>("sweep");
  const [sellTab, setSellTab] = useState<SellTab>("list");
  const [listCount, setListCount] = useState(1);
  const [sweepCount, setSweepCount] = useState(1);
  const [sweepUnit, setSweepUnit] = useState<SweepUnit>("count");
  const [maxPriceSol, setMaxPriceSol] = useState(floorSol ?? 0);
  const [sweepError, setSweepError] = useState<string | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [delistOpen, setDelistOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const sweepSliderId = useId();
  const listSliderId = useId();
  const maxPriceId = useId();
  const sellTabsId = useId();
  const { connected } = useWallet();
  const writeEnabled = isTradeWriteEnabledClient();
  const { buy, pending, canBuyOnChain } = useTensorBuy();
  const { cancelBid, pending: cancelPending } = useTensorCancelBid();

  const collectionMints = useMemo(
    () =>
      listings
        .map((listing) => resolveTradeListingMint(listing))
        .filter((mint): mint is string => mint != null),
    [listings],
  );

  const {
    bids: walletOpenBids,
    loading: bidsLoading,
    configured: bidsConfigured,
    refresh: refreshBids,
  } = useWalletOpenBids({
    collectionSlug,
    collectionMints,
    enabled: connected && buyTab === "cancel",
  });

  useEffect(() => {
    if (floorSol != null && floorSol > 0) {
      setMaxPriceSol(floorSol);
    }
  }, [floorSol]);

  useEffect(() => {
    onModeChange?.(mode);
  }, [mode, onModeChange]);

  const handleModeChange = (next: TradeMode) => {
    setMode(next);
    if (next === "sell") {
      setSellTab("list");
    }
  };

  const sortedListings = useMemo(
    () => sortTradeListings(listings, "price_asc"),
    [listings],
  );

  const sweepEligibleListings = useMemo(
    () =>
      sortedListings.filter((listing) =>
        listingEligibleForSweep(listing, collectionSlug),
      ),
    [sortedListings, collectionSlug],
  );

  const sweepCandidates = useMemo(() => {
    const max = maxPriceSol > 0 ? maxPriceSol : Number.POSITIVE_INFINITY;
    return sweepEligibleListings
      .filter((listing) => listing.askSol > 0 && listing.askSol <= max)
      .slice(0, Math.max(0, sweepCount));
  }, [sweepEligibleListings, maxPriceSol, sweepCount]);

  const bidListing = sortedListings[0] ?? null;
  const sweepTotalSol = sweepCandidates.reduce((sum, listing) => sum + listing.askSol, 0);
  const onChainSettlement =
    getTradeCollectionBySlug(collectionSlug)?.settlementMode !== "partner_site";

  const hasPartnerCheckoutRows = useMemo(
    () =>
      sortedListings.some(
        (listing) => !resolvesOnChainSettlement(listing, collectionSlug),
      ),
    [sortedListings, collectionSlug],
  );

  const hasMissingSellerEnrichmentRows = useMemo(
    () =>
      onChainSettlement &&
      sortedListings.some(
        (listing) =>
          resolvesOnChainSettlement(listing, collectionSlug) &&
          !tradeListingHasOnChainBuyMetadata(listing),
      ),
    [sortedListings, collectionSlug, onChainSettlement],
  );

  const showPartnerSweepHint =
    aggregateDesk || !onChainSettlement || hasPartnerCheckoutRows;
  const showSellerEnrichmentSweepHint = hasMissingSellerEnrichmentRows;

  const sweepDisabled =
    !writeEnabled ||
    !connected ||
    !onChainSettlement ||
    sweepCount <= 0 ||
    sweepCandidates.length === 0 ||
    pending;

  const bidDisabled = !writeEnabled || !connected || !bidListing;
  const sellListDisabled = !writeEnabled || !connected;
  const listBulkDisabled = sellListDisabled || listCount > 1;

  const handleCancelBid = async (bidStateAddress: string, mint: string | null) => {
    setCancelError(null);
    if (!writeEnabled || !connected) return;

    const target = walletOpenBids.find((bid) => bid.bidStateAddress === bidStateAddress);
    const label = target
      ? `Cancel bid on ${target.label}${target.priceSol > 0 ? ` (${target.priceSol.toFixed(4)} ◎)` : ""}?`
      : "Cancel this open bid?";
    if (!window.confirm(label)) return;

    setCancellingId(bidStateAddress);
    try {
      await cancelBid({ bidStateAddress });
      if (target) clearSessionBidAfterCancel(target);
      else if (mint) clearSessionBidAfterCancel({ bidStateAddress, mint, collId: null, label: "", priceSol: 0, bidType: "nft" });
      await refreshBids();
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : "Cancel bid failed.");
    } finally {
      setCancellingId(null);
    }
  };

  const handleSweep = async () => {
    setSweepError(null);
    if (sweepDisabled) return;

    const label = `Sweep ${sweepCandidates.length} listing(s) for ${sweepTotalSol.toFixed(4)} ◎ (max ${maxPriceSol} ◎ each)?`;
    if (!window.confirm(label)) return;

    try {
      for (const listing of sweepCandidates) {
        const nft = mapTradeListingToTensorNft(listing, collectionSlug);
        if (!canBuyOnChain(nft, listing, collectionSlug)) {
          throw new Error(`Listing ${listing.name} is not eligible for on-chain fill.`);
        }
        try {
          await buy(nft, collectionSlug);
        } catch (error) {
          const label = listing.name || listing.id;
          const message = error instanceof Error ? error.message : "Unknown error";
          throw new Error(`Failed on "${label}": ${message}`);
        }
      }
    } catch (error) {
      setSweepError(error instanceof Error ? error.message : "Sweep failed.");
    }
  };

  return (
    <div
      className={cn(
        "trade-panel flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto p-2 text-[11px]",
        className,
      )}
    >
      <div className="grid grid-cols-2 gap-1">
        {(["buy", "sell"] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={cn(
              "min-h-8 rounded border px-2 font-semibold uppercase tracking-wide transition-colors",
              mode === value
                ? "border-[var(--tensor-accent)] text-[var(--tensor-white)]"
                : "border-[#333] text-[var(--trade-muted)] hover:text-[var(--tensor-white)]",
            )}
            aria-pressed={mode === value}
            onClick={() => handleModeChange(value)}
          >
            {value}
          </button>
        ))}
      </div>

      {mode === "buy" ? (
        <>
          <div
            className="trade-panel-tabs flex"
            role="tablist"
            aria-label="Buy actions"
          >
            {(
              [
                { id: "sweep" as const, label: "SWEEP" },
                { id: "bid" as const, label: "BID" },
                { id: "cancel" as const, label: "CANCEL" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                className="trade-panel-tab flex-1 px-1 py-1.5 text-[10px] font-semibold uppercase tracking-wide"
                aria-pressed={buyTab === tab.id}
                aria-selected={buyTab === tab.id}
                onClick={() => setBuyTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {buyTab === "sweep" ? (
            <>
              <h2 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--trade-muted)]">
                NFTS TO BUY
              </h2>

              {sweepUnit === "count" ? (
                <>
                  <div className="flex items-center justify-end">
                    <span className="font-mono text-xs font-bold tabular-nums text-[var(--tensor-white)]">
                      {sweepEligibleListings.length > 0 ? sweepCount : 0}
                    </span>
                  </div>
                  <input
                    id={sweepSliderId}
                    type="range"
                    min={sweepEligibleListings.length > 0 ? 1 : 0}
                    max={Math.max(sweepEligibleListings.length, 1)}
                    step={1}
                    value={
                      sweepEligibleListings.length > 0 ? Math.max(1, sweepCount) : 0
                    }
                    onChange={(event) =>
                      setSweepCount(Math.max(1, Number.parseInt(event.target.value, 10) || 1))
                    }
                    className="trade-sweep-slider w-full"
                    style={sliderTrackFillStyle(
                      sweepEligibleListings.length > 0 ? Math.max(1, sweepCount) : 0,
                      sweepEligibleListings.length > 0 ? 1 : 0,
                      Math.max(sweepEligibleListings.length, 1),
                    )}
                    aria-label="NFT count to sweep"
                    disabled={sweepEligibleListings.length === 0}
                  />
                </>
              ) : (
                <>
                  <label
                    htmlFor={maxPriceId}
                    className="text-[10px] font-semibold uppercase tracking-wide text-[var(--trade-muted)]"
                  >
                    Budget (◎)
                  </label>
                  <input
                    id={maxPriceId}
                    type="number"
                    min={0}
                    step="0.0001"
                    value={maxPriceSol}
                    onChange={(event) =>
                      setMaxPriceSol(Math.max(0, Number.parseFloat(event.target.value) || 0))
                    }
                    className="h-7 w-full rounded border border-[#333] bg-[var(--trade-surface)] px-2 font-mono text-xs text-[var(--tensor-white)]"
                    aria-label="Sweep budget in SOL"
                  />
                  <p className="text-[10px] leading-snug text-[var(--trade-muted)]">
                    SOL budget sweep{" "}
                    <span className="font-normal normal-case text-[var(--tensor-white)]">
                      Soon
                    </span>
                  </p>
                </>
              )}

              <div
                className="grid grid-cols-2 gap-1"
                role="radiogroup"
                aria-label="Sweep unit"
              >
                {(
                  [
                    { id: "count" as const, label: "Count" },
                    { id: "sol" as const, label: "SOL" },
                  ] as const
                ).map((unit) => (
                  <button
                    key={unit.id}
                    type="button"
                    role="radio"
                    className={cn(
                      "trade-sweep-unit min-h-6 rounded border px-1 text-[10px] font-semibold uppercase tracking-wide",
                      sweepUnit === unit.id
                        ? "border-[var(--tensor-accent)] text-[var(--tensor-white)]"
                        : "border-[#333] text-[var(--trade-muted)] hover:text-[var(--tensor-white)]",
                    )}
                    aria-checked={sweepUnit === unit.id}
                    onClick={() => setSweepUnit(unit.id)}
                  >
                    {unit.label}
                  </button>
                ))}
              </div>

              {sweepUnit === "count" ? (
                <>
                  <label
                    htmlFor={`${maxPriceId}-floor`}
                    className="text-[10px] font-semibold uppercase tracking-wide text-[var(--trade-muted)]"
                  >
                    Max price (◎)
                  </label>
                  <input
                    id={`${maxPriceId}-floor`}
                    type="number"
                    min={0}
                    step="0.0001"
                    value={maxPriceSol}
                    onChange={(event) =>
                      setMaxPriceSol(Math.max(0, Number.parseFloat(event.target.value) || 0))
                    }
                    className="h-7 w-full rounded border border-[#333] bg-[var(--trade-surface)] px-2 font-mono text-xs text-[var(--tensor-white)]"
                    aria-label="Maximum price per NFT in SOL"
                  />
                </>
              ) : null}
              {showPartnerSweepHint ? (
                <p className="text-[10px] leading-snug text-[var(--trade-muted)]">
                  Sweep is on-chain only — partner checkout rows are excluded. Use Buy on partner ↗ on grid tiles for off-chain listings.
                </p>
              ) : null}
              {showSellerEnrichmentSweepHint ? (
                <p className="text-[10px] leading-snug text-[var(--trade-muted)]">
                  On-chain rows missing Tensor seller enrichment (seller wallet or list state) are excluded from sweep.
                </p>
              ) : null}
              {sweepError ? (
                <p className="text-[10px] text-red-400" role="alert">
                  {sweepError}
                </p>
              ) : null}
              <button
                type="button"
                disabled={sweepDisabled}
                title={gateTitle(writeEnabled, connected, sweepCount <= 0 ? "Enter a sweep count." : undefined)}
                className="tensor-btn-sweep mt-auto h-9 text-[10px] font-bold uppercase tracking-wide"
                onClick={() => void handleSweep()}
              >
                {pending
                  ? "SWEEPING…"
                  : `SWEEP ${sweepCandidates.length} NFTS FOR ${sweepTotalSol.toFixed(2)}`}
              </button>
              <p className="text-[10px] leading-snug text-[var(--trade-muted)]">
                Single-floor sweep — one buy tx per listing via{" "}
                <code className="text-[10px]">/api/trade/tx/buy</code>.
              </p>
            </>
          ) : null}

          {buyTab === "bid" ? (
            <>
              <p className="text-[10px] leading-snug text-[var(--trade-muted)]">
                Place an offer on the cheapest listed slab in this collection.
              </p>
              <button
                type="button"
                disabled={bidDisabled}
                title={gateTitle(
                  writeEnabled,
                  connected,
                  !bidListing ? "No listed slabs to bid on." : undefined,
                )}
                className={cn(
                  "tensor-btn-primary h-8 text-[10px] uppercase",
                  bidDisabled && "cursor-not-allowed opacity-60",
                )}
                onClick={() => setOfferOpen(true)}
              >
                Place bid
              </button>
              {bidListing ? (
                <PlaceOfferModal
                  open={offerOpen}
                  onClose={() => setOfferOpen(false)}
                  listing={bidListing}
                  collectionSlug={collectionSlug}
                  onComplete={() => void refreshBids()}
                />
              ) : null}
            </>
          ) : null}

          {buyTab === "cancel" ? (
            <>
              <p className="text-[10px] leading-snug text-[var(--trade-muted)]">
                Cancel open bids for your wallet via{" "}
                <code className="text-[10px]">/api/trade/tx/cancel-bid</code>.
              </p>
              {!bidsConfigured ? (
                <p className="text-[10px] text-[var(--trade-muted)]">
                  Tensor read API not configured — only bids placed this session appear.
                </p>
              ) : null}
              {bidsLoading ? (
                <p className="text-[10px] text-[var(--trade-muted)]">Loading open bids…</p>
              ) : walletOpenBids.length === 0 ? (
                <p className="text-[10px] text-[var(--trade-muted)]">
                  No open bids for this wallet in this collection yet.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {walletOpenBids.map((bid) => {
                    const rowPending = cancelPending && cancellingId === bid.bidStateAddress;
                    const rowDisabled = !writeEnabled || !connected || cancelPending;
                    return (
                      <li
                        key={bid.bidStateAddress}
                        className="flex items-center justify-between gap-2 rounded border border-[#333] px-2 py-1.5"
                      >
                        <span className="min-w-0 truncate font-mono text-[10px] text-[var(--tensor-white)]">
                          {bid.label}
                          {bid.priceSol > 0 ? ` — ${bid.priceSol.toFixed(4)} ◎` : ""}
                          {bid.fromSession ? (
                            <span className="ml-1 text-[var(--trade-muted)]">(pending index)</span>
                          ) : null}
                        </span>
                        <button
                          type="button"
                          disabled={rowDisabled}
                          title={gateTitle(
                            writeEnabled,
                            connected,
                            rowPending ? "Cancelling…" : undefined,
                          )}
                          className={cn(
                            "shrink-0 rounded border border-[#333] px-2 py-0.5 text-[9px] font-semibold uppercase text-[var(--tensor-white)] hover:border-[var(--tensor-accent)]",
                            rowDisabled && "cursor-not-allowed opacity-60",
                          )}
                          onClick={() =>
                            void handleCancelBid(bid.bidStateAddress, bid.mint)
                          }
                        >
                          {rowPending ? "…" : "Cancel"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {cancelError ? (
                <p className="text-[10px] text-red-400" role="alert">
                  {cancelError}
                </p>
              ) : null}
            </>
          ) : null}
        </>
      ) : (
        <>
          <div
            className="trade-panel-tabs flex"
            role="tablist"
            aria-label="Sell actions"
          >
            {(
              [
                { id: "list" as const, label: "LIST" },
                { id: "sell" as const, label: "SELL" },
                { id: "delist" as const, label: "DELIST" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                id={`${sellTabsId}-tab-${tab.id}`}
                type="button"
                role="tab"
                className="trade-panel-tab flex-1 px-1 py-1.5 text-[10px] font-semibold uppercase tracking-wide"
                aria-pressed={sellTab === tab.id}
                aria-selected={sellTab === tab.id}
                aria-controls={`${sellTabsId}-panel-${tab.id}`}
                onClick={() => setSellTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {sellTab === "list" ? (
            <div
              id={`${sellTabsId}-panel-list`}
              role="tabpanel"
              aria-labelledby={`${sellTabsId}-tab-list`}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor={listSliderId}
                  className="text-[10px] font-semibold uppercase tracking-wide text-[var(--trade-muted)]"
                >
                  NFTs to list
                </label>
                <span className="font-mono text-xs font-bold tabular-nums text-[var(--tensor-white)]">
                  {listCount}
                </span>
              </div>
              <input
                id={listSliderId}
                type="range"
                min={1}
                max={10}
                step={1}
                value={Math.max(1, listCount)}
                onChange={(event) =>
                  setListCount(Math.max(1, Number.parseInt(event.target.value, 10) || 1))
                }
                className="trade-sweep-slider w-full"
                style={sliderTrackFillStyle(Math.max(1, listCount), 1, 10)}
                aria-label="NFT count to list"
                disabled={!connected}
              />
              <button
                type="button"
                disabled={listBulkDisabled}
                title={gateTitle(
                  writeEnabled,
                  connected,
                  listCount > 1
                    ? "Bulk list from inventory ships when wallet holdings are indexed."
                    : undefined,
                )}
                className={cn(
                  "tensor-btn-primary mt-auto h-9 text-[11px] font-bold uppercase tracking-wide",
                  listBulkDisabled && "cursor-not-allowed opacity-60",
                )}
                onClick={() => setListOpen(true)}
              >
                {listCount > 1
                  ? `List ${listCount} NFTs`
                  : "List for sale"}
              </button>
              {listCount > 1 ? (
                <p className="text-[10px] leading-snug text-[var(--trade-muted)]">
                  Multi-select list uses inventory mints when portfolio sync is enabled.
                </p>
              ) : null}
              <p className="text-[10px] leading-snug text-[var(--trade-muted)]">
                Maker fee: <span className="text-[var(--tensor-white)]">FREE</span>
              </p>
            </div>
          ) : null}

          {sellTab === "sell" ? (
            <div
              id={`${sellTabsId}-panel-sell`}
              role="tabpanel"
              aria-labelledby={`${sellTabsId}-tab-sell`}
              className="flex flex-col gap-2"
            >
              <p className="text-[10px] leading-snug text-[var(--trade-muted)]">
                List a slab from your wallet at a fixed price through Tensor TCM.
              </p>
              <button
                type="button"
                disabled={sellListDisabled}
                title={gateTitle(writeEnabled, connected)}
                className={cn(
                  "tensor-btn-primary h-8 text-[10px] uppercase",
                  sellListDisabled && "cursor-not-allowed opacity-60",
                )}
                onClick={() => setListOpen(true)}
              >
                List for sale
              </button>
              <p className="text-[10px] leading-snug text-[var(--trade-muted)]">
                Instant sell to AMM pool ships in Phase 3 — use list at floor from the grid tile.
              </p>
            </div>
          ) : null}

          {sellTab === "delist" ? (
            <div
              id={`${sellTabsId}-panel-delist`}
              role="tabpanel"
              aria-labelledby={`${sellTabsId}-tab-delist`}
              className="flex flex-col gap-2"
            >
              {!connected ? (
                <p className="text-[10px] leading-snug text-[var(--trade-muted)]">
                  Connect wallet to manage listings.
                </p>
              ) : (
                <p className="text-[10px] leading-snug text-[var(--trade-muted)]">
                  No active listings for this wallet in this collection yet.
                </p>
              )}
              <button
                type="button"
                disabled={sellListDisabled}
                title={gateTitle(writeEnabled, connected)}
                className={cn(
                  "tensor-btn-primary h-8 text-[10px] uppercase",
                  sellListDisabled && "cursor-not-allowed opacity-60",
                )}
                onClick={() => setDelistOpen(true)}
              >
                Delist listing
              </button>
            </div>
          ) : null}

          <ListForSaleModal
            open={listOpen}
            onClose={() => setListOpen(false)}
            itemLabel={`List in ${collectionSlug}`}
            suggestedPriceSol={floorSol ?? undefined}
          />
          <DelistModal open={delistOpen} onClose={() => setDelistOpen(false)} />
        </>
      )}
    </div>
  );
}
