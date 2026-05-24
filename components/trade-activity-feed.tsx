"use client";

import Link from "next/link";

import { VenueBadge } from "@/components/trade/venue-badge";
import { formatDate } from "@/lib/format";
import { buildTradeItemHref } from "@/lib/trade/item-navigation";
import type { TradePartnerId } from "@/lib/onchain/collections";
import type { TradeActivityFeedSource } from "@/lib/trade/trade-activity";
import type { TradeActivityEvent, TradeListing } from "@/lib/trade-listings";
import { ALL_LISTINGS_SLUG } from "@/lib/trade-routes";
import { cn } from "@/lib/utils";

type Props = {
  events: TradeActivityEvent[];
  compact?: boolean;
  source?: TradeActivityFeedSource;
  collectionSlug?: string;
  /** slabId / mint → imageUrl from fallback listings */
  listingImages?: Record<string, string>;
  /** slabId / mint → partner venue from fallback listings */
  listingPartners?: Record<string, TradePartnerId>;
  /** slabId / mint keys with explicit listing.partner (not collection-inferred) */
  listingExplicitPartners?: Record<string, true>;
};

const TYPE_LABELS: Record<TradeActivityEvent["type"], string> = {
  list: "LIST",
  sale: "BUY",
  bid: "BID",
  cancel: "CANCEL",
};

const TYPE_LABEL_CLASS: Record<TradeActivityEvent["type"], string> = {
  list: "trade-activity-label--list",
  sale: "trade-activity-label--buy",
  bid: "trade-activity-label--bid",
  cancel: "trade-activity-label--cancel",
};

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Recently";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(iso, "Recently", "en-US", {
    month: "short",
    day: "numeric",
  });
}

function shouldShowActivityVenueBadge(
  collectionSlug: string | undefined,
  partner: TradePartnerId | undefined,
  hasExplicitPartner: boolean,
): boolean {
  if (!partner) return false;
  return collectionSlug === ALL_LISTINGS_SLUG || hasExplicitPartner;
}

function buildActivityItemHref(
  event: TradeActivityEvent,
  collectionSlug: string,
): string {
  const listing = {
    id: event.slabId,
    name: event.slabName,
  } as TradeListing;

  return buildTradeItemHref(listing, collectionSlug);
}

function ActivityRowThumb({
  imageUrl,
  compact = false,
}: {
  imageUrl?: string;
  compact?: boolean;
}) {
  const sizeClass = compact ? "size-6" : "size-7";

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={cn(
          "shrink-0 rounded border border-[#333] object-cover",
          sizeClass,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "shrink-0 rounded border border-[#333] bg-[var(--trade-panel)]",
        sizeClass,
      )}
      aria-hidden
    />
  );
}

function ActivityRowContent({
  event,
  compact = false,
  collectionSlug,
  listingImages,
  listingPartners,
  listingExplicitPartners,
}: {
  event: TradeActivityEvent;
  compact?: boolean;
  collectionSlug?: string;
  listingImages?: Record<string, string>;
  listingPartners?: Record<string, TradePartnerId>;
  listingExplicitPartners?: Record<string, true>;
}) {
  const imageUrl = event.slabId ? listingImages?.[event.slabId] : undefined;
  const partner = event.slabId ? listingPartners?.[event.slabId] : undefined;
  const hasExplicitPartner = event.slabId
    ? listingExplicitPartners?.[event.slabId] === true
    : false;
  const showVenueBadge = shouldShowActivityVenueBadge(
    collectionSlug,
    partner,
    hasExplicitPartner,
  );

  return (
    <div className={cn("flex items-center", compact ? "gap-1.5" : "gap-2")}>
      <ActivityRowThumb imageUrl={imageUrl} compact={compact} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "trade-activity-label shrink-0 text-[10px] font-bold uppercase tracking-wide",
              TYPE_LABEL_CLASS[event.type],
            )}
          >
            {TYPE_LABELS[event.type]}
          </span>
          {showVenueBadge && partner ? (
            <VenueBadge
              partner={partner}
              className="shrink-0 scale-[0.85] px-1 py-0"
            />
          ) : null}
          <span className="truncate text-[11px] font-medium text-[var(--tensor-white)]">
            {event.slabName}
          </span>
        </div>
      </div>
      {event.amountSol != null ? (
        <span className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-[var(--tensor-white)]">
          {event.amountSol} ◎
        </span>
      ) : null}
      <span className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--trade-muted)]">
        {formatRelativeTime(event.timestamp)}
      </span>
    </div>
  );
}

