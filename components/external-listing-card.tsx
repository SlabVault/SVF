import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlatformBadge } from "@/components/platform-badge";
import { SlabImage } from "@/components/slab-image";
import { formatUsd } from "@/lib/format";
import {
  formatIndexedAge,
  isExternalListingStale,
} from "@/lib/external-listings";
import { getExternalPlatformCta } from "@/lib/platform-labels";
import {
  SLAB_CARD_BODY_CLASS,
  SLAB_CARD_SHELL_CLASS,
} from "@/lib/layout";
import type { ExternalListingItem } from "@/types/external-listing";

type Props = {
  listing: ExternalListingItem;
  priority?: boolean;
};

function formatListingPrice(listing: ExternalListingItem): string {
  if (listing.currency === "SOL" && listing.priceSol != null) {
    return `${listing.priceSol} SOL`;
  }
  if (listing.priceUsd != null) return formatUsd(listing.priceUsd);
  return "Price on platform";
}

export function ExternalListingCard({ listing, priority = false }: Props) {
  const stale = isExternalListingStale(listing);
  const ctaLabel = getExternalPlatformCta(listing.source);

  return (
    <Card className={SLAB_CARD_SHELL_CLASS}>
      <a
        href={listing.deepLinkUrl}
        target="_blank"
        rel="noreferrer"
        className="relative block aspect-[4/3] overflow-hidden bg-gradient-to-br from-vault-violet/20 to-vault-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        data-growth-event="cta_discover_deep_link"
        data-growth-context={`discover_listing:${listing.id}`}
        aria-label={`${listing.title} — ${ctaLabel.replace(/\s*↗$/, "")}`}
      >
        <SlabImage
          src={listing.imageUrl}
          alt={`${listing.title} ${listing.grade}`}
          className="h-full w-full transition-transform duration-300 motion-safe:group-hover:scale-[1.02]"
          priority={priority}
        />
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
          <Badge variant="grade">{listing.grade}</Badge>
          {stale ? (
            <Badge variant="secondary" aria-label="Listing may be stale">
              Stale
            </Badge>
          ) : null}
        </div>
        <div className="pointer-events-none absolute bottom-3 left-3">
          <PlatformBadge kind="external" externalSource={listing.source} />
        </div>
      </a>

      <div className={SLAB_CARD_BODY_CLASS}>
        <div className="space-y-1">
          <h3 className="font-heading text-lg font-semibold leading-tight text-foreground transition-colors duration-300 group-hover:text-vault-amber">
            {listing.title}
          </h3>
          <p className="text-xs text-muted">
            Partner listing · indexed {formatIndexedAge(listing.indexedAt)}
          </p>
        </div>

        <dl className="mt-auto space-y-2 border-t border-line pt-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Ask</dt>
            <dd className="font-mono text-base font-semibold text-vault-amber">
              {formatListingPrice(listing)}
            </dd>
          </div>
          {listing.fmvUsd != null ? (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">FMV</dt>
              <dd className="font-mono font-semibold text-foreground">
                {formatUsd(listing.fmvUsd)}
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-3">
          <Button className="w-full" asChild>
            <a
              href={listing.deepLinkUrl}
              target="_blank"
              rel="noreferrer"
              data-growth-event="cta_discover_deep_link"
              data-growth-context={`discover_listing:${listing.id}`}
            >
              {ctaLabel}
            </a>
          </Button>
        </div>
      </div>
    </Card>
  );
}
