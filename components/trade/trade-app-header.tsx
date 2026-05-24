"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import { TradeCommandPalette } from "@/components/trade/trade-command-palette";
import { TradeWalletMenu } from "@/components/trade/portfolio/trade-wallet-menu";
import { WalletButton } from "@/components/wallet-button";
import { parsePortfolioTab, type PortfolioTabId } from "@/lib/trade/portfolio";
import { BRAND_ASSETS, GRAILS_BRAND, SLABVAULT_BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import {
  isTradePortfolioPath,
  TRADE_ROUTES,
} from "@/lib/trade-routes";
import { VAULT_ROUTES } from "@/lib/vault-routes";

type Props = {
  className?: string;
};

function isTradeLandingPath(pathname: string): boolean {
  return pathname === TRADE_ROUTES.landing;
}

function isTradeAllListingsPath(pathname: string): boolean {
  return pathname === TRADE_ROUTES.all;
}

function isTradeCollectionDeskPath(pathname: string): boolean {
  return (
    pathname.startsWith(`${TRADE_ROUTES.landing}/c/`) ||
    pathname.startsWith(`${TRADE_ROUTES.landing}/slab/`) ||
    pathname.startsWith(`${TRADE_ROUTES.landing}/item/`)
  );
}

const navLinkClass = (active: boolean) =>
  cn(
    "border-b-2 pb-0.5 transition-colors hover:text-[var(--tensor-white)]",
    active
      ? "border-[var(--tensor-accent)] text-[var(--tensor-white)]"
      : "border-transparent text-[var(--trade-muted)]",
  );

/** Portfolio tab from location — avoids Suspense stall in the app header. */
function usePortfolioTabFromLocation(pathname: string): PortfolioTabId {
  const [tab, setTab] = useState<PortfolioTabId>("inventory");

  useEffect(() => {
    if (!pathname.startsWith(TRADE_ROUTES.portfolio)) {
      setTab("inventory");
      return;
    }
    const params = new URLSearchParams(window.location.search);
    setTab(parsePortfolioTab(params.get("tab")));
  }, [pathname]);

  return tab;
}

/** Minimal Tensor-style desk header — logo, search slot, wallet only. */
export function TradeAppHeader({ className }: Props) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { connected } = useWallet();
  const pathname = usePathname();
  const portfolioTab = usePortfolioTabFromLocation(pathname);
  const onPortfolio = isTradePortfolioPath(pathname);
  const landingActive = isTradeLandingPath(pathname);
  const allListingsActive = isTradeAllListingsPath(pathname);
  const collectionDeskActive = isTradeCollectionDeskPath(pathname);
  const collectionsIndexActive = landingActive || collectionDeskActive;

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <header
        className={cn(
          "trade-app-header sticky top-0 z-50 border-b border-[#333] bg-[var(--tensor-black)]",
          className,
        )}
      >
        <div className="mx-auto flex h-11 max-w-[1600px] items-center gap-2 px-3 sm:gap-2.5 sm:px-4">
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <Link
              href={TRADE_ROUTES.landing}
              className="group flex shrink-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tensor-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tensor-black)]"
              aria-label={`${GRAILS_BRAND.name} trade desk home`}
            >
              {/* Trade header logo: drop replacement SVG at public/brand/grails-logo.svg */}
              <Image
                src={BRAND_ASSETS.grailsLogo}
                alt="GRAILS"
                width={32}
                height={32}
                className="h-7 w-7 shrink-0 object-contain sm:h-8 sm:w-8"
                priority
              />
            </Link>
            <Link
              href="/"
              className="hidden min-w-0 truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--trade-muted)] transition-colors hover:text-[var(--tensor-white)] sm:inline"
              data-growth-event="nav_home_from_trade"
              data-growth-context="trade_app_header"
            >
              {SLABVAULT_BRAND.displayName}
            </Link>
          </div>

          <nav
            className="hidden items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] md:flex"
            aria-label="Trade desk"
          >
            <Link
              href={TRADE_ROUTES.landing}
              aria-current={collectionsIndexActive ? "page" : undefined}
              className={navLinkClass(collectionsIndexActive)}
            >
              Collections
            </Link>
            <span className="text-[var(--trade-muted)]" aria-hidden>
              ·
            </span>
            <Link
              href={TRADE_ROUTES.all}
              aria-current={allListingsActive ? "page" : undefined}
              className={navLinkClass(allListingsActive)}
              data-growth-event="nav_all_listings"
              data-growth-context="trade_app_header"
            >
              All listings
            </Link>
            <span className="text-[var(--trade-muted)]" aria-hidden>
              ·
            </span>
            <Link
              href={TRADE_ROUTES.portfolio}
              aria-current={onPortfolio ? "page" : undefined}
              className={navLinkClass(onPortfolio)}
            >
              Portfolio
            </Link>
            <span className="text-[var(--trade-muted)]" aria-hidden>
              ·
            </span>
            <Link
              href={VAULT_ROUTES.overview}
              aria-current={pathname.startsWith(VAULT_ROUTES.overview) ? "page" : undefined}
              className={navLinkClass(pathname.startsWith(VAULT_ROUTES.overview))}
              data-growth-event="nav_vault_from_trade"
              data-growth-context="trade_app_header"
            >
              Vault
            </Link>
          </nav>

          <button
            type="button"
            onClick={openPalette}
            className="hidden h-8 min-w-0 flex-1 items-center gap-2 rounded border border-[#333] bg-[var(--trade-surface)] px-3 text-left lg:flex lg:max-w-xl"
            aria-label="Search collections (cert compare Soon, ⌘K)"
          >
            <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--trade-muted)]">
              Search collections
              <span className="ml-1.5 text-[9px] font-normal normal-case">· cert compare Soon</span>
            </span>
            <kbd className="shrink-0 rounded border border-[#333] bg-[var(--trade-panel)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--trade-muted)]">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            onClick={openPalette}
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#333] bg-[var(--trade-surface)] text-[10px] font-mono text-[var(--trade-muted)] lg:hidden"
            aria-label="Search collections (cert compare Soon, ⌘K)"
          >
            ⌘K
          </button>

          <div className="flex shrink-0 items-center lg:ml-0">
            {connected ? (
              <TradeWalletMenu
                activeTab={onPortfolio ? portfolioTab : "inventory"}
                className="gap-1.5"
              />
            ) : (
              <WalletButton className="!min-h-8 !min-w-[7.5rem] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide" />
            )}
          </div>
        </div>
      </header>

      <TradeCommandPalette open={paletteOpen} onClose={closePalette} />
    </>
  );
}