export function TradeActivityFeed({
  events,
  compact = false,
  source,
  collectionSlug,
  listingImages,
  listingPartners,
  listingExplicitPartners,
}: Props) {
  const sourceCopy =
    source === "tensor_api"
      ? "Live list and sale events from Tensor index."
      : source === "ingest"
        ? "Recent listings from partner ingest."
        : source === "synthetic"
          ? "Preview activity derived from seed listings — configure Tensor for live events."
          : events.length === 0
            ? "No live activity feed for this collection yet."
            : "Activity events for this collection.";

  return (
    <aside
      className={cn(
        "trade-activity-feed flex h-full min-h-0 w-full min-w-0 flex-col",
        compact
          ? "max-h-[32rem] xl:max-h-none"
          : "rounded border border-[#333] bg-[var(--trade-surface)]",
      )}
      aria-label="Recent activity"
    >
      <div className={cn("border-b border-[#333]", compact ? "px-2.5 py-1.5" : "px-4 py-3")}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[10px] font-bold uppercase tracking-wide text-[var(--trade-muted)]">
            Recent Activity
          </h2>
          {source === "synthetic" ? (
            <span
              className="shrink-0 rounded border border-[#333] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[var(--trade-muted)]"
              title={sourceCopy}
            >
              Preview
            </span>
          ) : null}
        </div>
        {!compact ? (
          <p className="mt-1 text-[11px] leading-snug text-[var(--trade-muted)]">{sourceCopy}</p>
        ) : source === "synthetic" ? (
          <p className="mt-1 text-[10px] leading-snug text-[var(--trade-muted)]">
            Preview from listings
          </p>
        ) : null}
      </div>

      {events.length === 0 ? (
        <p
          className={cn(
            "text-[var(--trade-muted)]",
            compact ? "px-2.5 py-3 text-xs" : "px-4 py-6 text-sm",
          )}
          role="status"
        >
          {source === "ingest"
            ? "No recent partner ingest events for this collection."
            : "No activity yet."}
        </p>
      ) : (
        <ol
          className={cn(
            "overflow-y-auto [scrollbar-width:thin]",
            compact ? "min-h-0 flex-1" : "max-h-[28rem]",
          )}
        >
          {events.map((event) => {
            const itemHref =
              event.slabId && collectionSlug
                ? buildActivityItemHref(event, collectionSlug)
                : null;

            return (
              <li
                key={event.id}
                className="trade-activity-row border-b border-[#333]/70 last:border-b-0"
              >
                {itemHref ? (
                  <Link
                    href={itemHref}
                    className={cn(
                      "block transition-colors hover:bg-[var(--trade-panel)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tensor-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--trade-surface)]",
                      compact ? "px-2 py-1" : "px-2.5 py-1.5",
                    )}
                  >
                    <ActivityRowContent
                      event={event}
                      compact={compact}
                      collectionSlug={collectionSlug}
                      listingImages={listingImages}
                      listingPartners={listingPartners}
                      listingExplicitPartners={listingExplicitPartners}
                    />
                  </Link>
                ) : (
                  <div className={compact ? "px-2 py-1" : "px-2.5 py-1.5"}>
                    <ActivityRowContent
                      event={event}
                      compact={compact}
                      collectionSlug={collectionSlug}
                      listingImages={listingImages}
                      listingPartners={listingPartners}
                      listingExplicitPartners={listingExplicitPartners}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
