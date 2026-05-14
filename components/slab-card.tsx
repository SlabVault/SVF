import Link from "next/link";
import type { SlabItem } from "@/types/content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatUsd } from "@/lib/format";

type Props = {
  slab: SlabItem;
};

export function SlabCard({ slab }: Props) {
  const value =
    slab.estimatedValueUsd != null ? formatUsd(slab.estimatedValueUsd) : "—";

  return (
    <Card className="group flex flex-col overflow-hidden p-0 transition-[border-color,box-shadow] hover:border-vault-violet/30 hover:shadow-[0_0_28px_-12px_rgba(139,92,246,0.45)]">
      <div className="relative aspect-[4/3] bg-gradient-to-br from-vault-violet/20 to-vault-deep">
        {slab.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- dynamic URLs from JSON
          <img
            src={slab.imageUrl}
            alt={`${slab.name} slab (${slab.grade})`}
            className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-muted">
            Add <span className="mx-1 font-mono text-xs">imageUrl</span> in{" "}
            <span className="mx-1 font-mono text-xs">data/slabs.json</span>
          </div>
        )}
        <div className="absolute left-3 top-3">
          <Badge variant="grade" className="px-3 py-1">
            {slab.grade}
          </Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div>
          <h3 className="font-display text-base font-semibold leading-snug">
            {slab.name}
          </h3>
          <p className="mt-1 text-xs text-muted">Acquired {slab.acquiredAt}</p>
        </div>
        <p className="text-sm text-muted">
          Est. value: <span className="font-mono text-foreground">{value}</span>
        </p>
        <div className="mt-auto flex flex-wrap gap-2">
          {slab.vaultedUrl ? (
            <Button asChild variant="link" size="sm" className="h-auto min-h-0 p-0 text-xs">
              <Link href={slab.vaultedUrl} target="_blank" rel="noreferrer">
                Vaulted
              </Link>
            </Button>
          ) : null}
          {slab.collectrUrl ? (
            <Button asChild variant="link" size="sm" className="h-auto min-h-0 p-0 text-xs">
              <Link href={slab.collectrUrl} target="_blank" rel="noreferrer">
                Collectr
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
