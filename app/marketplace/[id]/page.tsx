import { Breadcrumbs } from "@/components/breadcrumbs";
import { SlabDetailClient } from "@/components/slab-detail-client";
import { Card } from "@/components/ui/card";
import { getMarketplaceSlabById } from "@/lib/marketplace-slabs";

export default async function SlabDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const slab = await getMarketplaceSlabById(id);

  if (!slab) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-5 sm:py-16">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Marketplace", href: "/marketplace" },
            { label: "Not Found", href: "#" },
          ]}
        />
        <Card className="p-12 text-center">
          <h1 className="font-display text-2xl font-semibold">Slab Not Found</h1>
          <p className="mt-2 text-muted">
            The slab you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-5 sm:py-16">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Marketplace", href: "/marketplace" },
          { label: slab.name, href: `/marketplace/${slab.id}` },
        ]}
      />
      <SlabDetailClient slab={slab} />
    </div>
  );
}
