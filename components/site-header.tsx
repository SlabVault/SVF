import Image from "next/image";
import Link from "next/link";

import { LinkButton } from "@/components/link-button";
import { SiteNav } from "@/components/site-nav";
import { SvfPricePill } from "@/components/svf-price-pill";
import { WalletButton } from "@/components/wallet-button";
import { BRAND_ASSETS } from "@/lib/brand";
import { getLaunchAppNav, getPublicNavStructure } from "@/lib/nav";
import { cn } from "@/lib/utils";

type Props = {
  brandName: string;
  ticker: string;
  svfPriceUsd?: number | null;
};

export function SiteHeader({ brandName, ticker, svfPriceUsd = null }: Props) {
  const launchApp = getLaunchAppNav();

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-vault-void/80 backdrop-blur-md supports-[backdrop-filter]:bg-vault-void/65 transition-all duration-300">
      <div className="relative mx-auto flex max-w-6xl items-center gap-3 px-4 py-3.5 sm:gap-3 sm:px-5 sm:py-3.5">
        <Link
          href="/"
          aria-label={`${brandName} home`}
          className={cn(
            "group flex min-w-0 shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grails-purple/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors",
          )}
        >
          <Image
            src={BRAND_ASSETS.logo}
            alt={`${brandName} — geometric purple G mark by SlabVault Labs`}
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 object-contain"
            priority
          />
          <span className="truncate font-display text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-grails-lavender">
            {brandName}
          </span>
          <span
            className="shrink-0 rounded-full border border-line bg-vault-panel px-2 py-0.5 text-xs font-medium text-muted transition-colors group-hover:border-grails-purple/50 group-hover:text-foreground"
            aria-hidden="true"
          >
            {ticker}
          </span>
        </Link>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
          <SvfPricePill priceUsd={svfPriceUsd ?? null} className="hidden sm:inline-flex" />
          <SiteNav brandName={brandName} ticker={ticker} nav={getPublicNavStructure()} />
          <div className="flex shrink-0 items-center gap-2 pl-0.5 sm:gap-2.5 sm:pl-0">
            {launchApp ? (
              <LinkButton
                href={launchApp.href}
                className="min-h-10 shadow-[0_0_20px_-6px_rgba(168,85,247,0.55)] sm:shadow-[0_0_20px_-6px_rgba(168,85,247,0.55)]"
                trackingEvent="cta_launch_app"
                trackingContext="site_header"
              >
                {launchApp.label}
              </LinkButton>
            ) : null}
            <div className="hidden sm:block">
              <WalletButton className="!bg-transparent !shadow-none hover:!scale-100 hover:!shadow-none" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
