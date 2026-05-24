"use client";

import {
  formatPortfolioSol,
  formatPortfolioWalletAddress,
  type PortfolioCollectionRow,
  type PortfolioGrailsFilter,
  type PortfolioMarketplaceFilter,
  type PortfolioSort,
  type PortfolioStatusFilter,
} from "@/lib/trade/portfolio";
import { cn } from "@/lib/utils";

type Props = {
  walletAddress: string;
  solBalance: number | null;
  statusFilter: PortfolioStatusFilter;
  onStatusFilterChange: (value: PortfolioStatusFilter) => void;
  marketplaceFilter: PortfolioMarketplaceFilter;
  onMarketplaceFilterChange: (value: PortfolioMarketplaceFilter) => void;
  grailsFilter: PortfolioGrailsFilter;
  onGrailsFilterChange: (value: PortfolioGrailsFilter) => void;
  collectionSearch: string;
  onCollectionSearchChange: (value: string) => void;
  collectionSort: PortfolioSort;
  onCollectionSortChange: (value: PortfolioSort) => void;
  selectedCollectionId: string | null;
  onSelectedCollectionChange: (value: string | null) => void;
  collections: PortfolioCollectionRow[];
  totalNftCount: number;
  className?: string;
};

function FilterRadios<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-[10px] font-bold uppercase tracking-wide text-[var(--trade-muted)]">
        {label}
      </legend>
      <div className="flex flex-wrap gap-1">
        {options.map((option) => {
          const active = value === option.id;
          return (
            <label
              key={option.id}
              className={cn(
                "cursor-pointer rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                active
                  ? "bg-[var(--trade-panel)] text-[var(--tensor-white)]"
                  : "text-[var(--trade-muted)] hover:text-[var(--tensor-white)]",
              )}
            >
              <input
                type="radio"
                name={label}
                value={option.id}
                checked={active}
                onChange={() => onChange(option.id)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Tensor portfolio left rail â€” wallet, filters, collections. */
export function TradePortfolioSidebar({
  walletAddress,
  solBalance,
  statusFilter,
  onStatusFilterChange,
  marketplaceFilter,
  onMarketplaceFilterChange,
  grailsFilter,
  onGrailsFilterChange,
  collectionSearch,
  onCollectionSearchChange,
  collectionSort,
  onCollectionSortChange,
  selectedCollectionId,
  onSelectedCollectionChange,
  collections,
  totalNftCount,
  className,
}: Props) {

  const filteredCollections = collections.filter((row) =>
    row.name.toLowerCase().includes(collectionSearch.trim().toLowerCase()),
  );

  return (
    <aside
      className={cn(
        "flex w-full shrink-0 flex-col border-r border-[#333] bg-[var(--trade-surface)] lg:w-60",
        className,
      )}
    >
      <div className="space-y-1 border-b border-[#333] px-3 py-3">
        <p
          className="truncate font-mono text-[11px] tabular-nums text-[var(--tensor-white)]"
          title={walletAddress}
        >
          {formatPortfolioWalletAddress(walletAddress)}
        </p>
        <p className="font-mono text-[11px] tabular-nums text-[var(--trade-muted)]">
          {solBalance != null ? `${formatPortfolioSol(solBalance / 1_000_000_000, 4)} ◎` : "— ◎"}
        </p>
      </div>

      <div className="space-y-4 overflow-y-auto px-3 py-3">
        <FilterRadios
          label="Status"
          value={statusFilter}
          onChange={onStatusFilterChange}
          options={[
            { id: "all", label: "ALL" },
            { id: "listed", label: "LISTED" },
            { id: "owned", label: "OWNED" },
          ]}
        />

        <FilterRadios
          label="Marketplace"
          value={marketplaceFilter}
          onChange={onMarketplaceFilterChange}
          options={[
            { id: "all", label: "ALL" },
            { id: "tensor", label: "TENSOR" },
            { id: "other", label: "OTHER" },
          ]}
        />

        <FilterRadios
          label="GRAILS"
          value={grailsFilter}
          onChange={onGrailsFilterChange}
          options={[
            { id: "all", label: "ALL" },
            { id: "on-chain", label: "ON-CHAIN" },
            { id: "partner", label: "PARTNER" },
          ]}
        />

        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--trade-muted)]">
            Collections
          </p>
          <div className="flex flex-wrap gap-2 text-[9px] uppercase text-[var(--trade-muted)]">
            <span>Frozen</span>
            <span>Unverified</span>
            <label className="inline-flex items-center gap-1 text-[var(--tensor-accent)]">
              <input type="checkbox" disabled className="rounded border-[#333]" />
              Compressed
            </label>
          </div>
          <input
            type="search"
            value={collectionSearch}
            onChange={(event) => onCollectionSearchChange(event.target.value)}
            placeholder="Filter collections"
            className="h-7 w-full rounded border border-[#333] bg-[var(--trade-panel)] px-2 text-[11px] text-[var(--tensor-white)] placeholder:text-[var(--trade-muted)]"
          />
          <select
            value={collectionSort}
            onChange={(event) =>
              onCollectionSortChange(event.target.value as PortfolioSort)
            }
            className="h-7 w-full rounded border border-[#333] bg-[var(--trade-panel)] px-2 text-[10px] uppercase text-[var(--tensor-white)]"
            aria-label="Sort collections"
          >
            <option value="bids-desc">Bids (high to low)</option>
            <option value="price-desc">Price (high to low)</option>
            <option value="price-asc">Price (low to high)</option>
          </select>

          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => onSelectedCollectionChange(null)}
              className={cn(
                "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[11px]",
                selectedCollectionId == null
                  ? "bg-[var(--trade-panel)] text-[var(--tensor-white)]"
                  : "text-[var(--trade-muted)] hover:text-[var(--tensor-white)]",
              )}
            >
              <span>All Collections</span>
              <span className="font-mono text-[10px] tabular-nums">
                {totalNftCount}
              </span>
            </button>

            {filteredCollections.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => onSelectedCollectionChange(row.id)}
                className={cn(
                  "flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left",
                  selectedCollectionId === row.id
                    ? "bg-[var(--trade-panel)]"
                    : "hover:bg-[var(--trade-panel)]/60",
                )}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded bg-[var(--trade-panel)] text-[8px] text-[var(--trade-muted)]">
                  {row.imageUri ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.imageUri} alt="" className="h-full w-full object-cover" />
                  ) : (
                    "◎"
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate text-[10px] leading-tight text-[var(--tensor-white)]"
                    title={row.name}
                  >
                    {row.name}
                  </span>
                  <span className="font-mono text-[9px] tabular-nums text-[var(--trade-muted)]">
                    {row.floorSol != null ? `${formatPortfolioSol(row.floorSol, 2)} ◎` : "— ◎"} ·{" "}
                    {formatPortfolioSol(row.valueSol, 2)} · {row.listedCount}/{row.ownedCount}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
