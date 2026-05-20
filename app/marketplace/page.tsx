import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlabImage } from "@/components/slab-image";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { formatUsd } from "@/lib/format";
import { listMarketplaceSlabs } from "@/lib/marketplace-slabs";

export default async function MarketplacePage() {
  const { slabs, fromFallback } = await listMarketplaceSlabs({
    status: "AVAILABLE",
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
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Marketplace
        </h1>
        <p className="text-lg text-muted">
          Purchase slabs from the vault using split payments (SOL + SVF tokens).
        </p>
        {fromFallback ? (
          <p className="rounded-lg border border-line bg-vault-panel/60 px-4 py-3 text-sm text-muted">
            Showing demo listings from{" "}
            <code className="text-foreground">data/slabs.json</code>. Set{" "}
            <code className="text-foreground">DATABASE_URL</code>, run{" "}
            <code className="text-foreground">npx prisma db push</code>, and add
            slabs via admin for live checkout.
          </p>
        ) : null}
      </div>

      {slabs.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-lg text-muted">
            No slabs available for purchase at this time.
          </p>
          <p className="mt-2 text-sm text-muted">
            Add listings in the admin dashboard or populate{" "}
            <code>data/slabs.json</code>.
          </p>
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
                  {new Date(slab.acquiredAt).toLocaleDateString()}
                </p>
              </div>

              <div className="space-y-2 border-t border-line pt-4">
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
                {slab.estimatedValueUsd != null ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">FMV</span>
                    <span className="font-mono text-base font-semibold text-vault-amber">
                      {formatUsd(slab.estimatedValueUsd)}
                    </span>
                  </div>
                ) : null}
              </div>

              <Button
                className="w-full transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-vault-violet/30"
                asChild
              >
                <a href={`/marketplace/${slab.id}`}>Purchase</a>
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
