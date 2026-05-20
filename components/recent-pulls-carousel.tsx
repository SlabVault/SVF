import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SlabImage } from "@/components/slab-image";
import { formatUsd } from "@/lib/format";
import { normalizeSlabImageSrc } from "@/lib/slab-image-url";
import type { PullItem } from "@/types/content";

type Props = {
  pulls: PullItem[];
};

export function RecentPullsCarousel({ pulls }: Props) {
  if (pulls.length === 0) return null;

  return (
    <section className="space-y-6" aria-labelledby="recent-pulls-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="recent-pulls-heading" className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          Recent pulls
        </h2>
        <Link
          href="/pulls"
          className="text-sm font-semibold text-vault-amber underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          View all →
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {pulls.map((pull) => {
          const fmv =
            pull.outcomeUsd != null ? formatUsd(pull.outcomeUsd) : null;
          const imageSrc = pull.imageUrl
            ? normalizeSlabImageSrc(pull.imageUrl)
            : null;

          return (
            <Card
              key={pull.id}
              className="min-w-[min(100%,18rem)] shrink-0 snap-start space-y-3 p-5 transition-[border-color,box-shadow] hover:border-vault-violet/30 hover:shadow-[0_0_28px_-14px_rgba(139,92,246,0.4)] sm:min-w-[16rem]"
            >
              {imageSrc ? (
                <div className="overflow-hidden rounded-lg border border-line">
                  <SlabImage
                    src={imageSrc}
                    alt=""
                    className="aspect-[4/3] w-full"
                  />
                </div>
              ) : null}
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  {pull.source}
                </p>
                <p className="shrink-0 font-mono text-xs text-muted">{pull.date}</p>
              </div>
              <p className="font-heading text-base font-semibold leading-snug text-foreground">
                {pull.summary}
              </p>
              {fmv ? (
                <p className="text-sm">
                  <span className="text-muted">FMV </span>
                  <span className="font-mono font-semibold text-vault-amber">{fmv}</span>
                </p>
              ) : null}
              {pull.clipUrl ? (
                <Button asChild variant="link" size="sm" className="h-auto min-h-0 justify-start p-0">
                  <a href={pull.clipUrl} target="_blank" rel="noreferrer">
                    Watch clip
                  </a>
                </Button>
              ) : null}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
