"use client";

import {
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import type { TradePartnerId } from "@/lib/onchain/collections";
import type { TradeListing, TradeTraitFilters } from "@/lib/trade-listings";
import {
  extractListingGrader,
  extractUniqueSetNames,
  resolveTradeListingPartner,
  TRADE_KNOWN_GRADERS,
} from "@/lib/trade-listings";
import { VENUE_LABELS } from "@/components/trade/venue-badge";
import { cn } from "@/lib/utils";

type Props = {
  listings: TradeListing[];
  availableGrades: string[];
  filters: TradeTraitFilters;
  onFiltersChange: Dispatch<SetStateAction<TradeTraitFilters>>;
  resultCount: number;
  compact?: boolean;
  /** Aggregate `/trade/all` desk — shows venue partner filter rail. */
  aggregateDesk?: boolean;
};

const GRADER_OPTIONS = TRADE_KNOWN_GRADERS;

function parseSolFilterInput(raw: string): number | null {
  if (!raw.trim()) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

const INPUT_CLASS =
  "w-full rounded border border-[#333] bg-[var(--trade-surface)] px-2 py-1.5 text-xs text-[var(--tensor-white)] placeholder:text-[var(--trade-muted)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--tensor-accent)]";

function FilterAccordionSection({
  title,
  count,
  defaultOpen = true,
  disabled = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[#333] last:border-b-0">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex w-full items-center justify-between gap-2 py-2 text-left",
          disabled ? "cursor-not-allowed opacity-60" : "hover:text-[var(--tensor-white)]",
        )}
      >
        <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--trade-muted)]">
          {title}
        </span>
        <span className="flex items-center gap-2">
          {count != null ? (
            <span className="font-mono text-[10px] text-[var(--trade-muted)]">{count}</span>
          ) : null}
          <span className="text-[10px] text-[var(--trade-muted)]" aria-hidden>
            {open ? "−" : "+"}
          </span>
        </span>
      </button>
      {open ? <div className="pb-2">{children}</div> : null}
    </div>
  );
}

