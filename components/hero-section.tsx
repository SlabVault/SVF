import Link from "next/link";
import { LinkButton } from "@/components/link-button";
import { SlabImage } from "@/components/slab-image";
import { Badge } from "@/components/ui/badge";
import { getHeroSlabImageUrls } from "@/lib/slab-image-url";
import { getPrimaryGachaHref } from "@/lib/site-config";
import type { SiteConfig, SlabItem } from "@/types/content";

type Props = {
  site: SiteConfig;
  slabs: SlabItem[];
};

export function HeroSection({ site, slabs }: Props) {
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
          <Badge variant="secondary" className="inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-vault-mint" />
            Transparent multisig vault · Solana
          </Badge>
          <h1 className="font-heading text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            The collectible vault,{" "}
            <span className="text-vault-amber">owned by the community.</span>
          </h1>
          <p className="max-w-prose text-lg leading-relaxed text-muted sm:text-xl">
            {site.description}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <LinkButton
              href={pullHref}
              external
              className="w-full shadow-[0_0_24px_-6px_rgba(251,191,36,0.55)] sm:w-auto"
            >
              Pull now
            </LinkButton>
            <p className="text-sm text-muted">
              <Link
                href="/marketplace"
                className="font-semibold text-vault-amber underline-offset-4 hover:underline"
              >
                Marketplace
              </Link>
              <span className="mx-2 text-line">·</span>
              <Link
                href="/vault"
                className="font-semibold text-muted underline-offset-4 hover:text-foreground hover:underline"
              >
                Vault
              </Link>
            </p>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none motion-safe:animate-fade-in-up lg:mx-0">
          {images.length > 0 ? (
            <div className="relative aspect-[4/5] w-full max-w-sm sm:max-w-md lg:ml-auto lg:max-w-lg">
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
                    priority
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex aspect-[4/5] items-center justify-center rounded-2xl border border-dashed border-line bg-vault-panel/60 p-8 text-center text-sm text-muted">
              Add slab images in data/slabs.json or site.latestSlab.imageUrl for the hero stack.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
