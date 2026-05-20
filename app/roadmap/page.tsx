import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getSiteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Roadmap",
  description: "SlabVaultFi development roadmap and future plans.",
  openGraph: {
    title: "Roadmap — SlabVaultFi",
    description: "SlabVaultFi development roadmap and future plans.",
    url: "/roadmap",
  },
};

export default function RoadmapPage() {
  const site = getSiteConfig();

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-14 sm:space-y-14 sm:px-5 sm:py-16">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Roadmap", href: "/roadmap" }]} />

      <header className="space-y-6 animate-fade-in-up">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-vault-amber animate-pulse-glow" />
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            Roadmap
          </h1>
        </div>
        <p className="max-w-prose text-muted">
          Our journey to building the ultimate community-owned collectible vault.
        </p>
      </header>

      <section className="space-y-8 animate-slide-in">
        {site.roadmap.map((block, index) => (
          <div key={block.phase} className="relative">
            <div className="absolute left-4 top-0 h-full w-0.5 bg-gradient-to-b from-vault-violet/50 to-vault-deep/50 sm:left-8" />
            <div className="relative flex gap-4 sm:gap-8">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-vault-violet text-sm font-bold text-foreground sm:h-12 sm:w-12 sm:text-lg animate-pulse-glow">
                {index + 1}
              </div>
              <Card className="group flex-1 space-y-4 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-vault-violet/20 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
                <div className="flex items-center gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-vault-amber">
                    {block.phase}
                  </p>
                </div>
                <ul className="space-y-3">
                  {block.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted group-hover:text-foreground transition-colors duration-300">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-vault-amber" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        ))}
      </section>

      <Card className="group space-y-4 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-vault-violet/20 bg-gradient-to-br from-vault-panel/80 to-vault-deep/60 animate-fade-in-up">
        <h2 className="font-display text-xl font-semibold group-hover:text-vault-amber transition-colors duration-300">Stay Updated</h2>
        <p className="text-sm text-muted">
          Follow our progress on X and Telegram for real-time updates on roadmap milestones.
        </p>
      </Card>
    </div>
  );
}