/** Tensor Pro filter rail — collapsible accordion with trait counts. */
export function TradeTraitFilters({
  listings,
  availableGrades,
  filters,
  onFiltersChange,
  resultCount,
  compact = false,
  aggregateDesk = false,
}: Props) {
  const gradeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const listing of listings) {
      const grade = listing.grade.trim();
      if (!grade) continue;
      counts.set(grade, (counts.get(grade) ?? 0) + 1);
    }
    return counts;
  }, [listings]);

  const graderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const listing of listings) {
      const grader = extractListingGrader(listing.grade);
      if (grader) counts.set(grader, (counts.get(grader) ?? 0) + 1);
    }
    return counts;
  }, [listings]);

  const availableSetNames = useMemo(() => extractUniqueSetNames(listings), [listings]);

  const setNameCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const listing of listings) {
      const setName = listing.setName?.trim();
      if (!setName) continue;
      counts.set(setName, (counts.get(setName) ?? 0) + 1);
    }
    return counts;
  }, [listings]);

  const venueCounts = useMemo(() => {
    const counts = new Map<TradePartnerId, number>();
    for (const listing of listings) {
      const partner = resolveTradeListingPartner(listing);
      if (!partner) continue;
      counts.set(partner, (counts.get(partner) ?? 0) + 1);
    }
    return counts;
  }, [listings]);

  const availableVenues = useMemo(() => {
    return [...venueCounts.keys()].sort((a, b) =>
      VENUE_LABELS[a].localeCompare(VENUE_LABELS[b]),
    );
  }, [venueCounts]);

  const activeGraderFilters = filters.graders.length;
  const activeVenueFilters = filters.partners.length;
  const activePriceFilters =
    (filters.minAskSol != null ? 1 : 0) + (filters.maxAskSol != null ? 1 : 0);
  const activeSetFilter = filters.setQuery.trim() ? 1 : 0;

  const toggleGrade = (grade: string) => {
    onFiltersChange((current) => {
      const next = current.grades.includes(grade)
        ? current.grades.filter((value) => value !== grade)
        : [...current.grades, grade];
      return { ...current, grades: next };
    });
  };

  const toggleGrader = (grader: string) => {
    onFiltersChange((current) => {
      const next = current.graders.includes(grader)
        ? current.graders.filter((value) => value !== grader)
        : [...current.graders, grader];
      return { ...current, graders: next };
    });
  };

  const togglePartner = (partner: TradePartnerId) => {
    onFiltersChange((current) => {
      const next = current.partners.includes(partner)
        ? current.partners.filter((value) => value !== partner)
        : [...current.partners, partner];
      return { ...current, partners: next };
    });
  };

  const resetFilters = () => {
    onFiltersChange((current) => ({
      ...current,
      grades: [],
      graders: [],
      partners: [],
      minAskSol: null,
      maxAskSol: null,
      setQuery: "",
    }));
  };

  return (
    <aside
      className={cn(
        "flex flex-col gap-1 text-[11px]",
        compact ? "h-full p-2" : "rounded border border-[#333] bg-[var(--trade-surface)] p-3",
      )}
      aria-label="Trait filters"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[#333] pb-2">
        <h2 className="text-[10px] font-bold uppercase tracking-wide text-[var(--trade-muted)]">
          Filters
        </h2>
        <span className="font-mono text-[10px] text-[var(--trade-muted)]">
          {resultCount}
        </span>
      </div>

      <FilterAccordionSection title="Price" count={activePriceFilters || undefined}>
        <div className="grid grid-cols-2 gap-1.5">
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            aria-label="Minimum ask in SOL"
            placeholder="Min ◎"
            value={filters.minAskSol ?? ""}
            onChange={(event) =>
              onFiltersChange((current) => ({
                ...current,
                minAskSol: parseSolFilterInput(event.target.value),
              }))
            }
            className={INPUT_CLASS}
          />
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            aria-label="Maximum ask in SOL"
            placeholder="Max ◎"
            value={filters.maxAskSol ?? ""}
            onChange={(event) =>
              onFiltersChange((current) => ({
                ...current,
                maxAskSol: parseSolFilterInput(event.target.value),
              }))
            }
            className={INPUT_CLASS}
          />
        </div>
      </FilterAccordionSection>

      {aggregateDesk && availableVenues.length > 0 ? (
        <FilterAccordionSection
          title="Venue"
          count={activeVenueFilters || availableVenues.length || undefined}
          defaultOpen={false}
        >
          <ul className="space-y-1">
            {availableVenues.map((partner) => {
              const checked = filters.partners.includes(partner);
              return (
                <li key={partner}>
                  <label className="flex cursor-pointer items-center justify-between gap-2 text-xs text-[var(--tensor-white)]">
                    <span className="flex min-w-0 items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePartner(partner)}
                        className="h-3.5 w-3.5 shrink-0 rounded border-[#333] bg-[var(--trade-surface)] accent-[var(--tensor-accent)]"
                      />
                      <span className="truncate">{VENUE_LABELS[partner]}</span>
                    </span>
                    <span className="font-mono text-[10px] text-[var(--trade-muted)]">
                      {venueCounts.get(partner) ?? 0}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </FilterAccordionSection>
      ) : null}

      {availableGrades.length > 0 ? (
        <FilterAccordionSection title="Grade" count={availableGrades.length}>
          <ul className="max-h-40 space-y-1 overflow-y-auto [scrollbar-width:thin]">
            {availableGrades.map((grade) => {
              const checked = filters.grades.includes(grade);
              const count = gradeCounts.get(grade) ?? 0;
              return (
                <li key={grade}>
                  <label className="flex cursor-pointer items-center justify-between gap-2 text-xs text-[var(--tensor-white)]">
                    <span className="flex min-w-0 items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleGrade(grade)}
                        className="h-3.5 w-3.5 shrink-0 rounded border-[#333] bg-[var(--trade-surface)] accent-[var(--tensor-accent)]"
                      />
                      <span className="truncate">{grade}</span>
                    </span>
                    <span className="font-mono text-[10px] text-[var(--trade-muted)]">
                      {count}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </FilterAccordionSection>
      ) : null}

      <FilterAccordionSection title="Trait count" defaultOpen={false}>
        <p className="text-[10px] leading-snug text-[var(--trade-muted)]">
          Trait count filtering — Soon
        </p>
      </FilterAccordionSection>

      <FilterAccordionSection
        title="Grader"
        count={activeGraderFilters || graderCounts.size || undefined}
        defaultOpen={false}
      >
        <ul className="space-y-1">
          {GRADER_OPTIONS.map((grader) => {
            const checked = filters.graders.includes(grader);
            return (
              <li key={grader}>
                <label className="flex cursor-pointer items-center justify-between gap-2 text-xs text-[var(--tensor-white)]">
                  <span className="flex min-w-0 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleGrader(grader)}
                      className="h-3.5 w-3.5 shrink-0 rounded border-[#333] bg-[var(--trade-surface)] accent-[var(--tensor-accent)]"
                    />
                    <span className="truncate">{grader}</span>
                  </span>
                  <span className="font-mono text-[10px] text-[var(--trade-muted)]">
                    {graderCounts.get(grader) ?? 0}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </FilterAccordionSection>

      <FilterAccordionSection
        title="Set / traits"
        count={activeSetFilter || availableSetNames.length || undefined}
        defaultOpen={false}
      >
        <input
          type="search"
          aria-label="Filter by set name or title"
          placeholder="Set, parallel, language…"
          value={filters.setQuery}
          onChange={(event) =>
            onFiltersChange((current) => ({
              ...current,
              setQuery: event.target.value,
            }))
          }
          className={INPUT_CLASS}
        />
        {availableSetNames.length > 0 ? (
          <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto [scrollbar-width:thin]">
            {availableSetNames.map((setName) => {
              const selected =
                filters.setQuery.trim().toLowerCase() === setName.toLowerCase();
              return (
                <li key={setName}>
                  <button
                    type="button"
                    onClick={() =>
                      onFiltersChange((current) => ({
                        ...current,
                        setQuery: selected ? "" : setName,
                      }))
                    }
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded px-1 py-0.5 text-left text-xs transition-colors",
                      selected
                        ? "text-[var(--tensor-accent)]"
                        : "text-[var(--tensor-white)] hover:text-[var(--tensor-accent)]",
                    )}
                  >
                    <span className="truncate">{setName}</span>
                    <span className="font-mono text-[10px] text-[var(--trade-muted)]">
                      {setNameCounts.get(setName) ?? 0}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-[10px] leading-snug text-[var(--trade-muted)]">
            Set names appear when listings include set metadata.
          </p>
        )}
      </FilterAccordionSection>

      <button
        type="button"
        className="mt-auto w-full rounded border border-[#333] px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--trade-muted)] transition-colors hover:border-[var(--tensor-accent)] hover:text-[var(--tensor-white)]"
        onClick={resetFilters}
      >
        Reset
      </button>
    </aside>
  );
}
