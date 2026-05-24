"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { TradeActivityFeed } from "@/components/trade-activity-feed";
import {
  buildSyntheticTradeActivityFeed,
  type TradeActivityFeedResult,
} from "@/lib/trade/trade-activity";
import {
  resolveTradeListingMint,
  resolveTradeListingPartner,
  type TradeActivityEvent,
  type TradeListing,
} from "@/lib/trade-listings";
import type { TradePartnerId } from "@/lib/onchain/collections";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 60_000;

type Props = {
  collectionSlug: string;
  initialEvents: TradeActivityEvent[];
  initialSource: TradeActivityFeedResult["source"];
  fallbackListings: TradeListing[];
  /** When true, derive preview events from listings if no live feed exists. */
  syntheticActivity?: boolean;
  compact?: boolean;
  limit?: number;
};

export function TradeActivityPanel({
  collectionSlug,
  initialEvents,
  initialSource,
  fallbackListings,
  syntheticActivity = false,
  compact = false,
  limit = 16,
}: Props) {
  const listingImages = useMemo(() => {
    const map: Record<string, string> = {};

    for (const listing of fallbackListings) {
      const imageUrl = listing.imageUrl?.trim();
      if (!imageUrl) continue;

      map[listing.id] = imageUrl;

      const mint = resolveTradeListingMint(listing);
      if (mint) map[mint] = imageUrl;
    }

    return map;
  }, [fallbackListings]);

  const listingPartners = useMemo(() => {
    const map: Record<string, TradePartnerId> = {};

    for (const listing of fallbackListings) {
      const partner = resolveTradeListingPartner(listing);
      if (!partner) continue;

      map[listing.id] = partner;

      const mint = resolveTradeListingMint(listing);
      if (mint) map[mint] = partner;
    }

    return map;
  }, [fallbackListings]);

  const listingExplicitPartners = useMemo(() => {
    const map: Record<string, true> = {};

    for (const listing of fallbackListings) {
      if (!listing.partner) continue;

      map[listing.id] = true;

      const mint = resolveTradeListingMint(listing);
      if (mint) map[mint] = true;
    }

    return map;
  }, [fallbackListings]);

  const resolvedInitialEvents = useMemo(() => {
    if (initialEvents.length > 0 || initialSource === "tensor_api") {
      return initialEvents;
    }
    if (syntheticActivity) {
      return buildSyntheticTradeActivityFeed(fallbackListings, limit);
    }
    return [];
  }, [fallbackListings, initialEvents, initialSource, limit, syntheticActivity]);

  const [polledFeed, setPolledFeed] = useState<TradeActivityFeedResult | null>(
    null,
  );

  const propsKey = `${collectionSlug}:${initialSource}:${resolvedInitialEvents.length}:${syntheticActivity}`;

  useEffect(() => {
    setPolledFeed(null);
  }, [propsKey]);

  const events = polledFeed?.events ?? resolvedInitialEvents;
  const rawSource = polledFeed?.source ?? initialSource;
  const source =
    rawSource === "tensor_api"
      ? "tensor_api"
      : syntheticActivity && events.length > 0
        ? "synthetic"
        : rawSource;

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/trade/activity?collection=${encodeURIComponent(collectionSlug)}&limit=${limit}`,
        { cache: "no-store" },
      );
      if (!response.ok) return;

      const payload = (await response.json()) as TradeActivityFeedResult;
      if (
        payload.events.length > 0 ||
        payload.source === "tensor_api" ||
        payload.source === "ingest"
      ) {
        setPolledFeed(payload);
        return;
      }

      if (syntheticActivity) {
        setPolledFeed({
          events: buildSyntheticTradeActivityFeed(fallbackListings, limit),
          source: "synthetic",
          fetchedAt: payload.fetchedAt ?? new Date().toISOString(),
          cursor: payload.cursor ?? null,
        });
      }
    } catch {
      if (syntheticActivity) {
        setPolledFeed({
          events: buildSyntheticTradeActivityFeed(fallbackListings, limit),
          source: "synthetic",
          fetchedAt: new Date().toISOString(),
          cursor: null,
        });
      }
    }
  }, [collectionSlug, fallbackListings, limit, syntheticActivity]);

  useEffect(() => {
    if (source !== "tensor_api") return;

    const timer = window.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [refresh, source]);

  return (
    <div
      className={cn(
        "trade-activity-panel flex h-full w-full min-w-0 flex-col",
        compact && "shrink-0 xl:w-[17.5rem]",
      )}
    >
      <TradeActivityFeed
        events={events}
        compact={compact}
        source={source}
        collectionSlug={collectionSlug}
        listingImages={listingImages}
        listingPartners={listingPartners}
        listingExplicitPartners={listingExplicitPartners}
      />
    </div>
  );
}
