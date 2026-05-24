"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { DISCOVER_PLATFORM_FILTERS } from "@/lib/external-listings-sources";
import { cn } from "@/lib/utils";

type Props = {
  currentPlatform: string;
};

export function DiscoverPlatformFilter({ currentPlatform }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(value: string): string {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("platform");
    } else {
      params.set("platform", value);
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return (
    <div
      className="w-full sm:w-auto"
      role="group"
      aria-label="Filter by platform"
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted sm:sr-only">
        Platform
      </p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
      {DISCOVER_PLATFORM_FILTERS.map((filter) => {
        const active = currentPlatform === filter.value;
        return (
          <Link
            key={filter.value}
            href={hrefFor(filter.value)}
            aria-current={active ? "true" : undefined}
            className={cn(
              "shrink-0 min-h-11 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active
                ? "border-vault-amber/40 bg-vault-amber/10 text-vault-amber"
                : "border-line bg-vault-panel/50 text-muted hover:border-vault-violet/30 hover:text-foreground",
            )}
            data-growth-event="cta_discover_platform_filter"
            data-growth-context={`discover_platform:${filter.value}`}
          >
            {filter.label}
          </Link>
        );
      })}
      </div>
    </div>
  );
}
