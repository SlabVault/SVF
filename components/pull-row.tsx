import Link from "next/link";
import type { PullItem } from "@/types/content";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SlabImage } from "@/components/slab-image";
import { formatUsd } from "@/lib/format";
import { normalizeSlabImageSrc } from "@/lib/slab-image-url";

type Props = {
  pull: PullItem;
};

export function PullRow({ pull }: Props) {
  const cost = pull.costUsd != null ? formatUsd(pull.costUsd) : "—";
  const out = pull.outcomeUsd != null ? formatUsd(pull.outcomeUsd) : "—";
  const imageSrc = pull.imageUrl ? normalizeSlabImageSrc(pull.imageUrl) : null;

  return (
    <Card
      variant="row"
      className="grid gap-4 p-4 transition-[border-color,box-shadow] hover:border-vault-violet/25 hover:shadow-[0_0_24px_-14px_rgba(139,92,246,0.4)] md:grid-cols-[5rem_140px_1fr_auto] md:items-center md:p-5"
    >
      {imageSrc ? (
        <div className="hidden overflow-hidden rounded-lg border border-line md:block">
          <SlabImage
            src={imageSrc}
            alt=""
            className="aspect-[3/4] h-20 w-full"
          />
        </div>
      ) : null}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Date
        </p>
        <p className="mt-1 font-mono text-sm text-foreground">{pull.date}</p>
      </div>
      <div className="flex gap-3">
        {imageSrc ? (
          <div className="shrink-0 overflow-hidden rounded-lg border border-line md:hidden">
            <SlabImage
              src={imageSrc}
              alt=""
              className="aspect-[3/4] h-16 w-12"
            />
          </div>
        ) : null}
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {pull.source}
          </p>
          <p className="text-sm text-foreground">{pull.summary}</p>
          <p className="text-xs text-muted">
            Cost: <span className="font-mono text-foreground/90">{cost}</span> ·
            Outcome:{" "}
            <span className="font-mono font-semibold text-vault-amber">{out}</span>
          </p>
        </div>
      </div>
      <div className="md:text-right">
        {pull.clipUrl ? (
          <Button asChild variant="link" className="h-auto min-h-0 p-0">
            <Link href={pull.clipUrl} target="_blank" rel="noreferrer">
              Clip
            </Link>
          </Button>
        ) : (
          <span className="text-xs text-muted">No clip linked</span>
        )}
      </div>
    </Card>
  );
}
