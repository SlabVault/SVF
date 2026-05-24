"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

import { TradeActivityFeed } from "@/components/trade-activity-feed";
import { BuyNowModal } from "@/components/trade/buy-now-modal";
import { ItemOffersPanel } from "@/components/trade/item-offers-panel";
import { ListForSaleModal } from "@/components/trade/list-for-sale-modal";
import { PlaceOfferModal } from "@/components/trade/place-offer-modal";
import { PlatformBadge } from "@/components/platform-badge";
import { TradeDeskShell } from "@/components/trade/trade-desk-shell";
import { TradeMobileActionBar } from "@/components/trade/trade-mobile-action-bar";
import {
  mapTradeListingToTensorNft,
  resolveOnChainBuyBlockReason,
  tradeListingHasOnChainBuyMetadata,
} from "@/components/trade/tensor/map-listing";
import { resolvesOnChainSettlement, useTensorBuy } from "@/components/trade/tensor/use-tensor-buy";
import {
  resolveTradeListingPartnerCheckoutUrl,
  tradeListingShowsPartnerBuyLink,
  tradeListingUsesPartnerSiteSettlement,
} from "@/lib/trade/trade-modal";
import { VENUE_LABELS, VenueBadge, resolveListingVenuePartner } from "@/components/trade/venue-badge";
import { SlabImage } from "@/components/slab-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatUsd } from "@/lib/format";
import type { TradeCollectionConfig } from "@/lib/onchain/collections";
import type { TradeActivityFeedResult } from "@/lib/trade/trade-activity";
import type { TradeLandingCollectionPreview } from "@/lib/trade-landing";
import {
  resolveTradeListingMint,
  type TradeCollectionStats,
  type TradeListing,
} from "@/lib/trade-listings";
import { TRADE_ROUTES } from "@/lib/trade-routes";
import { buildItemFooterStatCells } from "@/lib/trade/item-footer-stats";
import {
  DEFAULT_TRADE_ROYALTY_PCT,
  formatListedAskUsd,
} from "@/lib/trade/trade-modal";
import type { TradeItemAdjacentLinks } from "@/lib/trade/item-navigation";
import { tradeListingItemKey } from "@/lib/trade/item-navigation";
import type { TensorRibbonMetrics } from "@/lib/trade/tensor-ribbon-metrics";
import type { VenueCompareRow } from "@/lib/trade/venue-compare";
import { resolvePartnerDeepLink, slugToPartnerPlatform } from "@/lib/trade/partner-deep-link";
import type { TradePartnerId } from "@/lib/onchain/collections";
import { cn } from "@/lib/utils";
import type { ExternalListingSource } from "@/types/external-listing";

type Props = {
  listing: TradeListing;
  collection: TradeCollectionConfig;
  collections: TradeLandingCollectionPreview[];
  collectionStats: TradeCollectionStats;
  activity: TradeActivityFeedResult;
  adjacentItems?: TradeItemAdjacentLinks;
  tensorRibbon?: TensorRibbonMetrics | null;
  solPriceUsd?: number | null;
  venueCompareRows?: VenueCompareRow[];
};

type ItemTab = "overview" | "activity" | "offers" | "compare";

const PARTNER_BADGE: Record<
  TradeCollectionConfig["partner"],
  ExternalListingSource | "slabvault"
> = {
  collector_crypt: "collector_crypt",
  phygitals: "phygitals",
  magic_eden: "magic_eden",
  slabvault_treasury: "slabvault",
  beezie: "manual",
  courtyard: "manual",
};

const ITEM_TABS: { id: ItemTab; label: string; soon?: boolean }[] = [
  { id: "overview", label: "OVERVIEW" },
  { id: "compare", label: "COMPARE" },
  { id: "activity", label: "ACTIVITY" },
  { id: "offers", label: "OFFERS", soon: true },
];

function venueCompareSummary(rows: VenueCompareRow[]): string {
  return rows
    .map((row) => `${VENUE_LABELS[row.partner] ?? row.partner} ◎${row.askSol}`)
    .join(" · ");
}

