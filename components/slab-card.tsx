import Link from "next/link";

import type { SlabItem } from "@/types/content";
import { SlabImage } from "@/components/slab-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlatformBadge } from "@/components/platform-badge";
import { formatUsd } from "@/lib/format";
import { TRADE_PLATFORM_CTA } from "@/lib/platform-labels";
import { SLAB_CARD_BODY_CLASS, SLAB_CARD_SHELL_CLASS } from "@/lib/layout";
import { normalizeSlabImageSrc } from "@/lib/slab-image-url";

type Props = {
  slab: SlabItem;
  /** When true, primary CTA links to the trade desk. */
  showTradeCta?: boolean;
};

export function SlabCard({ slab, showTradeCta = false }: Props) {
  const imageSrc = normalizeSlabImageSrc(slab.imageUrl);
  const fmv =
    slab.estimatedValueUsd != null
      ? formatUsd(slab.estimatedValueUsd)
      : null;

  return (
    <Card className={SLAB_CARD_SHELL_CLASS}>
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-vault-violet/20 to-vault-deep">
        {imageSrc ? (
          <SlabImage
            src={imageSrc}
            alt={`${slab.name} slab (${slab.grade})`}
            className="h-full w-full transition-transform duration-300 motion-safe:group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-vault-deep/50">
            <p className="text-sm text-muted">No image available</p>
          </div>
        )}
        <div className="pointer-events-none absolute left-3 top-3">
          <Badge variant="grade">{slab.grade}</Badge>
        </div>
        <div className="pointer-events-none absolute bottom-3 left-3">
          <PlatformBadge kind="slabvault_vault" />
        </div>
      </div>
      <div className={SLAB_CARD_BODY_CLASS}>
        <div className="space-y-1">
          <h3 className="font-heading text-lg font-semibold leading-tight text-foreground transition-colors duration-300 group-hover:text-vault-amber">
            {slab.name}
          </h3>
        </div>
        <div className="mt-auto flex flex-col gap-2 border-t border-line pt-3">
          {fmv ? (
            <p className="text-sm">
              <span className="text-muted">FMV </span>
              <span className="font-mono text-base font-semibold text-vault-amber">
                {fmv}
              </span>
            </p>
          ) : null}
          <p className="text-xs text-muted">Acquired: {slab.acquiredAt}</p>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {showTradeCta ? (
            <Button className="w-full" asChild>
              <Link
                href="/trade"
                data-growth-event="cta_trade_from_slab_card"
                data-growth-context={`home_slab:${slab.id}`}
              >
                {TRADE_PLATFORM_CTA}
              </Link>
            </Button>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {slab.vaultedUrl ? (
              <Button asChild variant="secondary" size="sm" className="flex-1">
                <a href={slab.vaultedUrl} target="_blank" rel="noreferrer">
                  Vaulted
                </a>
              </Button>
            ) : null}
            {slab.collectrUrl ? (
              <Button asChild variant="outline" size="sm" className="flex-1">
                <a href={slab.collectrUrl} target="_blank" rel="noreferrer">
                  Collectr
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
