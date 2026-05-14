import Link from "next/link";

import { SiteNav } from "@/components/site-nav";
import { INTERNAL_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

type Props = {
  brandName: string;
  ticker: string;
};

export function SiteHeader({ brandName, ticker }: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-vault-void/80 backdrop-blur-md supports-[backdrop-filter]:bg-vault-void/65">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-5 sm:py-4">
        <Link
          href="/"
          className={cn(
            "group flex min-w-0 items-baseline gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
        >
          <span className="truncate font-display text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-vault-amber">
            {brandName}
          </span>
          <span className="shrink-0 rounded-full border border-line bg-vault-panel px-2 py-0.5 text-xs font-medium text-muted">
            {ticker}
          </span>
        </Link>
        <SiteNav brandName={brandName} ticker={ticker} items={INTERNAL_NAV} />
      </div>
    </header>
  );
}
