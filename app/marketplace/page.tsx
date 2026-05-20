import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlabImage } from "@/components/slab-image";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { LinkButton } from "@/components/link-button";
import { MarketplaceStatusFilter } from "@/components/marketplace-status-filter";
import { formatUsd } from "@/lib/format";
import { listMarketplaceSlabs } from "@/lib/marketplace-slabs";
import { getSiteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Marketplace",
  description: "Purchase graded slabs from the SlabVaultFi vault with SOL and SVF.",
  openGraph: {
    title: "Marketplace — SlabVaultFi",
    description: "Purchase graded slabs from the SlabVaultFi vault with SOL and SVF.",
    url: "/marketplace",
  },
};

/** Always read DB/JSON at request time — avoids stale empty listings from static build. */
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function MarketplacePage({ searchParams }: PageProps) {
  const { status: statusParam } = await searchParams;
  const statusFilter =
    statusParam?.toUpperCase() === "SOLD" ? "SOLD" : "AVAILABLE";

  const site = getSiteConfig();
  const { slabs, fromFallback, dbStatus, dbHint } = await listMarketplaceSlabs({
    status: statusFilter,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-5 sm:py-16">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Marketplace", href: "/marketplace" },
        ]}
      />

      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Marketplace
            </h1>
            <p className="text-lg text-muted">
              Purchase slabs from the vault using split payments (SOL + SVF tokens).
            </p>
          </div>
          <Suspense fallback={null}>
            <MarketplaceStatusFilter />
          </Suspense>
        </div>
        {dbStatus === "unconfigured" && fromFallback ? (
          <p className="rounded-lg border border-line bg-vault-panel/60 px-4 py-3 text-sm text-muted">
            <span className="font-medium text-foreground">Demo mode — </span>
            Showing browse-only listings from{" "}
            <code className="text-foreground">data/slabs.json</code>. Set{" "}
            <code className="text-foreground">DATABASE_URL</code> to a direct{" "}
            <code className="text-foreground">postgresql://</code> connection,
            run <code className="text-foreground">npm run db:push</code> and{" "}
            <code className="text-foreground">npm run db:seed</code>, or add
            slabs via admin for live checkout.
          </p>
        ) : null}
        {dbStatus === "unreachable" && fromFallback ? (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-muted">
            <span className="font-medium text-foreground">
              Database unreachable
            </span>
            {" — "}
            {dbHint ??
              "Check DATABASE_URL and ensure Postgres is running."}{" "}
            Showing browse-only demo listings until the connection is fixed.
          </p>
        ) : null}
      </div>

      {slabs.length === 0 ? (
        <Card className="space-y-4 p-12 text-center">
          <p className="text-lg font-medium text-foreground">
            {statusFilter === "SOLD"
              ? "No sold listings yet"
              : dbStatus === "connected"
                ? "No listings available right now"
                : "Next listing after tonight\u2019s stream"}
          </p>
          <p className="text-sm text-muted">
            {statusFilter === "SOLD"
              ? "Completed sales appear here once checkout finishes."
              : dbStatus === "connected"
                ? "Add slabs in admin or run npm run db:seed to populate the marketplace."
                : "New vault slabs are listed after live pulls. Follow for drop alerts."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <LinkButton href={site.links.twitter} external>
              Follow on X
            </LinkButton>
            <LinkButton href={site.links.telegram} external variant="secondary">
              Telegram
            </LinkButton>
            <Button variant="outline" asChild>
              <a href="/streams">Streams</a>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {slabs.map((slab) => (
            <Card
              key={slab.id}
              className="group space-y-4 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-vault-violet/20 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50"
            >
              <div className="overflow-hidden rounded-xl border border-line transition-all duration-300 group-hover:scale-105">
                <SlabImage
                  src={slab.imageUrl}
                  alt={`${slab.name} ${slab.grade}`}
                  className="aspect-[4/3] w-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-vault-amber transition-colors duration-300">
                    {slab.name}
                  </h3>
                  <Badge variant="grade" className="shrink-0">
                    {slab.grade}
                  </Badge>
                </div>
                <p className="text-sm text-muted">
                  {new Date(slab.acquiredAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>

              <div className="space-y-2 border-t border-line pt-4">
                {slab.estimatedValueUsd != null ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">FMV</span>
                    <span className="font-mono text-base font-semibold text-vault-amber">
                      {formatUsd(slab.estimatedValueUsd)}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">SOL Price</span>
                  <span className="font-mono font-semibold text-foreground">
                    {slab.solPrice} SOL
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">SVF Price</span>
                  <span className="font-mono font-semibold text-foreground">
                    {slab.svfPrice} SVF
                  </span>
                </div>
              </div>

              {statusFilter === "AVAILABLE" ? (
                <Button
                  className="w-full transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-vault-violet/30"
                  asChild
                >
                  <Link href={`/marketplace/${slab.id}`}>Purchase</Link>
                </Button>
              ) : (
                <Badge variant="secondary" className="w-full justify-center py-2">
                  Sold
                </Badge>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
