import { LinkButton } from "@/components/link-button";
import { Card } from "@/components/ui/card";
import { getGachaTiers } from "@/lib/site-config";
import type { SiteConfig } from "@/types/content";

type Props = {
  site: SiteConfig;
  trackingContext?: string;
};

export function GachaTiers({ site, trackingContext = "home_pull_tiers" }: Props) {
  const tiers = getGachaTiers(site);

  return (
    <section className="space-y-6" aria-labelledby="gacha-tiers-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="gacha-tiers-heading" className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Pull tiers
          </h2>
          <p className="mt-1 max-w-prose text-sm text-muted">
            Creator fees fund live gacha pulls across partner platforms.
          </p>
        </div>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto overscroll-x-contain scroll-px-4 px-4 pb-2 snap-x snap-mandatory scroll-smooth sm:-mx-5 sm:gap-4 sm:scroll-px-5 sm:px-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tiers.map((tier) => (
          <Card
            key={tier.href}
            className="group flex w-[14rem] shrink-0 snap-start flex-col gap-0 overflow-hidden p-0 transition-[border-color,box-shadow] hover:border-vault-violet/35 hover:shadow-[0_0_32px_-12px_rgba(139,92,246,0.45)] sm:w-[16rem] lg:w-[18rem]"
          >
            <div className="relative aspect-[16/10] bg-gradient-to-br from-vault-violet/25 to-vault-deep">
              {tier.imageUrl?.trim() ? (
                // eslint-disable-next-line @next/next/no-img-element -- optional CDN URLs from JSON
                <img
                  src={tier.imageUrl.trim()}
                  alt={`${tier.name} pull tier`}
                  className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-4">
                  <span className="font-heading text-lg font-semibold text-foreground/90">
                    {tier.name}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div>
                <p className="font-heading text-lg font-semibold text-foreground group-hover:text-vault-amber transition-colors">
                  {tier.name}
                </p>
                <p className="mt-0.5 text-sm text-muted">{tier.priceLabel}</p>
              </div>
              <LinkButton
                href={tier.href}
                external
                variant="secondary"
                className="w-full"
                trackingEvent="cta_open_gacha_partner"
                trackingContext={`${trackingContext}:${tier.name}`}
              >
                Open gacha
              </LinkButton>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
