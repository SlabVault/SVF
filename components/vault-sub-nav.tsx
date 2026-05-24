"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { VAULT_ROUTES } from "@/lib/vault-routes";
import { cn } from "@/lib/utils";

const TABS = [
  {
    href: VAULT_ROUTES.overview,
    label: "Overview",
    isActive: (pathname: string) => pathname === VAULT_ROUTES.overview,
  },
  {
    href: VAULT_ROUTES.proof,
    label: "Transparency",
    isActive: (pathname: string) =>
      pathname === VAULT_ROUTES.proof || pathname.startsWith(`${VAULT_ROUTES.proof}/`),
  },
] as const;

export function VaultSubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="inline-flex max-w-full flex-wrap rounded-lg border border-line bg-vault-panel/50 p-1"
      aria-label="Vault sections"
    >
      {TABS.map(({ href, label, isActive }) => {
        const active = isActive(pathname);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-4",
              active
                ? "bg-vault-deep text-foreground shadow-sm"
                : "text-muted hover:text-foreground",
            )}
            data-growth-event={`vault_subnav_${label.toLowerCase()}`}
            data-growth-context="vault_subnav"
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
