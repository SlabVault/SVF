"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { SiteConfig } from "@/types/content";

type Props = {
  site: SiteConfig;
  svfPriceUsd?: number | null;
  children: ReactNode;
};

function isTradeAppPath(pathname: string): boolean {
  return pathname === "/trade" || pathname.startsWith("/trade/");
}

export function AppShell({ site, svfPriceUsd = null, children }: Props) {
  const pathname = usePathname();
  const isTradeApp = isTradeAppPath(pathname);

  return (
    <div className="flex min-h-full flex-col">
      {!isTradeApp ? (
        <SiteHeader
          brandName={site.brandName}
          ticker={site.ticker}
          svfPriceUsd={svfPriceUsd}
        />
      ) : null}
      <main id="main" className="flex-1">
        {children}
      </main>
      {!isTradeApp ? <SiteFooter site={site} /> : null}
    </div>
  );
}
