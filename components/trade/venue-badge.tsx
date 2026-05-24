import {
  getTradeCollectionBySlug,
  type TradePartnerId,
} from "@/lib/onchain/collections";
import type { TradeListing } from "@/lib/trade-listings";
import { cn } from "@/lib/utils";

export const VENUE_LABELS: Record<TradePartnerId, string> = {
  collector_crypt: "CC",
  phygitals: "Phygitals",
  magic_eden: "ME",
  slabvault_treasury: "Treasury",
  beezie: "Beezie",
  courtyard: "Courtyard",
};

type Props = {
  partner: TradePartnerId;
  /** Optional label override — aggregate desk uses "ALL". */
  label?: string;
  className?: string;
};

/** Partner for listing tiles — listing field wins, else collection registry. */
export function resolveListingVenuePartner(
  listing: Pick<TradeListing, "partner">,
  collectionSlug: string,
): TradePartnerId {
  if (listing.partner) return listing.partner;
  return getTradeCollectionBySlug(collectionSlug)?.partner ?? "slabvault_treasury";
}

/** Venue tag on listing tiles — compact template badge. */
export function VenueBadge({ partner, label, className }: Props) {
  return (
    <span
      className={cn(
        "trade-venue-badge rounded border border-[#555] bg-[var(--tensor-black)]/90 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide text-[var(--tensor-white)]",
        className,
      )}
    >
      {label ?? VENUE_LABELS[partner] ?? partner}
    </span>
  );
}
