import { SkeletonCard } from "@/components/skeleton-card";
import { SLAB_GRID_CLASS } from "@/lib/layout";

export default function VaultLoading() {
  return (
    <div className="page-shell">
      <div className="page-header space-y-4">
        <div className="space-y-2">
          <div className="h-10 w-36 animate-pulse rounded-md bg-vault-panel/70" />
          <div className="h-5 w-full max-w-xl animate-pulse rounded-md bg-vault-panel/50" />
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="h-10 w-32 animate-pulse rounded-lg bg-vault-panel/60" />
          <div className="h-10 w-36 animate-pulse rounded-lg bg-vault-panel/60" />
        </div>
      </div>

      <div
        className={SLAB_GRID_CLASS}
        aria-label="Loading vault inventory"
        aria-busy="true"
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    </div>
  );
}
