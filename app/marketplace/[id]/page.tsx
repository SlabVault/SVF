import { Breadcrumbs } from "@/components/breadcrumbs";
import { SlabDetailClient } from "@/components/slab-detail-client";
import { getMarketplaceSlabById } from "@/lib/marketplace-slabs";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SlabDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = rawId.trim();
  if (!id) {
    notFound();
  }

  const slab = await getMarketplaceSlabById(id);

  if (!slab) {
    notFound();
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
