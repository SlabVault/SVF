export default function PullsLoading() {
  return (
    <div className="page-shell">
      <div className="page-header space-y-6">
        <div className="space-y-3">
          <div className="h-10 w-44 animate-pulse rounded-md bg-vault-panel/70" />
          <div className="h-5 w-full max-w-xl animate-pulse rounded-md bg-vault-panel/50" />
          <div className="h-5 w-full max-w-md animate-pulse rounded-md bg-vault-panel/40" />
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="h-10 w-28 animate-pulse rounded-lg bg-vault-panel/60" />
          <div className="h-10 w-32 animate-pulse rounded-lg bg-vault-panel/60" />
        </div>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-xl border border-line bg-vault-panel/50"
          />
        ))}
      </div>

      <div
        className="space-y-3"
        aria-label="Loading pull history"
        aria-busy="true"
      >
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-xl border border-line bg-vault-panel/45 md:h-24"
          />
        ))}
      </div>
    </div>
  );
}
