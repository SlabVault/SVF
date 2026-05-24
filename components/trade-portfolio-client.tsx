"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useRouter, useSearchParams } from "next/navigation";
import { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useMemo, useState } from "react";

import { LinkButton } from "@/components/link-button";
import { DelistModal } from "@/components/trade/delist-modal";
import { ListForSaleModal } from "@/components/trade/list-for-sale-modal";
import { TradePortfolioGridTile } from "@/components/trade/portfolio/trade-portfolio-grid-tile";
import { TradePortfolioPublicShell } from "@/components/trade/portfolio/trade-portfolio-public-shell";
import { TradePortfolioSidebar } from "@/components/trade/portfolio/trade-portfolio-sidebar";
import { TradePortfolioStickyBar } from "@/components/trade/portfolio/trade-portfolio-sticky-bar";
import { TradePortfolioSummary } from "@/components/trade/portfolio/trade-portfolio-summary";
import {
  TradePortfolioOrdersShell,
  TradePortfolioReceivedOffersShell,
  TradePortfolioTabs,
} from "@/components/trade/portfolio/trade-portfolio-tabs";
import { TradeDeskHeader } from "@/components/trade/trade-desk-header";
import { TradePortfolioEmptyGrid } from "@/components/trade/trade-portfolio-empty-grid";
import { Button } from "@/components/ui/button";
import { useTensorDelist } from "@/components/trade/tensor/use-tensor-delist";
import { useTensorCancelBid } from "@/components/trade/tensor/use-tensor-cancel-bid";
import { useWalletOpenBids } from "@/components/trade/tensor/use-wallet-open-bids";
import {
  filterPortfolioNfts,
  groupPortfolioCollections,
  parsePortfolioOwnerAddress,
  parsePortfolioTab,
  portfolioOwnerHref,
  PORTFOLIO_OWNER_QUERY,
  PORTFOLIO_TAB_EMPTY,
  formatPortfolioWalletAddress,
  type PortfolioGrailsFilter,
  type PortfolioMarketplaceFilter,
  type PortfolioNft,
  type PortfolioSort,
  type PortfolioStatusFilter,
  type PortfolioTabId,
} from "@/lib/trade/portfolio";
import {
  isTradeWriteEnabledClient,
  tradeWriteDisabledTooltip,
} from "@/lib/trade/trade-modal";
import { clearSessionBidAfterCancel } from "@/lib/trade/wallet-bids";
import type { TradeLandingCollectionPreview } from "@/lib/trade-landing";
import { TRADE_ROUTES } from "@/lib/trade-routes";
import { TRADE_GRID_CLASS } from "@/lib/layout";
import { fetchSolBalanceLamports } from "@/lib/solana-config";
import { cn } from "@/lib/utils";

type Props = {
  collections: TradeLandingCollectionPreview[];
};

/** Tensor portfolio tabs: INVENTORY · RECEIVED OFFERS · PLACED OFFERS · ACTIVITY · ORDERS & BIDS · FAV NFTS */

function PortfolioTabEmpty({ tab }: { tab: PortfolioTabId }) {
  const copy = PORTFOLIO_TAB_EMPTY[tab];
  if (!copy) return null;

  return (
    <div className="space-y-4 p-3 sm:p-4">
      <div
        className="rounded border border-[#333] bg-[var(--trade-surface)] px-4 py-8 text-center sm:px-8"
        role="status"
      >
        <p className="text-sm font-medium text-[var(--tensor-white)]">{copy.title}</p>
        <p className="mx-auto mt-2 max-w-md text-xs text-[var(--trade-muted)]">{copy.body}</p>
      </div>
      <TradePortfolioEmptyGrid />
    </div>
  );
}

function PortfolioTabSoon({ label }: { label: string }) {
  return (
    <div className="space-y-4 p-3 sm:p-4">
      <div
        className="rounded border border-[#333] bg-[var(--trade-surface)] px-4 py-8 text-center sm:px-8"
        role="status"
      >
        <p className="text-sm font-medium text-[var(--tensor-white)]">{label} coming soon</p>
        <p className="mx-auto mt-2 max-w-md text-xs text-[var(--trade-muted)]">
          On-chain sync ships with Tensor write paths. This tab will mirror tensor.trade
          portfolio {label.toLowerCase()} once wallet holdings are indexed.
        </p>
      </div>
      <TradePortfolioEmptyGrid />
    </div>
  );
}

