import Link from "next/link";

import { PlatformBadge } from "@/components/platform-badge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { TradeLandingCollectionPreview } from "@/lib/trade-landing";
import { cn } from "@/lib/utils";

import type { ExternalListingSource } from "@/types/external-listing";

const PARTNER_BADGE: Record<
  TradeLandingCollectionPreview["partner"],
  ExternalListingSource | "slabvault"
> = {
  collector_crypt: "collector_crypt",
  phygitals: "phygitals",
  magic_eden: "magic_eden",
  slabvault_treasury: "slabvault",
  beezie: "manual",
  courtyard: "manual",
};

const STATUS_LABELS: Record<TradeLandingCollectionPreview["status"], string> = {
  preview: "Preview",
  index_pending: "Index ready",
  live: "Live depth",
};

type Props = {
  collection: TradeLandingCollectionPreview;
  className?: string;
};

export function TradeCollectionPreviewCard({ collection, className }: Props) {
  const statusLabel = STATUS_LABELS[collection.status];
  const partnerBadge = PARTNER_BADGE[collection.partner];
  const badgeKind =
    partnerBadge === "slabvault" ? "slabvault" : ("external" as const);
  const externalSource =
    partnerBadge === "slabvault" ? undefined : partnerBadge;

  return (
    <Card
      className={cn(
        "group flex h-full flex-col overflow-hidden border-line bg-vault-deep/70 p-0 transition-[border-color,box-shadow] hover:border-vault-violet/30",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2 border-b border-line/60 px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-sm font-semibold text-foreground">
            {collection.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {collection.description}
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0 text-[10px] uppercase">
          {statusLabel}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-2">
        <PlatformBadge kind={badgeKind} externalSource={externalSource} />
        <span className="font-mono text-[10px] uppercase text-muted-foreground">
          {collection.tokenStandard}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-3 border-t border-line/60 px-4 py-3 text-sm">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Floor
          </dt>
          <dd className="font-mono tabular-nums text-foreground">
            {collection.floorSol != null ? `${collection.floorSol} SOL` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Listed
          </dt>
          <dd className="font-mono tabular-nums text-foreground">
            {collection.listedCount != null ? collection.listedCount : "—"}
          </dd>
        </div>
      </dl>

      <Link
        href={collection.href}
        className="mt-auto border-t border-line/60 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-vault-violet transition-colors hover:bg-vault-deep"
        data-growth-event="trade_collection_preview_card"
        data-growth-context={`trade_preview:${collection.slug}`}
      >
        Open collection
      </Link>
    </Card>
  );
}