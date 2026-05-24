"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { PlatformBadge } from "@/components/platform-badge";
import { VenueBadge } from "@/components/trade/venue-badge";
import type { TradePartnerId } from "@/lib/onchain/collections";
import { TRADE_ROUTES } from "@/lib/trade-routes";
import { cn } from "@/lib/utils";

export type TradeCollectionSocialLinks = {
  websiteUrl?: string | null;
  discordUrl?: string | null;
  twitterUrl?: string | null;
};

export type TradeDeskCollectionContext = {
  name: string;
  partner: TradePartnerId;
  /** Optional collection thumb for desk header row. */
  imageUrl?: string | null;
  /** Live collections show Tensor-style verified crown. */
  verified?: boolean;
  /** Override venue badge label — e.g. aggregate "ALL" desk. */
  venueLabel?: string;
} & TradeCollectionSocialLinks;

function normalizeSocialUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function hasSocialLinks(links: TradeCollectionSocialLinks): boolean {
  return Boolean(
    normalizeSocialUrl(links.websiteUrl) ||
      normalizeSocialUrl(links.discordUrl) ||
      normalizeSocialUrl(links.twitterUrl),
  );
}

const SOCIAL_LINK_CLASS =
  "trade-collection-header__social-link inline-flex size-6 shrink-0 items-center justify-center rounded text-[var(--trade-muted)] transition-colors hover:text-[var(--tensor-accent)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--tensor-accent)]";