function resolveVenuePartnerCheckoutUrl(
  listing: TradeListing,
  row: VenueCompareRow,
): string | null {
  const platform = slugToPartnerPlatform(row.collectionId);
  if (platform) {
    return resolvePartnerDeepLink(
      {
        ...listing,
        askSol: row.askSol,
        collectionId: row.collectionId,
        partner: row.partner,
      },
      platform,
    );
  }
  return listing.vaultedUrl?.trim() ?? null;
}

function ItemVenueCompareStrip({
  listing,
  rows,
  currentCollectionSlug,
  compact = false,
}: {
  listing: TradeListing;
  rows: VenueCompareRow[];
  currentCollectionSlug: string;
  compact?: boolean;
}) {
  if (rows.length < 2) return null;

  const itemKey = tradeListingItemKey(listing);
  const cheapestPartner = rows[0]?.partner;

  return (
    <Card
      className={cn(
        "space-y-3 border-[#333] bg-[var(--trade-surface)]",
        compact ? "p-3" : "p-4",
      )}
      role="region"
      aria-label="Compare venues by cert"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[10px] font-bold uppercase tracking-wide text-[var(--trade-muted)]">
          Compare venues
        </h2>
        <p className="font-mono text-[10px] tabular-nums text-[var(--tensor-white)]/90">
          {venueCompareSummary(rows)}
        </p>
      </div>

      <ul className="space-y-2">
        {rows.map((row) => {
          const isCurrent = row.collectionId === currentCollectionSlug;
          const isCheapest = row.partner === cheapestPartner;
          const grailsHref = `${TRADE_ROUTES.slab(itemKey)}?collection=${encodeURIComponent(row.collectionId)}`;
          const partnerUrl = resolveVenuePartnerCheckoutUrl(listing, row);

          return (
            <li
              key={row.partner}
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 rounded border border-[#333] bg-[var(--trade-panel)] px-3 py-2",
                isCheapest && "border-[var(--tensor-accent)]/40",
              )}
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <VenueBadge partner={row.partner} />
                <span className="font-mono text-sm font-bold tabular-nums text-[var(--tensor-white)]">
                  {row.askSol} ◎
                </span>
                {isCheapest ? (
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-emerald-400">
                    Best ask
                  </span>
                ) : null}
                {isCurrent ? (
                  <span className="text-[9px] font-normal normal-case text-[var(--trade-muted)]">
                    · viewing
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {!isCurrent ? (
                  <Link
                    href={grailsHref}
                    className="rounded border border-[#333] bg-[var(--trade-surface)] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[var(--tensor-white)] hover:border-[var(--tensor-accent)]"
                  >
                    Buy on GRAILS
                  </Link>
                ) : null}
                {partnerUrl ? (
                  <a
                    href={partnerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border border-[#333] bg-[var(--trade-surface)] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[var(--trade-muted)] hover:border-[var(--tensor-accent)] hover:text-[var(--tensor-white)]"
                    data-growth-event="cta_trade_partner_deep_link"
                    data-growth-context={`trade_compare_partner:${listing.id}:${row.partner}`}
                  >
                    {VENUE_LABELS[row.partner as TradePartnerId] ?? row.partner} site ↗
                  </a>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function ItemCompareEmpty() {
  return (
    <Card
      className="space-y-2 border-[#333] bg-[var(--trade-surface)] p-4"
      role="status"
      aria-label="Compare venues — item compare live at 2+ asks; cert-unified index in M5 Soon"
    >
      <h2 className="text-[10px] font-bold uppercase tracking-wide text-[var(--trade-muted)]">
        Compare venues
      </h2>
      <p className="text-[11px] leading-snug text-[var(--trade-muted)]">
        No alternate venue asks for this cert yet. Item compare is live when 2+ asks exist
        (CC · Phygitals · treasury) with GRAILS and partner checkout links.
      </p>
      <p className="text-[11px] leading-snug text-[var(--trade-muted)]">
        Cert-unified compare index and mint search ships in{" "}
        <span className="font-semibold text-[var(--tensor-white)]">M5</span>
        <span className="ml-1 text-[9px] font-normal normal-case">(Soon)</span>.
      </p>
    </Card>
  );
}

function traitRows(listing: TradeListing): { label: string; value: string }[] {
  const onChainMint = resolveTradeListingMint(listing);
  const rows: { label: string; value: string }[] = [
    { label: "Grade", value: listing.grade },
    onChainMint
      ? { label: "Mint", value: onChainMint }
      : { label: "Cert", value: listing.id },
  ];
  if (listing.estimatedValueUsd != null) {
    rows.push({ label: "Est. FMV", value: formatUsd(listing.estimatedValueUsd) });
  }
  if (listing.sellerWallet) {
    rows.push({ label: "Seller", value: listing.sellerWallet });
  }
  if (listing.listState) {
    rows.push({ label: "List state", value: listing.listState });
  }
  return rows;
}

function ItemFooterStats({
  stats,
  collectionName,
  tensorRibbon,
}: {
  stats: TradeCollectionStats;
  collectionName: string;
  tensorRibbon?: TensorRibbonMetrics | null;
}) {
  const cells = buildItemFooterStatCells(stats, collectionName, tensorRibbon);

  return (
    <div
      className="trade-item-stats-ribbon mt-6 flex overflow-x-auto rounded border border-[#333] bg-[var(--trade-surface)]"
      role="group"
      aria-label="Collection footer statistics"
    >
      {cells.map((cell) => {
        const deltaClass =
          cell.deltaPct != null
            ? cell.deltaPct >= 0
              ? "text-emerald-400"
              : "text-red-400"
            : null;

        return (
          <div
            key={cell.label}
            className={cn(
              "trade-stat-cell shrink-0 border-r border-[#333] px-3 py-2 last:border-r-0",
              cell.label === "Collection"
                ? "min-w-[8rem]"
                : "min-w-[5.5rem] flex-1",
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--trade-muted)]">
              {cell.label}
            </p>
            <p
              className={cn(
                "trade-stat-value mt-0.5 truncate font-mono text-sm font-bold tabular-nums text-[var(--tensor-white)]/90",
                deltaClass,
              )}
            >
              {cell.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function ItemSaleHistoryStub() {
  return (
    <Card
      className="space-y-3 border-[#333] bg-[var(--trade-surface)] p-4"
      role="region"
      aria-label="Sale history"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-bold uppercase tracking-wide text-[var(--trade-muted)]">
          Sale history
        </h2>
        <span
          className="rounded border border-[#333] bg-[var(--trade-panel)] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tabular-nums text-[var(--trade-muted)]"
          aria-hidden
        >
          30D
        </span>
      </div>
      <div
        className="flex h-28 items-center justify-center rounded border border-dashed border-[#333] bg-[var(--trade-panel)]"
        role="status"
      >
        <p className="max-w-[14rem] text-center text-xs text-[var(--trade-muted)]">
          Sale history chart — coming soon. Per-item fills will appear here when
          Tensor Pro chart data is wired; no synthetic price history is shown.
        </p>
      </div>
      <input
        type="range"
        min={0}
        max={30}
        defaultValue={30}
        disabled
        aria-label="Sale history range (30 days) — coming soon"
        className="h-1 w-full cursor-not-allowed opacity-40"
      />
    </Card>
  );
}

function ItemNavArrows({
  adjacentItems,
}: {
  adjacentItems: TradeItemAdjacentLinks;
}) {
  const { prevHref, nextHref, index, total } = adjacentItems;
  if (total <= 1) return null;

  const position =
    index >= 0 ? `${index + 1} / ${total}` : null;

  return (
    <div
      className="mb-3 flex items-center justify-between gap-2"
      aria-label="Adjacent listings in collection"
    >
      {prevHref ? (
        <Link
          href={prevHref}
          className="inline-flex items-center gap-1 rounded border border-[#333] bg-[var(--trade-panel)] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--tensor-white)] hover:border-[var(--tensor-accent)]"
          aria-label="Previous listing in collection"
        >
          ← Prev
        </Link>
      ) : (
        <span
          className="inline-flex cursor-not-allowed items-center gap-1 rounded border border-[#333] bg-[var(--trade-panel)] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--trade-muted)] opacity-40"
          aria-hidden
        >
          ← Prev
        </span>
      )}

      {position ? (
        <span className="font-mono text-[10px] tabular-nums text-[var(--trade-muted)]">
          {position}
        </span>
      ) : null}

      {nextHref ? (
        <Link
          href={nextHref}
          className="inline-flex items-center gap-1 rounded border border-[#333] bg-[var(--trade-panel)] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--tensor-white)] hover:border-[var(--tensor-accent)]"
          aria-label="Next listing in collection"
        >
          Next →
        </Link>
      ) : (
        <span
          className="inline-flex cursor-not-allowed items-center gap-1 rounded border border-[#333] bg-[var(--trade-panel)] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--trade-muted)] opacity-40"
          aria-hidden
        >
          Next →
        </span>
      )}
    </div>
  );
}

export function TradeItemDetailClient({
  listing,
  collection,
  collections,
  collectionStats,
  activity,
  adjacentItems,
  tensorRibbon,
  solPriceUsd,
  venueCompareRows = [],
}: Props) {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [buyOpen, setBuyOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ItemTab>("overview");
  const { buy, pending, canBuyOnChain } = useTensorBuy();

  const partnerBadge = PARTNER_BADGE[collection.partner];
  const venuePartner = resolveListingVenuePartner(listing, collection.slug);
  const traits = traitRows(listing);
  const listedUsd = formatListedAskUsd(listing.askSol, solPriceUsd);
  const nft = useMemo(
    () => mapTradeListingToTensorNft(listing, collection.slug),
    [listing, collection.slug],
  );
  const onChainMint = resolveTradeListingMint(listing) ?? listing.id;

  const onChainSettlement = resolvesOnChainSettlement(listing, collection.slug);
  const onChainBlockReason = resolveOnChainBuyBlockReason(listing, onChainSettlement);
  const showPartnerBuyLink = tradeListingShowsPartnerBuyLink(listing, collection.slug);
  const partnerCheckoutUrl = showPartnerBuyLink
    ? resolveTradeListingPartnerCheckoutUrl(listing, collection.slug)
    : null;
  const showOnChainBuyCta =
    onChainSettlement && tradeListingHasOnChainBuyMetadata(listing);
  const partnerPrimaryCheckout =
    Boolean(partnerCheckoutUrl) &&
    (tradeListingUsesPartnerSiteSettlement(listing, collection.slug) ||
      !tradeListingHasOnChainBuyMetadata(listing));
  const blockedOnChainBuy =
    Boolean(onChainBlockReason) && listing.askSol > 0 && !partnerPrimaryCheckout;

  const itemActivity = useMemo(() => {
    const certMatch = listing.id;
    return activity.events.filter(
      (event) =>
        event.slabId === listing.id ||
        event.slabId === certMatch ||
        event.slabName === listing.name,
    );
  }, [activity.events, listing.id, listing.name]);

  const activityEvents =
    itemActivity.length > 0 ? itemActivity : activity.events.slice(0, 12);

  const openBuy = async () => {
    if (!connected) {
      setVisible(true);
      return;
    }
    if (canBuyOnChain(nft, listing, collection.slug)) {
      try {
        await buy(nft, collection.slug);
        return;
      } catch {
        setBuyOpen(true);
        return;
      }
    }
    setBuyOpen(true);
  };

  const openOffer = () => {
    if (!connected) {
      setVisible(true);
      return;
    }
    setOfferOpen(true);
  };

  const openList = () => {
    if (!connected) {
      setVisible(true);
      return;
    }
    setListOpen(true);
  };

  return (
    <TradeDeskShell collections={collections} activeSlug={collection.slug} activeCollection={{
      name: collection.name,
      partner: collection.partner,
      verified: collection.status === "live",
    }}>
      <div className="mx-auto max-w-5xl pb-28 md:pb-8">
        <Link
          href={TRADE_ROUTES.collection(collection.slug)}
          className="mb-4 inline-flex text-xs font-medium text-[var(--trade-muted)] hover:text-[var(--tensor-accent)]"
        >
          ← Back to {collection.name}
        </Link>

        {adjacentItems ? <ItemNavArrows adjacentItems={adjacentItems} /> : null}

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <Card className="overflow-hidden border-[#333] bg-[var(--trade-surface)] p-0">
            <div className="relative aspect-square bg-[var(--trade-panel)]">
              <SlabImage
                src={listing.imageUrl}
                alt={listing.name}
                className="h-full w-full object-cover"
                priority
              />
            </div>
          </Card>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="grade">{listing.grade}</Badge>
                <VenueBadge partner={venuePartner} className="scale-95" />
                {partnerBadge === "slabvault" ? (
                  <PlatformBadge kind="slabvault" />
                ) : (
                  <PlatformBadge kind="external" externalSource={partnerBadge} />
                )}
              </div>
              <h1 className="text-lg font-semibold text-[var(--tensor-white)] sm:text-xl">
                {listing.name}
              </h1>
            </div>

            <Card className="space-y-2 border-[#333] bg-[var(--trade-surface)] p-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--trade-muted)]">
                  Listed for
                </p>
                <p className="mt-0.5 font-mono text-2xl font-bold leading-tight tabular-nums text-[var(--tensor-white)]">
                  {listing.askSol} ◎
                  {listedUsd != null ? (
                    <span className="ml-1.5 text-sm font-normal text-[var(--trade-muted)]">
                      ({formatUsd(listedUsd)})
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-[10px] text-[var(--trade-muted)]">
                  Royalty {DEFAULT_TRADE_ROYALTY_PCT}%
                </p>
              </div>

              <div className="hidden flex-col gap-1.5 md:flex">
                {showOnChainBuyCta ? (
                  <Button
                    type="button"
                    className="tensor-btn-primary h-9 w-full text-xs font-bold uppercase tracking-wide"
                    disabled={pending}
                    onClick={() => void openBuy()}
                    data-growth-event="cta_trade_buy_now"
                    data-growth-context={`trade_item:${listing.id}`}
                  >
                    {pending
                      ? "Signing…"
                      : connected
                        ? "BUY NOW"
                        : "Connect wallet to buy"}
                  </Button>
                ) : partnerPrimaryCheckout && partnerCheckoutUrl ? (
                  <Button
                    type="button"
                    className="tensor-btn-primary h-9 w-full text-xs font-bold uppercase tracking-wide"
                    asChild
                  >
                    <a
                      href={partnerCheckoutUrl}
                      target="_blank"
                      rel="noreferrer"
                      data-growth-event="cta_trade_partner_deep_link"
                      data-growth-context={`trade_buy_partner:${listing.id}`}
                    >
                      Open on partner ↗
                    </a>
                  </Button>
                ) : blockedOnChainBuy ? (
                  <Button
                    type="button"
                    className="tensor-btn-primary h-9 w-full text-xs font-bold uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-60"
                    disabled
                    title={onChainBlockReason ?? undefined}
                  >
                    BUY NOW
                  </Button>
                ) : null}
                {partnerCheckoutUrl && showOnChainBuyCta ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className={cn(
                      "h-9 w-full border border-[#333] bg-[var(--trade-panel)] text-xs font-bold uppercase tracking-wide text-[var(--tensor-white)] hover:bg-[var(--trade-surface)]",
                    )}
                    asChild
                  >
                    <a
                      href={partnerCheckoutUrl}
                      target="_blank"
                      rel="noreferrer"
                      data-growth-event="cta_trade_partner_deep_link"
                      data-growth-context={`trade_buy_partner:${listing.id}`}
                    >
                      Open on partner ↗
                    </a>
                  </Button>
                ) : null}
                <Button
                  type="button"
                  className="h-9 w-full border-0 bg-[#FDD38C] text-xs font-bold uppercase tracking-wide text-[#2A2F34] hover:brightness-105"
                  onClick={openOffer}
                  data-growth-event="cta_trade_make_offer"
                  data-growth-context={`trade_item:${listing.id}`}
                >
                  {connected ? "PLACE OFFER" : "Connect wallet to offer"}
                </Button>
              </div>
            </Card>

            <ItemVenueCompareStrip
              listing={listing}
              rows={venueCompareRows}
              currentCollectionSlug={collection.slug}
              compact
            />
          </div>
        </div>

        <nav
          className="mb-3 mt-6 flex gap-1 border-b border-[#333]"
          aria-label="Item views"
        >
          {ITEM_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "border-b-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                activeTab === tab.id
                  ? "border-[var(--tensor-accent)] text-[var(--tensor-white)]"
                  : "border-transparent text-[var(--trade-muted)] hover:text-[var(--tensor-white)]",
              )}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              {tab.label}
              {tab.soon ? (
                <span className="ml-1.5 text-[9px] font-normal normal-case text-[var(--trade-muted)]">
                  Soon
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        {activeTab === "overview" ? (
          <Card className="space-y-3 border-[#333] bg-[var(--trade-surface)] p-4">
            <h2 className="text-[10px] font-bold uppercase tracking-wide text-[var(--trade-muted)]">
              Traits
            </h2>
            <dl className="grid gap-2 sm:grid-cols-2">
              {traits.map((trait) => (
                <div
                  key={trait.label}
                  className="rounded-md border border-[#333] bg-[var(--trade-panel)] px-3 py-2"
                >
                  <dt className="text-[10px] uppercase text-[var(--trade-muted)]">
                    {trait.label}
                  </dt>
                  <dd className="truncate font-mono text-xs text-[var(--tensor-white)]">
                    {trait.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        ) : null}

        {activeTab === "compare" ? (
          venueCompareRows.length >= 2 ? (
            <ItemVenueCompareStrip
              listing={listing}
              rows={venueCompareRows}
              currentCollectionSlug={collection.slug}
            />
          ) : (
            <ItemCompareEmpty />
          )
        ) : null}

        {activeTab === "activity" ? (
          <div className="rounded border border-[#333] bg-[var(--trade-surface)]">
            <TradeActivityFeed
              events={activityEvents}
              source={activity.source}
              compact
              collectionSlug={collection.slug}
            />
          </div>
        ) : null}

        {activeTab === "offers" ? (
          <ItemOffersPanel listingId={listing.id} />
        ) : null}

        <ItemFooterStats
          stats={collectionStats}
          collectionName={collection.name}
          tensorRibbon={tensorRibbon}
        />
      </div>

      <TradeMobileActionBar
        priceSol={listing.askSol}
        connected={connected}
        onConnect={() => setVisible(true)}
        onBuy={() => void openBuy()}
        onList={openList}
        suggestedListPriceSol={collectionStats.floorSol ?? listing.askSol}
        listingId={listing.id}
        partnerCheckoutUrl={partnerCheckoutUrl}
        partnerPrimaryCheckout={partnerPrimaryCheckout}
        showOnChainBuyCta={showOnChainBuyCta}
      />

      <BuyNowModal
        open={buyOpen}
        onClose={() => setBuyOpen(false)}
        listing={listing}
        collectionSlug={collection.slug}
        solPriceUsd={solPriceUsd}
      />
      <PlaceOfferModal
        open={offerOpen}
        onClose={() => setOfferOpen(false)}
        listing={listing}
        collectionSlug={collection.slug}
      />
      <ListForSaleModal
        open={listOpen}
        onClose={() => setListOpen(false)}
        itemLabel={listing.name}
        mint={onChainMint}
        suggestedPriceSol={collectionStats.floorSol ?? listing.askSol}
      />
    </TradeDeskShell>
  );
}
