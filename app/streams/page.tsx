import type { Metadata } from "next";
import { StreamEmbed } from "@/components/stream-embed";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { LinkButton } from "@/components/link-button";
import { buildPageMetadata } from "@/lib/seo";
import { getSiteConfig } from "@/lib/site-config";

export const metadata: Metadata = buildPageMetadata({
  title: "Streams",
  description:
    "Watch live SlabVaultFi streams, pull sessions, and updates tied to vault activity.",
  path: "/streams",
  keywords: ["live streams", "gacha streams", "pull events"],
});

export default function StreamsPage() {
  const site = getSiteConfig();

  return (
    <div className="page-shell">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Streams", href: "/streams" }]} />

      <header className="page-header space-y-6 animate-fade-in-up">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${site.stream.live ? "bg-vault-amber animate-pulse-glow" : "bg-muted"}`} />
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            Live Streams
          </h1>
        </div>
        <p className="max-w-prose text-muted">
          Watch live pulls, community events, and more from the SlabVaultFi team.
        </p>
        <div className="flex flex-wrap gap-3">
          <LinkButton
            href="/trade"
            variant="secondary"
            trackingEvent="cta_open_trade_from_streams"
            trackingContext="streams_header"
          >
            Trade desk
          </LinkButton>
          <LinkButton
            href="/vault/proof"
            variant="ghost"
            trackingEvent="cta_open_proof_from_streams"
            trackingContext="streams_header"
          >
            Verify vault links
          </LinkButton>
        </div>
      </header>

      <div className="animate-slide-in">
        <StreamEmbed
          live={site.stream.live}
          embedUrl={site.stream.embedUrl}
          watchUrl={site.stream.watchUrl}
        />
      </div>
    </div>
  );
}
