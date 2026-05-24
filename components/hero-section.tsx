import { LinkButton } from "@/components/link-button";
import { SlabImage } from "@/components/slab-image";
import { Badge } from "@/components/ui/badge";
import { LAUNCH_APP_HREF, SLABVAULT_BRAND } from "@/lib/brand";
import { getHeroSlabImageUrls } from "@/lib/slab-image-url";
import { VAULT_ROUTES } from "@/lib/vault-routes";
import type { SiteConfig, SlabItem } from "@/types/content";

type Props = {
  site: SiteConfig;
  slabs: SlabItem[];
};

const FLYWHEEL_CHAIN = [
  "Crypto activity",
  "Live pulls",
  "Graded slabs",
  "Public vault",
] as const;

export function HeroSection({ site, slabs }: Props) {
  const images = getHeroSlabImageUrls(site, slabs);

  return (
    <section className="relative w-full overflow-hidden border-b border-line bg-gradient-to-br from-vault-deep via-vault-void to-vault-panel">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_80%_-15%,rgba(251,191,36,0.14),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_35%_at_5%_100%,rgba(251,191,36,0.08),transparent_50%)]"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-5 sm:py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-14 lg:py-20">
        <div className="space-y-6 sm:space-y-7 motion-safe:animate-fade-in-up">
          <Badge
            variant="secondary"
            className="inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-vault-mint motion-safe:animate-pulse" />
            Community-owned collectible vault · Solana
          </Badge>

          <div className="space-y-4">
            <h1 className="font-heading text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]">
              {SLABVAULT_BRAND.displayName}
            </h1>
            <p className="font-heading text-xl font-semibold leading-snug text-vault-amber sm:text-2xl">
              Crypto activity → live pulls → graded slabs → public vault.
            </p>
          </div>

          <p className="max-w-prose text-base leading-relaxed text-muted sm:text-lg">
            {SLABVAULT_BRAND.displayName} is the community treasury around live
            breaks, graded inventory, and transparent vault growth.{" "}
            <span className="text-foreground/90">{site.ticker}</span> coordinates
            participation — the vault is the product.
          </p>

          <div
            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium uppercase tracking-[0.12em] text-muted"
            aria-label="Vault flywheel summary"
          >
            {FLYWHEEL_CHAIN.map((step, index) => (
              <span key={step} className="inline-flex items-center gap-2">
                {index > 0 ? (
                  <span className="text-vault-amber/70" aria-hidden>
                    →
                  </span>
                ) : null}
                <span>{step}</span>
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:items-center">
            <LinkButton
              href={VAULT_ROUTES.overview}
              className="w-full min-h-11 px-6 text-base sm:w-auto"
              trackingEvent="cta_explore_vault"
              trackingContext="home_hero"
            >
              Explore the vault
            </LinkButton>
            <LinkButton
              href={LAUNCH_APP_HREF}
              variant="secondary"
              className="w-full min-h-11 px-6 text-base sm:w-auto"
              trackingEvent="cta_launch_app"
              trackingContext="home_hero"
            >
              Explore GRAILS
            </LinkButton>
          </div>
          <p className="text-xs leading-relaxed text-muted">
            Trade graded slabs on{" "}
            <span className="text-foreground/80">GRAILS</span> — SlabVault&apos;s
            aggregator desk. Beta; connect wallet inside the app when ready.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-[17.5rem] motion-safe:animate-fade-in-up sm:max-w-xs lg:mx-0 lg:max-w-none">
          {images.length > 0 ? (
            <div className="relative aspect-[4/5] w-full max-w-full sm:max-w-sm lg:ml-auto lg:max-w-md">
              {images.map((src, i) => (
                <div
                  key={`${src}-${i}`}
                  className="absolute aspect-[3/4] overflow-hidden rounded-2xl border border-line/90 bg-vault-panel shadow-[0_24px_60px_-24px_rgba(0,0,0,0.85)] ring-1 ring-vault-amber/10 transition-transform motion-safe:duration-500 motion-safe:hover:scale-[1.02]"
                  style={{
                    width: `${88 - i * 6}%`,
                    left: `${i * 8}%`,
                    top: `${i * 6}%`,
                    zIndex: images.length - i,
                    transform: `rotate(${i % 2 === 0 ? -2 - i : 2 + i}deg)`,
                  }}
                >
                  <SlabImage
                    src={src}
                    alt={`Graded slab ${i + 1}`}
                    className="h-full w-full"
                    priority={i === 0}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex aspect-[4/5] items-center justify-center rounded-2xl border border-dashed border-line bg-vault-panel/60 p-8 text-center text-sm text-muted">
              Add slab images in data/slabs.json or site.latestSlab.imageUrl for
              the hero stack.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
