"use client";

import type { SlabItem } from "@/types/content";
import { SlabImage } from "@/components/slab-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatUsd } from "@/lib/format";
import { normalizeSlabImageSrc } from "@/lib/slab-image-url";

type Props = {
  slab: SlabItem;
};

export function SlabCard({ slab }: Props) {
  const imageSrc = normalizeSlabImageSrc(slab.imageUrl);
  const fmv =
    slab.estimatedValueUsd != null
      ? formatUsd(slab.estimatedValueUsd)
      : null;

  return (
    <Card className="group flex flex-col overflow-hidden p-0 transition-[border-color,box-shadow] hover:border-vault-violet/30 hover:shadow-[0_0_28px_-12px_rgba(139,92,246,0.45)]">
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
      </div>
      <div className="flex flex-1 flex-col gap-2 bg-gradient-to-b from-vault-panel/30 to-vault-deep/30 p-4 sm:p-5">
        <div className="space-y-1">
          <h3 className="font-heading text-lg font-semibold leading-tight text-foreground transition-colors duration-300 group-hover:text-vault-amber">
            {slab.name}
          </h3>
        </div>
        <div className="mt-auto flex flex-col gap-2">
          {fmv ? (
            <p className="text-base">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">FMV </span>
              <span className="font-mono text-lg font-semibold text-vault-amber">{fmv}</span>
            </p>
          ) : null}
          <p className="text-xs text-muted">Acquired: {slab.acquiredAt}</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
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
    </Card>
  );
}
