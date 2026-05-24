import Link from "next/link";

import { cn } from "@/lib/utils";
import { VAULT_ROUTES } from "@/lib/vault-routes";

const TABS = [
  { status: "AVAILABLE", label: "Active" },
  { status: "SOLD", label: "Sold" },
] as const;

type Props = {
  currentStatus: "AVAILABLE" | "SOLD";
};

export function MarketplaceStatusFilter({ currentStatus }: Props) {

  return (
    <nav
      className="inline-flex rounded-lg border border-line bg-vault-panel/50 p-1"
      aria-label="Listing status"
    >
      {TABS.map(({ status, label }) => {
        const active = currentStatus === status;
        const href =
          status === "AVAILABLE" ? VAULT_ROUTES.shop : `${VAULT_ROUTES.shop}?status=${status}`;

        return (
          <Link
            key={status}
            href={href}
            aria-current={active ? "page" : undefined}
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
    </nav>
  );
}
