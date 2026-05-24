"use client";

import { useMemo } from "react";

import type { TradeListing } from "@/lib/trade-listings";
import { extractListingGrader } from "@/lib/trade-listings";
import { cn } from "@/lib/utils";

type Props = {
  listings: TradeListing[];
  className?: string;
};

type TraitRow = { label: string; count: number };

function aggregateGraderCounts(listings: TradeListing[]): TraitRow[] {
  const counts = new Map<string, number>();
  for (const listing of listings) {
    const grader = extractListingGrader(listing.grade);
    if (!grader) continue;
    counts.set(grader, (counts.get(grader) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function aggregateGradeCounts(listings: TradeListing[]): TraitRow[] {
  const counts = new Map<string, number>();
  for (const listing of listings) {
    const grade = listing.grade.trim();
    if (!grade) continue;
    counts.set(grade, (counts.get(grade) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function aggregateSetCounts(listings: TradeListing[]): TraitRow[] {
  const counts = new Map<string, number>();
  for (const listing of listings) {
    const setName = listing.setName?.trim();
    if (!setName) continue;
    counts.set(setName, (counts.get(setName) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function TraitSection({ title, rows }: { title: string; rows: TraitRow[] }) {
  if (rows.length === 0) return null;

  return (
    <section className="border-b border-[#333] last:border-b-0">
      <h3 className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--trade-muted)]">
        {title}
      </h3>
      <ul className="divide-y divide-[#333]">
        {rows.map(({ label, count }) => (
          <li
            key={label}
            className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-[var(--tensor-white)]"
          >
            <span className="truncate">{label}</span>
            <span className="shrink-0 font-mono text-[10px] text-[var(--trade-muted)]">({count})</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Trait distribution from filtered listings — grader, grade, and set counts. */
export function CollectionTraitsPanel({ listings, className }: Props) {
  const graderRows = useMemo(() => aggregateGraderCounts(listings), [listings]);
  const gradeRows = useMemo(() => aggregateGradeCounts(listings), [listings]);
  const setRows = useMemo(() => aggregateSetCounts(listings), [listings]);

  const hasTraitData =
    graderRows.length > 0 || gradeRows.length > 0 || setRows.length > 0;

  if (listings.length === 0) {
    return (
      <div
        className={cn(
          "rounded border border-[#333] bg-[var(--trade-surface)] px-6 py-12 text-center",
          className,
        )}
        role="status"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--tensor-white)]">
          No listings to summarize
        </p>
        <p className="mx-auto mt-2 max-w-md text-xs text-[var(--trade-muted)]">
          Adjust filters or wait for listings to appear in this collection.
        </p>
      </div>
    );
  }

  if (!hasTraitData) {
    return (
      <div
        className={cn(
          "rounded border border-[#333] bg-[var(--trade-surface)] px-6 py-12 text-center",
          className,
        )}
        role="status"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--tensor-white)]">
          No trait metadata
        </p>
        <p className="mx-auto mt-2 max-w-md text-xs text-[var(--trade-muted)]">
          Grader, grade, and set fields are not populated for the current listings.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded border border-[#333] bg-[var(--trade-surface)]",
        className,
      )}
      role="region"
      aria-label="Trait distribution"
    >
      <div className="border-b border-[#333] bg-[var(--trade-panel)] px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--trade-muted)]">
          {listings.length} listing{listings.length === 1 ? "" : "s"} · filtered view
        </p>
      </div>
      <TraitSection title="Grader" rows={graderRows} />
      <TraitSection title="Grade" rows={gradeRows} />
      <TraitSection title="Set" rows={setRows} />
    </div>
  );
}