function PortfolioPlacedOffersPanel({
  loading,
  configured,
  bids,
  writeEnabled,
  cancelPending,
  cancellingId,
  onCancel,
}: {
  loading: boolean;
  configured: boolean;
  bids: ReturnType<typeof useWalletOpenBids>["bids"];
  writeEnabled: boolean;
  cancelPending: boolean;
  cancellingId: string | null;
  onCancel: (bidStateAddress: string) => void;
}) {
  if (loading) {
    return (
      <div className="p-3 sm:p-4">
        <TradePortfolioEmptyGrid skeleton />
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="space-y-4 p-3 sm:p-4">
        <div
          className="rounded border border-[#333] bg-[var(--trade-surface)] px-4 py-6 text-center sm:px-8"
          role="status"
        >
          <p className="text-sm font-medium text-[var(--tensor-white)]">
            Tensor read API not configured
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs text-[var(--trade-muted)]">
            Set <code className="text-[var(--tensor-accent)]">TENSOR_API_KEY</code> to load open
            bids. Bids placed this session may still appear after you connect write on staging.
          </p>
        </div>
        <TradePortfolioEmptyGrid />
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="space-y-4 p-3 sm:p-4">
        <div
          className="rounded border border-[#333] bg-[var(--trade-surface)] px-4 py-6 text-center sm:px-8"
          role="status"
        >
          <p className="text-sm font-medium text-[var(--tensor-white)]">No placed offers</p>
          <p className="mx-auto mt-2 max-w-md text-xs text-[var(--trade-muted)]">
            Open item and collection bids from your wallet appear here when Tensor indexes them.
            No placeholder rows are shown.
          </p>
        </div>
        <TradePortfolioEmptyGrid />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3 sm:p-4">
      <ul className="space-y-2">
        {bids.map((bid) => {
          const rowPending = cancelPending && cancellingId === bid.bidStateAddress;
          const rowDisabled = !writeEnabled || cancelPending;
          return (
            <li
              key={bid.bidStateAddress}
              className="flex flex-wrap items-center justify-between gap-3 rounded border border-[#333] bg-[var(--trade-surface)] px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--tensor-white)]">
                  {bid.label}
                </p>
                <p className="font-mono text-[10px] text-[var(--trade-muted)]">
                  {bid.bidType === "collection" ? "Collection bid" : "Item bid"}
                  {bid.priceSol > 0 ? ` · ${bid.priceSol.toFixed(4)} ◎` : ""}
                  {bid.fromSession ? " · pending index" : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="h-8 shrink-0 text-[10px] uppercase"
                disabled={rowDisabled}
                title={!writeEnabled ? tradeWriteDisabledTooltip() : undefined}
                onClick={() => onCancel(bid.bidStateAddress)}
              >
                {rowPending ? "Cancelling…" : "Cancel"}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PortfolioInventoryPanel({
  nfts,
  loading,
  configured,
  search,
  onSearchChange,
  sort,
  onSortChange,
  selectedIds,
  onToggleSelect,
  onList,
}: {
  nfts: PortfolioNft[];
  loading: boolean;
  configured: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  sort: PortfolioSort;
  onSortChange: (value: PortfolioSort) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onList: () => void;
}) {
  if (loading) {
    return (
      <div className="p-3 sm:p-4">
        <TradePortfolioEmptyGrid skeleton />
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="space-y-4 p-3 sm:p-4">
        <div
          className="rounded border border-[#333] bg-[var(--trade-surface)] px-4 py-6 text-center sm:px-8"
          role="status"
        >
          <p className="text-sm font-medium text-[var(--tensor-white)]">
            Helius DAS not configured
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs text-[var(--trade-muted)]">
            Set <code className="text-[var(--tensor-accent)]">HELIUS_API_KEY</code> to load
            wallet inventory. No placeholder assets are shown.
          </p>
          <LinkButton
            href={TRADE_ROUTES.landing}
            className="mt-4"
            trackingEvent="cta_trade_portfolio_to_desk"
            trackingContext="trade_portfolio_helius_missing"
          >
            Browse collections
          </LinkButton>
        </div>
        <TradePortfolioEmptyGrid />
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className="space-y-4 p-3 sm:p-4">
        <div
          className="rounded border border-[#333] bg-[var(--trade-surface)] px-4 py-6 text-center sm:px-8"
          role="status"
        >
          <p className="text-sm font-medium text-[var(--tensor-white)]">No NFTs in wallet</p>
          <p className="mx-auto mt-2 max-w-md text-xs text-[var(--trade-muted)]">
            Your connected wallet has no indexed holdings yet. Graded slabs from partner
            collections will appear here when minted to this address.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              className="tensor-btn-primary !w-auto"
              onClick={onList}
              data-growth-event="cta_trade_portfolio_list"
              data-growth-context="trade_portfolio_inventory_empty"
            >
              List for sale
            </Button>
            <LinkButton
              href={TRADE_ROUTES.landing}
              variant="secondary"
              trackingEvent="cta_trade_portfolio_to_desk"
              trackingContext="trade_portfolio_inventory_empty"
            >
              Browse collections
            </LinkButton>
          </div>
        </div>
        <TradePortfolioEmptyGrid />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#333] px-3 py-2">
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search NFTs by Name"
          className="h-8 min-w-[12rem] flex-1 rounded border border-[#333] bg-[var(--trade-panel)] px-3 text-[11px] text-[var(--tensor-white)] placeholder:text-[var(--trade-muted)]"
        />
        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value as PortfolioSort)}
          className="h-8 rounded border border-[#333] bg-[var(--trade-panel)] px-2 text-[10px] uppercase text-[var(--tensor-white)]"
          aria-label="Sort NFTs"
        >
          <option value="price-asc">Price low to high</option>
          <option value="price-desc">Price high to low</option>
          <option value="bids-desc">Bids (high to low)</option>
        </select>
      </div>

      <div className={cn(TRADE_GRID_CLASS, "flex-1 overflow-y-auto p-3")}>
        {nfts.map((nft, index) => (
          <TradePortfolioGridTile
            key={nft.id}
            nft={nft}
            selected={selectedIds.has(nft.id)}
            onToggleSelect={onToggleSelect}
            priority={index < 4}
          />
        ))}
      </div>
    </div>
  );
}

export function TradePortfolioClient({ collections: _collections }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parsePortfolioTab(searchParams.get("tab"));
  const ownerFromQuery = parsePortfolioOwnerAddress(searchParams.get(PORTFOLIO_OWNER_QUERY));
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();
  const { delistMany, pending: delistPending } = useTensorDelist();
  const { cancelBid, pending: cancelBidPending } = useTensorCancelBid();
  const writeEnabled = isTradeWriteEnabledClient();
  const [cancellingBidId, setCancellingBidId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [delistOpen, setDelistOpen] = useState(false);
  const [listMints, setListMints] = useState<string[]>([]);
  const [delistMints, setDelistMints] = useState<string[]>([]);
  const [nfts, setNfts] = useState<PortfolioNft[]>([]);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const [statusFilter, setStatusFilter] = useState<PortfolioStatusFilter>("all");
  const [marketplaceFilter, setMarketplaceFilter] =
    useState<PortfolioMarketplaceFilter>("all");
  const [grailsFilter, setGrailsFilter] = useState<PortfolioGrailsFilter>("all");
  const [collectionSearch, setCollectionSearch] = useState("");
  const [collectionSort, setCollectionSort] = useState<PortfolioSort>("bids-desc");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [nftSearch, setNftSearch] = useState("");
  const [nftSort, setNftSort] = useState<PortfolioSort>("price-asc");
  const [viewOwner, setViewOwner] = useState<string | null>(ownerFromQuery);
  const [addressDraft, setAddressDraft] = useState(ownerFromQuery ?? "");
  const [addressError, setAddressError] = useState<string | null>(null);

  const walletAddress = publicKey?.toBase58() ?? null;
  const effectiveOwner = connected && walletAddress ? walletAddress : viewOwner;
  const canSignPortfolio =
    connected && walletAddress != null && effectiveOwner === walletAddress;
  const isViewOnly = Boolean(effectiveOwner && !canSignPortfolio);

  const {
    bids: placedBids,
    loading: placedBidsLoading,
    configured: placedBidsConfigured,
    refresh: refreshPlacedBids,
  } = useWalletOpenBids({
    enabled: canSignPortfolio && tab === "placed-offers",
  });

  useEffect(() => {
    if (ownerFromQuery) {
      setViewOwner(ownerFromQuery);
      setAddressDraft(ownerFromQuery);
    }
  }, [ownerFromQuery]);

  useEffect(() => {
    if (!effectiveOwner) {
      setNfts([]);
      setSolBalance(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void fetchSolBalanceLamports(connection, new PublicKey(effectiveOwner)).then((lamports) => {
      if (!cancelled) setSolBalance(lamports);
    });

    void fetch(`/api/trade/wallet/nfts?owner=${encodeURIComponent(effectiveOwner)}`)
      .then((res) => res.json())
      .then((data: { items?: PortfolioNft[]; configured?: boolean }) => {
        if (cancelled) return;
        setNfts(data.items ?? []);
        setConfigured(data.configured ?? false);
      })
      .catch(() => {
        if (!cancelled) {
          setNfts([]);
          setConfigured(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveOwner, connection]);

  const collectionRows = useMemo(() => groupPortfolioCollections(nfts), [nfts]);

  const filteredNfts = useMemo(
    () =>
      filterPortfolioNfts(nfts, {
        status: statusFilter,
        search: nftSearch,
        collectionId: selectedCollectionId,
        sort: nftSort,
      }),
    [nfts, statusFilter, nftSearch, selectedCollectionId, nftSort],
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectedNfts = useMemo(
    () => nfts.filter((nft) => selectedIds.has(nft.id)),
    [nfts, selectedIds],
  );

  const listCount = selectedNfts.filter((nft) => !nft.listed).length;
  const delistCount = selectedNfts.filter((nft) => nft.listed).length;

  const handleViewAddress = useCallback(() => {
    const parsed = parsePortfolioOwnerAddress(addressDraft);
    if (!parsed) {
      setAddressError("Enter a valid Solana wallet address.");
      return;
    }
    setAddressError(null);
    setViewOwner(parsed);
    router.replace(portfolioOwnerHref(parsed, tab), { scroll: false });
  }, [addressDraft, router, tab]);

  const refreshInventory = useCallback(() => {
    if (!effectiveOwner) return;
    void fetch(`/api/trade/wallet/nfts?owner=${encodeURIComponent(effectiveOwner)}`)
      .then((res) => res.json())
      .then((data: { items?: PortfolioNft[]; configured?: boolean }) => {
        setNfts(data.items ?? []);
        setConfigured(data.configured ?? false);
      })
      .catch(() => {
        setNfts([]);
      });
  }, [effectiveOwner]);

  const resolveNftMint = useCallback((nft: PortfolioNft) => nft.mint ?? nft.id, []);

  const openListModal = useCallback(
    (mints: string[]) => {
      setListMints(mints);
      setListOpen(true);
    },
    [],
  );

  const handleStickyList = useCallback(() => {
    const mints = selectedNfts
      .filter((nft) => !nft.listed)
      .map(resolveNftMint)
      .filter(Boolean);
    openListModal(mints);
  }, [openListModal, resolveNftMint, selectedNfts]);

  const handleStickyDelist = useCallback(async () => {
    const listed = selectedNfts.filter((nft) => nft.listed);
    const withKnownMint = listed
      .map((nft) => nft.mint)
      .filter((value): value is string => Boolean(value));
    const needsManual = listed.some((nft) => !nft.mint);

    if (needsManual || withKnownMint.length === 0) {
      setDelistMints(withKnownMint);
      setDelistOpen(true);
      return;
    }

    try {
      await delistMany(withKnownMint);
      setSelectedIds(new Set());
      refreshInventory();
    } catch {
      setDelistMints(withKnownMint);
      setDelistOpen(true);
    }
  }, [delistMany, refreshInventory, selectedNfts]);

  const handleListComplete = useCallback(() => {
    setListMints([]);
    setSelectedIds(new Set());
    refreshInventory();
  }, [refreshInventory]);

  const handleDelistComplete = useCallback(() => {
    setDelistMints([]);
    setSelectedIds(new Set());
    refreshInventory();
  }, [refreshInventory]);

  const handleCancelPlacedBid = useCallback(
    async (bidStateAddress: string) => {
      const target = placedBids.find((bid) => bid.bidStateAddress === bidStateAddress);
      const label = target
        ? `Cancel ${target.bidType === "collection" ? "collection" : "item"} bid on ${target.label}?`
        : "Cancel this open bid?";
      if (!window.confirm(label)) return;

      setCancellingBidId(bidStateAddress);
      try {
        await cancelBid({ bidStateAddress });
        if (target) clearSessionBidAfterCancel(target);
        await refreshPlacedBids();
      } catch {
        /* toast handled by hook path; keep row visible */
      } finally {
        setCancellingBidId(null);
      }
    },
    [cancelBid, placedBids, refreshPlacedBids],
  );

  const tabLabel = PORTFOLIO_TAB_LABELS[tab] ?? "Inventory";

  return (
    <div className="trade-desk-shell mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[1600px] flex-col">
      <TradeDeskHeader variant="portfolio" />

      {!effectiveOwner ? (
        <TradePortfolioPublicShell
          addressDraft={addressDraft}
          addressError={addressError}
          onAddressDraftChange={(value) => {
            setAddressDraft(value);
            if (addressError) setAddressError(null);
          }}
          onConnect={() => setVisible(true)}
          onView={handleViewAddress}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {isViewOnly ? (
            <p className="border-b border-[#333] bg-[var(--trade-panel)] px-3 py-1.5 text-center text-[10px] text-[var(--trade-muted)] lg:col-span-full">
              Viewing{" "}
              <span className="font-mono text-[var(--tensor-white)]">
                {formatPortfolioWalletAddress(effectiveOwner)}
              </span>
              . Connect wallet to list, bid, or delist.
            </p>
          ) : null}
          <TradePortfolioSidebar
            walletAddress={effectiveOwner}
            solBalance={solBalance}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            marketplaceFilter={marketplaceFilter}
            onMarketplaceFilterChange={setMarketplaceFilter}
            grailsFilter={grailsFilter}
            onGrailsFilterChange={setGrailsFilter}
            collectionSearch={collectionSearch}
            onCollectionSearchChange={setCollectionSearch}
            collectionSort={collectionSort}
            onCollectionSortChange={setCollectionSort}
            selectedCollectionId={selectedCollectionId}
            onSelectedCollectionChange={setSelectedCollectionId}
            collections={collectionRows}
            totalNftCount={nfts.length}
          />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <TradePortfolioSummary nfts={nfts} />
            <TradePortfolioTabs activeTab={tab} />

            {tab === "inventory" ? (
              <PortfolioInventoryPanel
                nfts={filteredNfts}
                loading={loading}
                configured={configured}
                search={nftSearch}
                onSearchChange={setNftSearch}
                sort={nftSort}
                onSortChange={setNftSort}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onList={() => openListModal([])}
              />
            ) : tab === "received-offers" ? (
              <TradePortfolioReceivedOffersShell />
            ) : tab === "placed-offers" ? (
              <PortfolioPlacedOffersPanel
                loading={placedBidsLoading}
                configured={placedBidsConfigured}
                bids={placedBids}
                writeEnabled={writeEnabled}
                cancelPending={cancelBidPending}
                cancellingId={cancellingBidId}
                onCancel={(bidStateAddress) => void handleCancelPlacedBid(bidStateAddress)}
              />
            ) : tab === "orders-bids" ? (
              <TradePortfolioOrdersShell />
            ) : PORTFOLIO_TAB_EMPTY[tab] ? (
              <PortfolioTabEmpty tab={tab} />
            ) : (
              <PortfolioTabSoon label={tabLabel} />
            )}

            {tab === "inventory" && canSignPortfolio ? (
              <TradePortfolioStickyBar
                listCount={listCount}
                delistCount={delistCount}
                pending={delistPending}
                onList={handleStickyList}
                onDelist={() => void handleStickyDelist()}
              />
            ) : null}
          </div>
        </div>
      )}

      <ListForSaleModal
        open={listOpen}
        onClose={() => {
          setListOpen(false);
          setListMints([]);
        }}
        mint={listMints.length === 1 ? listMints[0] : undefined}
        mints={listMints.length > 1 ? listMints : undefined}
        itemLabel={
          listMints.length > 1
            ? `List ${listMints.length} selected slabs`
            : listMints.length === 1
              ? "List selected slab"
              : undefined
        }
        onComplete={handleListComplete}
      />
      <DelistModal
        open={delistOpen}
        onClose={() => {
          setDelistOpen(false);
          setDelistMints([]);
        }}
        mints={delistMints}
        onComplete={handleDelistComplete}
      />
    </div>
  );
}

const PORTFOLIO_TAB_LABELS: Partial<Record<PortfolioTabId, string>> = {
  "received-offers": "Received offers",
  "placed-offers": "Placed offers",
  activity: "Activity",
  "orders-bids": "Orders & bids",
  "fav-nfts": "Fav NFTs",
};
