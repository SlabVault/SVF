"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { status: "AVAILABLE", label: "Active" },
  { status: "SOLD", label: "Sold" },
] as const;

export function MarketplaceStatusFilter() {
  const searchParams = useSearchParams();
  const current = searchParams.get("status")?.toUpperCase() ?? "AVAILABLE";

  return (
    <div
      className="inline-flex rounded-lg border border-line bg-vault-panel/50 p-1"
      role="tablist"
      aria-label="Listing status"
    >
      {TABS.map(({ status, label }) => {
        const active = current === status;
        const href =
          status === "AVAILABLE" ? "/marketplace" : `/marketplace?status=${status}`;

        return (
          <Link
            key={status}
            href={href}
            role="tab"
            aria-selected={active}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active
                ? "bg-vault-deep text-foreground shadow-sm"
                : "text-muted hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
