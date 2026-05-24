import { SkeletonCard } from "@/components/skeleton-card";
import { SLAB_GRID_CLASS } from "@/lib/layout";

export default function MarketplaceLoading() {
  return (
    <div className="page-shell">
      <div className="page-header space-y-4">
        <div className="space-y-2">
          <div className="h-10 w-44 animate-pulse rounded-md bg-vault-panel/70" />
          <div className="h-5 w-full max-w-xl animate-pulse rounded-md bg-vault-panel/50" />
        </div>
        <div className="h-10 w-44 animate-pulse rounded-lg bg-vault-panel/60" />
      </div>

      <div
        className={SLAB_GRID_CLASS}
        aria-label="Loading vault shop listings"
        aria-busy="true"
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    </div>
  );
}
