import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SlabImage } from "@/components/slab-image";
import { formatUsd } from "@/lib/format";
import { normalizeSlabImageSrc } from "@/lib/slab-image-url";
import type { PullItem } from "@/types/content";

type Props = {
  pulls: PullItem[];
  /** Tighter layout for vault overview and secondary pages. */
  compact?: boolean;
  trackingContext?: string;
};

export function RecentPullsCarousel({
  pulls,
  compact = false,
  trackingContext = "home_recent_pulls",
}: Props) {
  if (pulls.length === 0) return null;

  return (
    <section
      className={compact ? "space-y-3" : "space-y-4 sm:space-y-6"}
      aria-labelledby="recent-pulls-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2
          id="recent-pulls-heading"
          className={
            compact
              ? "font-heading text-xl font-bold tracking-tight sm:text-2xl"
              : "font-heading text-2xl font-bold tracking-tight sm:text-3xl"
          }
        >
          Recent pulls
        </h2>
        <Link
          href="/pulls"
          className="text-sm font-semibold text-vault-amber underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          data-growth-event="cta_view_all_pulls"
          data-growth-context={trackingContext}
        >
          View all →
        </Link>
      </div>

      <div
        className="-mx-4 flex gap-3 overflow-x-auto overscroll-x-contain scroll-px-4 px-4 pb-2 snap-x snap-mandatory scroll-smooth sm:-mx-5 sm:gap-4 sm:scroll-px-5 sm:px-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="list"
        aria-label="Recent pull cards"
      >
        {pulls.map((pull) => {
          const fmv =
            pull.outcomeUsd != null ? formatUsd(pull.outcomeUsd) : null;
          const imageSrc = pull.imageUrl
            ? normalizeSlabImageSrc(pull.imageUrl)
            : null;

          return (
            <Card
              key={pull.id}
              role="listitem"
              className={
                compact
                  ? "flex w-[12rem] shrink-0 snap-start flex-col gap-2 overflow-hidden p-2.5 transition-[border-color,box-shadow] hover:border-vault-violet/30 sm:w-[13rem] sm:p-3"
                  : "flex w-[14rem] shrink-0 snap-start flex-col gap-2.5 overflow-hidden p-3 transition-[border-color,box-shadow] hover:border-vault-violet/30 hover:shadow-[0_0_28px_-14px_rgba(139,92,246,0.4)] sm:w-[16rem] sm:gap-3 sm:p-4 lg:w-[18rem]"
              }
            >
              {imageSrc ? (
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-line bg-vault-deep/40">
                  <SlabImage
                    src={imageSrc}
                    alt={`${pull.source} pull preview`}
                    className="h-full w-full"
                  />
                </div>
              ) : null}
              <div className="flex items-start justify-between gap-2">
                <p className="text-[0.65rem] font-medium uppercase tracking-wide text-muted sm:text-xs">
                  {pull.source}
                </p>
                <p className="shrink-0 font-mono text-[0.65rem] text-muted sm:text-xs">{pull.date}</p>
              </div>
              <p className="line-clamp-2 font-heading text-sm font-semibold leading-snug text-foreground sm:text-base">
                {pull.summary}
              </p>
              {fmv ? (
                <p className="text-xs sm:text-sm">
                  <span className="text-muted">FMV </span>
                  <span className="font-mono font-semibold text-vault-amber">{fmv}</span>
                </p>
              ) : null}
              {pull.clipUrl ? (
                <Button asChild variant="link" size="sm" className="h-auto min-h-0 justify-start p-0 text-xs sm:text-sm">
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
