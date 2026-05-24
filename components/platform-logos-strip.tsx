import Image from "next/image";

import { TRADE_LIQUIDITY_VENUES } from "@/lib/trade-landing";

const VENUE_LOGOS: Partial<
  Record<(typeof TRADE_LIQUIDITY_VENUES)[number]["id"], string>
> = {
  collector_crypt: "/gacha/collector-crypt.svg",
  phygitals: "/gacha/phygitals.svg",
};

export function PlatformLogosStrip() {
  return (
    <section
      className="border-b border-line/80 bg-vault-panel/30"
      aria-labelledby="platform-logos-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-5 sm:py-8">
        <p
          id="platform-logos-heading"
          className="text-center text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted"
        >
          Pull partners &amp; GRAILS liquidity
        </p>
        <ul className="mt-4 flex flex-wrap items-center justify-center gap-4 sm:gap-8">
          {TRADE_LIQUIDITY_VENUES.map((venue) => {
            const logoSrc = VENUE_LOGOS[venue.id];

            return (
              <li key={venue.id}>
                <div className="flex items-center gap-2.5 rounded-lg border border-line/60 bg-vault-deep/30 px-3 py-2.5 transition-colors hover:border-vault-amber/20">
                  {logoSrc ? (
                    <Image
                      src={logoSrc}
                      alt=""
                      width={28}
                      height={28}
                      className="h-7 w-7 shrink-0 object-contain"
                    />
                  ) : (
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-vault-violet/20 text-xs font-bold text-vault-violet"
                      aria-hidden
                    >
                      ME
                    </span>
                  )}
                  <span className="text-sm font-semibold text-foreground">
                    {venue.name}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
