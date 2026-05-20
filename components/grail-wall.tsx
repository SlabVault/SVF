import Link from "next/link";
import { SlabImage } from "@/components/slab-image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatUsd } from "@/lib/format";
import type { GrailItem } from "@/lib/vault-stats";

type Props = {
  items: GrailItem[];
};

export function GrailWall({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-6" aria-labelledby="grail-wall-heading">
      <div>
        <h2
          id="grail-wall-heading"
          className="font-heading text-2xl font-bold tracking-tight sm:text-3xl"
        >
          Grail wall
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted">
          Top outcomes from pulls and slabs by estimated value.
        </p>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <Card
            key={item.id}
            className="min-w-[min(100%,14rem)] shrink-0 snap-start flex-col gap-3 overflow-hidden p-0 sm:min-w-[13rem]"
          >
            <div className="relative aspect-[3/4] bg-vault-panel">
              {item.imageUrl ? (
                <SlabImage
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-4 text-center text-xs text-muted">
                  {item.kind === "pull" ? "Pull highlight" : "No image"}
                </div>
              )}
              <Badge
                variant="grade"
                className="absolute right-2 top-2 max-w-[90%] truncate"
              >
                {item.grade}
              </Badge>
            </div>
            <div className="space-y-2 px-4 pb-4">
              <p className="line-clamp-2 text-sm font-semibold text-foreground">
                {item.name}
              </p>
              <p className="font-mono text-lg font-semibold text-vault-amber">
                {formatUsd(item.valueUsd)}
              </p>
              {item.clipUrl ? (
                <Link
                  href={item.clipUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-vault-amber underline-offset-4 hover:underline"
                >
                  {item.kind === "pull" ? "Watch clip" : "View listing"}
                </Link>
              ) : (
                <span className="text-xs text-muted">No link</span>
              )}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
