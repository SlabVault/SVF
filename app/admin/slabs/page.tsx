import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";

async function getSlabs() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/admin/slabs`, {
      cache: "no-store",
    });
    if (!response.ok) return [];
    return response.json();
  } catch (error) {
    console.error("Error fetching slabs:", error);
    return [];
  }
}

export default async function AdminSlabsPage() {
  const slabs = await getSlabs();

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-5 sm:py-16">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Admin", href: "/admin" },
          { label: "Slabs", href: "/admin/slabs" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div className="space-y-4">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Slab Management
          </h1>
          <p className="text-lg text-muted">
            Manage vault slab listings and pricing.
          </p>
        </div>
        <Button className="transition-all duration-300 hover:scale-105" asChild>
          <a href="/admin/slabs/new">Add New Slab</a>
        </Button>
      </div>

      <Card className="overflow-hidden bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                <th className="px-6 py-4 text-left text-sm font-medium text-muted">Name</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted">Grade</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted">Status</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted">SOL Price</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted">SVF Price</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted">Est. Value</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {slabs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted">
                    No slabs found. Add your first slab to get started.
                  </td>
                </tr>
              ) : (
                slabs.map((slab: { id: string; name: string; grade: string; status: string; solPrice: number; svfPrice: number; estimatedValueUsd: number | null; acquiredAt: string | Date }) => (
                  <tr key={slab.id} className="border-b border-line hover:bg-vault-panel/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium">{slab.name}</div>
                      <div className="text-xs text-muted">{new Date(slab.acquiredAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="grade">{slab.grade}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          slab.status === "AVAILABLE"
                            ? "live"
                            : slab.status === "SOLD"
                            ? "default"
                            : "outline"
                        }
                      >
                        {slab.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">{slab.solPrice} SOL</td>
                    <td className="px-6 py-4 font-mono text-sm">{slab.svfPrice} SVF</td>
                    <td className="px-6 py-4 font-mono text-sm">
                      {slab.estimatedValueUsd ? `$${slab.estimatedValueUsd}` : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/admin/slabs/${slab.id}/edit`}>Edit</a>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/marketplace/${slab.id}`} target="_blank" rel="noreferrer">
                            View
                          </a>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
