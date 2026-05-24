import Image from "next/image";

import { LinkButton } from "@/components/link-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BRAND_ASSETS, GRAILS_BRAND, LAUNCH_APP_HREF } from "@/lib/brand";
import { SECTION_HEADING_CLASS } from "@/lib/layout";
import { TRADE_ROUTES } from "@/lib/trade-routes";

export function HomeTradeCta() {
  return (
    <section aria-labelledby="home-trade-cta-heading">
      <Card className="overflow-hidden border-violet-500/20 bg-gradient-to-br from-[#1a0f2e]/80 via-vault-deep/70 to-vault-panel/40 p-6 sm:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-10">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-300/90">
                {GRAILS_BRAND.byline}
              </p>
              <Badge
                variant="outline"
                className="border-violet-500/35 bg-violet-500/10 text-[0.65rem] text-violet-300"
              >
                Beta · experimental
              </Badge>
            </div>
            <h2 id="home-trade-cta-heading" className={SECTION_HEADING_CLASS}>
              {GRAILS_BRAND.name} — {GRAILS_BRAND.tagline}
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-muted sm:text-base">
              {GRAILS_BRAND.subtitle}. Browse merged listings across Collector Crypt,
              Phygitals, and SlabVault treasury — plus per-venue collection desks — without
              tab-hopping. Connect your wallet inside the app when you are ready to list or
              fill.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <LinkButton
                href={TRADE_ROUTES.all}
                className="w-full min-h-11 shadow-[0_0_24px_-6px_rgba(139,92,246,0.45)] sm:w-auto"
                trackingEvent="cta_browse_all_listings"
                trackingContext="home_footer"
              >
                Browse all listings
              </LinkButton>
              <LinkButton
                href={LAUNCH_APP_HREF}
                variant="secondary"
                className="w-full min-h-11 sm:w-auto"
                trackingEvent="cta_launch_app"
                trackingContext="home_footer"
              >
                Explore GRAILS
              </LinkButton>
              <LinkButton
                href={TRADE_ROUTES.collectionsIndex}
                variant="secondary"
                className="w-full min-h-11 sm:w-auto"
                trackingEvent="cta_browse_collections"
                trackingContext="home_footer"
              >
                Collection index
              </LinkButton>
            </div>
          </div>

          <Image
            src={BRAND_ASSETS.banner}
            alt={`${GRAILS_BRAND.name} — ${GRAILS_BRAND.tagline}`}
            width={640}
            height={200}
            className="mx-auto h-auto w-full max-w-[20rem] rounded-xl border border-violet-500/20 lg:mx-0 lg:max-w-[16rem]"
          />
        </div>
      </Card>
    </section>
  );
}
