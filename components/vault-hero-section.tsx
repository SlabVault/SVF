import { LinkButton } from "@/components/link-button";
import { SlabImage } from "@/components/slab-image";
import { Badge } from "@/components/ui/badge";
import { LAUNCH_APP_HREF } from "@/lib/brand";
import { getHeroSlabImageUrls } from "@/lib/slab-image-url";
import { getPrimaryGachaHref } from "@/lib/site-config";
import { VAULT_ROUTES } from "@/lib/vault-routes";
import type { SiteConfig, SlabItem } from "@/types/content";

type Props = {
  site: SiteConfig;
  slabs: SlabItem[];
};

export function VaultHeroSection({ site, slabs }: Props) {
  const images = getHeroSlabImageUrls(site, slabs);
  const pullHref = getPrimaryGachaHref(site);

  return (
    <section className="relative w-full overflow-hidden border-b border-line bg-gradient-to-br from-vault-deep via-vault-void to-vault-panel">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_70%_-20%,rgba(139,92,246,0.35),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_10%_100%,rgba(251,191,36,0.12),transparent_50%)]"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-5 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-14 lg:py-24">
        <div className="space-y-6 sm:space-y-8 motion-safe:animate-fade-in-up">
          <Badge
            variant="secondary"
            className="inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-vault-mint" />
            Community-owned · Squads multisig
          </Badge>
          <h1 className="font-heading text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            The community{" "}
            <span className="text-vault-amber">collectible vault.</span>
          </h1>
          <p className="max-w-prose text-lg leading-relaxed text-muted sm:text-xl">
            Creator fees from {site.ticker} trading fund live gacha pulls. Graded
            hits land in a transparent multisig treasury — public proof, live
            streams, and community ownership around the flywheel.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <LinkButton
              href={pullHref}
              external
              className="w-full shadow-[0_0_24px_-6px_rgba(251,191,36,0.55)] sm:w-auto"
              trackingEvent="cta_pull_now_from_vault_hero"
              trackingContext="vault_hero"
            >
              Pull now
            </LinkButton>
            <LinkButton
              href={VAULT_ROUTES.proof}
              variant="secondary"
              className="w-full sm:w-auto"
              trackingEvent="cta_open_proof_from_vault_hero"
              trackingContext="vault_hero"
            >
              Treasury transparency
            </LinkButton>
            <LinkButton
              href="/streams"
              variant="ghost"
              className="w-full sm:w-auto"
              trackingEvent="cta_watch_stream_from_vault_hero"
              trackingContext="vault_hero"
            >
              Watch streams
            </LinkButton>
            <LinkButton
              href={LAUNCH_APP_HREF}
              variant="ghost"
              className="w-full sm:w-auto"
              trackingEvent="cta_launch_app"
              trackingContext="vault_hero"
            >
              Explore GRAILS
            </LinkButton>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[17.5rem] motion-safe:animate-fade-in-up sm:max-w-xs lg:mx-0 lg:max-w-none">
          {images.length > 0 ? (
            <div className="relative aspect-[4/5] w-full max-w-full sm:max-w-sm lg:ml-auto lg:max-w-md">
              {images.map((src, i) => (
                <div
                  key={`${src}-${i}`}
                  className="absolute aspect-[3/4] overflow-hidden rounded-2xl border border-line bg-vault-panel shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] transition-transform motion-safe:duration-500 motion-safe:hover:scale-[1.02]"
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
                    alt={`Vault slab ${i + 1}`}
                    className="h-full w-full"
                    priority={i === 0}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex aspect-[4/5] items-center justify-center rounded-2xl border border-dashed border-line bg-vault-panel/60 p-8 text-center text-sm text-muted">
              Slab images from data/slabs.json appear here as the vault grows.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
