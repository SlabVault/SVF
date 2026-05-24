"use client";

import {
  SLABVAULT_TRADE_COLLECTIONS,
  type TradeCollectionConfig,
  type TradePartnerId,
} from "@/lib/onchain/collections";
import { countListingsByVenue } from "@/lib/trade/listing-venue-utils";
import type { TradeListing } from "@/lib/trade-listings";
import { VENUE_LABELS } from "@/components/trade/venue-badge";
import { cn } from "@/lib/utils";

const PARTNER_DESCRIPTIONS: Record<TradePartnerId, string> = {
  collector_crypt:
    "PSA-graded Pokémon slabs vaulted on Collector Crypt — partner ingest with TensorSwap depth when indexed.",
  phygitals:
    "Phygitals graded inventory — compressed NFT tree via partner ingest and Tensor TComp reads.",
  magic_eden:
    "Graded-card liquidity on Magic Eden — preview lane; Tensor index when ingest is empty.",
  slabvault_treasury:
    "Community vault slabs listed for on-site SOL checkout and future Tensor depth.",
  beezie:
    "Beezie graded inventory on Base — preview lane; deep link until multichain fill ships.",
  courtyard:
    "Courtyard graded inventory on Polygon — preview lane; cert compare across chains.",
};

const LINK_STUBS = [
  { id: "website", label: "Website" },
  { id: "discord", label: "Discord" },
  { id: "twitter", label: "X / Twitter" },
] as const;

const AGGREGATE_VENUE_PARTNERS: TradePartnerId[] = [
  "collector_crypt",
  "phygitals",
  "slabvault_treasury",
  "magic_eden",
  "beezie",
  "courtyard",
];

type Props = {
  collection: Pick<
    TradeCollectionConfig,
    "slug" | "name" | "partner" | "notes" | "status"
  >;
  aggregateDesk?: boolean;
  listings?: TradeListing[];
  className?: string;
};

function AggregateCollectionInfoPanel({
  listings,
  className,
}: {
  listings: TradeListing[];
  className?: string;
}) {
  const listedByVenue = countListingsByVenue(listings);
  const countByPartner = new Map(listedByVenue.map((row) => [row.partner, row.count]));
  const catalogRows = SLABVAULT_TRADE_COLLECTIONS.filter((row) =>
    AGGREGATE_VENUE_PARTNERS.includes(row.partner),
  );

  return (
    <div
      className={cn(
        "space-y-4 rounded border border-[#333] bg-[var(--trade-surface)] p-4 sm:p-6",
        className,
      )}
      role="region"
      aria-label="Aggregate desk info"
    >
      <section>
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--tensor-accent)]">
          All listings desk
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-[var(--tensor-white)]">
          Merged CC, Phygitals, SlabVault treasury, and preview venues on one desk — not a
          single marketplace. Live partner rows come from postgres ingest; preview lanes may
          show Tensor read depth or stay empty until ingest ships.
        </p>
      </section>

      <section className="border-t border-[#333] pt-4">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--tensor-accent)]">
          Venues on this desk
        </h2>
        <p className="mt-1 text-[10px] text-[var(--trade-muted)]">
          Listed counts reflect indexed rows on this page only — not supply, volume, or
          off-desk inventory.
        </p>
        <ul className="mt-3 divide-y divide-[#333] rounded border border-[#333]">
          {catalogRows.map((row) => {
            const listedCount = countByPartner.get(row.partner) ?? 0;
            return (
              <li
                key={row.slug}
                className="flex flex-wrap items-start justify-between gap-3 px-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--tensor-white)]">
                      {row.name}
                    </span>
                    <span className="rounded border border-[#555] px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide text-[var(--trade-muted)]">
                      {VENUE_LABELS[row.partner]}
                    </span>
                    <span className="text-[9px] uppercase tracking-wide text-[var(--trade-muted)]">
                      {row.status === "live" ? "Live ingest" : "Preview"}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-[var(--trade-muted)]">
                    {PARTNER_DESCRIPTIONS[row.partner]}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-xs text-[var(--tensor-white)]">
                  {listedCount} listed
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="border-t border-[#333] pt-4">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--tensor-accent)]">
          Merge &amp; dedupe
        </h2>
        <p className="mt-2 text-[10px] leading-relaxed text-[var(--trade-muted)]">
          When the same cert or mint appears on multiple venues, GRAILS keeps the lowest ask
          and drops duplicate rows. Venue badges on each tile show the winning source;
          settlement still routes per collection.
        </p>
      </section>
    </div>
  );
}

/** Collection INFO tab — honest description + links stub until Tensor metadata sync. */
export function CollectionInfoPanel({
  collection,
  aggregateDesk = false,
  listings = [],
  className,
}: Props) {
  if (aggregateDesk) {
    return <AggregateCollectionInfoPanel listings={listings} className={className} />;
  }

  const description =
    PARTNER_DESCRIPTIONS[collection.partner] ?? collection.notes;

  return (
    <div
      className={cn(
        "space-y-4 rounded border border-[#333] bg-[var(--trade-surface)] p-4 sm:p-6",
        className,
      )}
      role="region"
      aria-label="Collection info"
    >
      <section>
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--tensor-accent)]">
          About {collection.name}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-[var(--tensor-white)]">
          {description}
        </p>
        {collection.notes && collection.notes !== description ? (
          <p className="mt-2 text-[10px] leading-relaxed text-[var(--trade-muted)]">
            Ops note: {collection.notes}
          </p>
        ) : null}
        <p className="mt-3 text-[10px] text-[var(--trade-muted)]">
          Slug{" "}
          <span className="font-mono text-[var(--tensor-white)]">
            {collection.slug}
          </span>
          {" · "}
          {collection.status === "live" ? "Live" : "Preview"} collection on GRAILS
        </p>
      </section>

      <section className="border-t border-[#333] pt-4">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--tensor-accent)]">
          Links
        </h2>
        <p className="mt-1 text-[10px] text-[var(--trade-muted)]">
          Official social and website links are not indexed yet. No placeholder URLs
          are shown.
        </p>
        <ul className="mt-3 space-y-2" aria-label="Collection links">
          {LINK_STUBS.map((link) => (
            <li
              key={link.id}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded border border-[#333] bg-[var(--trade-panel)] px-3 py-2"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--tensor-white)]">
                {link.label}
              </span>
              <span className="text-[10px] text-[var(--trade-muted)]">
                Not indexed
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
