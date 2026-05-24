import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlatformBadge } from "@/components/platform-badge";
import { SlabImage } from "@/components/slab-image";
import { formatDate, formatUsd } from "@/lib/format";
import { MARKETPLACE_BUY_CTA } from "@/lib/platform-labels";
import {
  SLAB_CARD_BODY_CLASS,
  SLAB_CARD_SHELL_CLASS,
} from "@/lib/layout";
import type { MarketplaceSlab } from "@/lib/marketplace-slabs";
import { VAULT_ROUTES } from "@/lib/vault-routes";

type Props = {
  slab: MarketplaceSlab;
  statusFilter: "AVAILABLE" | "SOLD";
  priority?: boolean;
};

export function MarketplaceListingCard({
  slab,
  statusFilter,
  priority = false,
}: Props) {
  return (
    <Card className={SLAB_CARD_SHELL_CLASS}>
      <Link
        href={VAULT_ROUTES.shopListing(slab.id)}
        className="relative block aspect-[4/3] overflow-hidden bg-gradient-to-br from-vault-violet/20 to-vault-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        data-growth-event="cta_open_listing_image"
        data-growth-context={`marketplace_listing:${slab.id}`}
      >
        <SlabImage
          src={slab.imageUrl}
          alt={`${slab.name} ${slab.grade}`}
          className="h-full w-full transition-transform duration-300 motion-safe:group-hover:scale-[1.02]"
          priority={priority}
        />
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
          <Badge variant="grade">{slab.grade}</Badge>
        </div>
        <div className="pointer-events-none absolute bottom-3 left-3">
          <PlatformBadge kind="slabvault" />
        </div>
      </Link>

      <div className={SLAB_CARD_BODY_CLASS}>
        <div className="space-y-1">
          <h3 className="font-heading text-lg font-semibold leading-tight text-foreground transition-colors duration-300 group-hover:text-vault-amber">
            <Link
              href={VAULT_ROUTES.shopListing(slab.id)}
              data-growth-event="cta_open_listing_title"
              data-growth-context={`marketplace_listing:${slab.id}`}
            >
              {slab.name}
            </Link>
          </h3>
          <p className="text-xs text-muted">
            {formatDate(slab.acquiredAt, "Date pending", "en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        <dl className="mt-auto space-y-2 border-t border-line pt-3 text-sm">
          {slab.estimatedValueUsd != null ? (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">FMV</dt>
              <dd className="font-mono text-base font-semibold text-vault-amber">
                {formatUsd(slab.estimatedValueUsd)}
              </dd>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">SOL Price</dt>
            <dd className="font-mono font-semibold text-foreground">
              {slab.solPrice} SOL
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">SVF Price</dt>
            <dd className="font-mono font-semibold text-foreground">
              {slab.svfPrice} SVF
            </dd>
          </div>
        </dl>

        <div className="mt-3">
          {statusFilter === "AVAILABLE" ? (
            <Button className="w-full" asChild>
              <Link
                href={VAULT_ROUTES.shopListing(slab.id)}
                data-growth-event="cta_purchase_from_grid"
                data-growth-context={`marketplace_listing:${slab.id}`}
              >
                {MARKETPLACE_BUY_CTA}
              </Link>
            </Button>
          ) : (
            <Badge variant="secondary" className="w-full justify-center py-2">
              Sold
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