function CollectionHeaderSocialLinks({
  websiteUrl,
  discordUrl,
  twitterUrl,
}: TradeCollectionSocialLinks) {
  if (!hasSocialLinks({ websiteUrl, discordUrl, twitterUrl })) {
    return null;
  }

  return (
    <div
      className="trade-collection-header__social flex shrink-0 items-center gap-0.5"
      aria-label="Collection links"
    >
      {websiteUrl ? (
        <a
          href={websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={SOCIAL_LINK_CLASS}
          aria-label="Website"
          title="Website"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Z"
              stroke="currentColor"
              strokeWidth="1.25"
            />
            <path
              d="M1.5 8h13M8 1.5c2 2.167 3 4.667 3 6.5s-1 4.333-3 6.5M8 1.5c-2 2.167-3 4.667-3 6.5s1 4.333 3 6.5"
              stroke="currentColor"
              strokeWidth="1.25"
            />
          </svg>
        </a>
      ) : null}
      {discordUrl ? (
        <a
          href={discordUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={SOCIAL_LINK_CLASS}
          aria-label="Discord"
          title="Discord"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025 9.1 9.1 0 0 0-.608 1.25 12.2 12.2 0 0 0-3.658 0 8.5 8.5 0 0 0-.617-1.25.05.05 0 0 0-.052-.025 13.2 13.2 0 0 0-3.257 1.011A.05.05 0 0 0 1.5 3.02c-1.045 1.56-1.674 3.14-1.866 4.86a.05.05 0 0 0 .019.037 13.3 13.3 0 0 0 4.005 2.02.05.05 0 0 0 .056-.019 9 9 0 0 0 .345-.563.05.05 0 0 0-.028-.069 8.7 8.7 0 0 1-1.248-.595.05.05 0 0 1-.005-.083l.251-.2a.05.05 0 0 1 .053-.004c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .054.004l.251.2a.05.05 0 0 1-.004.083 8.7 8.7 0 0 1-1.247.595.05.05 0 0 0-.028.07 9 9 0 0 0 .344.562.05.05 0 0 0 .056.019 13.3 13.3 0 0 0 4.005-2.02.05.05 0 0 0 .019-.037c-.226-1.82-.858-3.4-1.92-4.96a.05.05 0 0 0-.027-.02ZM5.68 10.05c-.789 0-1.438-.72-1.438-1.605 0-.885.637-1.605 1.438-1.605.812 0 1.453.732 1.438 1.605 0 .885-.637 1.605-1.438 1.605Zm4.64 0c-.789 0-1.438-.72-1.438-1.605 0-.885.637-1.605 1.438-1.605.812 0 1.453.732 1.438 1.605 0 .885-.626 1.605-1.438 1.605Z" />
          </svg>
        </a>
      ) : null}
      {twitterUrl ? (
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={SOCIAL_LINK_CLASS}
          aria-label="X / Twitter"
          title="X / Twitter"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path d="M9.52 6.77 15.36 0h-1.38l-5.07 5.88L4.9 0H0l6.11 8.9L0 16h1.38l5.35-6.24L11.1 16H16L9.52 6.77Zm-1.89 2.2-.62-.88L1.92 1.04h2.12l3.98 5.57.62.88 5.16 7.24h-2.12l-4.21-5.9Z" />
          </svg>
        </a>
      ) : null}
    </div>
  );
}

type Props = {
  activeSlug?: string;
  activeCollection?: TradeDeskCollectionContext;
  /** Portfolio route — hide duplicate search/tabs; show single context title. */
  variant?: "default" | "portfolio";
};

const DESK_TABS = [
  {
    href: TRADE_ROUTES.landing,
    label: "Collections",
    match: (path: string) =>
      path === TRADE_ROUTES.landing ||
      path === TRADE_ROUTES.all ||
      path.startsWith(`${TRADE_ROUTES.landing}/c/`),
  },
  {
    href: TRADE_ROUTES.portfolio,
    label: "Portfolio",
    match: (path: string) => path.startsWith(TRADE_ROUTES.portfolio),
  },
] as const;

export function TradeDeskHeader({
  activeSlug,
  activeCollection,
  variant = "default",
}: Props) {
  const pathname = usePathname();
  const isPortfolio = variant === "portfolio";

  return (
    <header className="trade-desk-header sticky top-12 z-40 flex flex-wrap items-center gap-2 border-b border-[#333] bg-[var(--tensor-black)] px-3 py-1.5 sm:px-4">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {activeCollection ? (
          <div className="trade-collection-header flex min-w-0 items-center gap-2">
            <span className="trade-collection-header__icon relative size-7 shrink-0 overflow-hidden rounded-md border border-[#333] bg-[var(--trade-panel)]">
              {activeCollection.imageUrl ? (
                <Image
                  src={activeCollection.imageUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="28px"
                />
              ) : (
                <span
                  className="flex size-full items-center justify-center text-[9px] font-bold uppercase text-[var(--trade-muted)]"
                  aria-hidden
                >
                  {activeCollection.name.slice(0, 2)}
                </span>
              )}
            </span>
            <div className="flex min-w-0 items-center gap-1.5">
              <h1 className="truncate text-xs font-semibold uppercase tracking-wide text-[var(--tensor-white)]">
                {activeCollection.name}
              </h1>
              {activeCollection.verified ? (
                <span
                  className="trade-collection-header__verified inline-flex shrink-0 items-center text-amber-400"
                  title="Verified collection"
                  aria-label="Verified collection"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M6 1a5 5 0 1 1 0 10A5 5 0 0 1 6 1zm-.9 5.6 1.4-1.4.7.7-2.1 2.1-1.4-1.4.7-.7 1.4 1.4z" />
                  </svg>
                </span>
              ) : null}
              <VenueBadge
                partner={activeCollection.partner}
                label={activeCollection.venueLabel}
                className="inline-flex shrink-0 scale-[0.85]"
              />
              <CollectionHeaderSocialLinks
                websiteUrl={activeCollection.websiteUrl}
                discordUrl={activeCollection.discordUrl}
                twitterUrl={activeCollection.twitterUrl}
              />
            </div>
          </div>
        ) : isPortfolio ? (
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--tensor-white)]">
            Portfolio
          </span>
        ) : activeSlug ? (
          <span className="truncate text-xs font-medium uppercase tracking-wide text-[var(--tensor-white)]">
            {activeSlug.replace(/-/g, " ")}
          </span>
        ) : (
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--trade-muted)]">
            Market
          </span>
        )}
        {!isPortfolio ? (
          <PlatformBadge kind="experimental" className="hidden scale-90 sm:inline-flex" />
        ) : null}
        {!isPortfolio ? (
        <nav
          className="ml-0.5 flex items-center gap-0.5 rounded border border-[#333] bg-[var(--trade-surface)] p-0.5 sm:ml-1"
          aria-label="Trade desk sections"
        >
          {DESK_TABS.map(({ href, label, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors",
                  active
                    ? "bg-[var(--trade-panel)] text-[var(--tensor-white)]"
                    : "text-[var(--trade-muted)] hover:text-[var(--tensor-white)]",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        ) : null}
      </div>
    </header>
  );
}
