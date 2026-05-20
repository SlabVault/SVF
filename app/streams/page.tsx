import type { Metadata } from "next";
import { StreamEmbed } from "@/components/stream-embed";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getSiteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Streams",
  description: "Watch live streams from the SlabVaultFi community.",
  openGraph: {
    title: "Streams — SlabVaultFi",
    description: "Watch live streams from the SlabVaultFi community.",
    url: "/streams",
  },
};

export default function StreamsPage() {
  const site = getSiteConfig();

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-14 sm:space-y-14 sm:px-5 sm:py-16">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Streams", href: "/streams" }]} />

      <header className="space-y-6 animate-fade-in-up">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${site.stream.live ? "bg-vault-amber animate-pulse-glow" : "bg-muted"}`} />
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            Live Streams
          </h1>
        </div>
        <p className="max-w-prose text-muted">
          Watch live pulls, community events, and more from the SlabVaultFi team.
        </p>
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
