import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";

async function getAdminData() {
  try {
    const [slabsResponse, transactionsResponse] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/admin/slabs`, {
        cache: "no-store",
      }),
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/admin/transactions`, {
        cache: "no-store",
      }),
    ]);

    const slabs = slabsResponse.ok ? await slabsResponse.json() : [];
    const transactions = transactionsResponse.ok ? await transactionsResponse.json() : [];

    return { slabs, transactions };
  } catch (error) {
    console.error("Error fetching admin data:", error);
    return { slabs: [], transactions: [] };
  }
}

export default async function AdminPage() {
  const { slabs, transactions } = await getAdminData();

  const availableSlabs = slabs.filter((s: { status: string }) => s.status === "AVAILABLE").length;
  const soldSlabs = slabs.filter((s: { status: string }) => s.status === "SOLD").length;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-5 sm:py-16">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Admin", href: "/admin" },
        ]}
      />

      <div className="space-y-4">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Admin Dashboard
        </h1>
        <p className="text-lg text-muted">
          Manage vault listings, pricing, and transactions.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="space-y-2 p-6 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
          <p className="text-sm font-medium text-muted">Total Slabs</p>
          <p className="font-display text-3xl font-semibold text-foreground">{slabs.length}</p>
        </Card>
        <Card className="space-y-2 p-6 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
          <p className="text-sm font-medium text-muted">Available</p>
          <p className="font-display text-3xl font-semibold text-vault-mint">{availableSlabs}</p>
        </Card>
        <Card className="space-y-2 p-6 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
          <p className="text-sm font-medium text-muted">Sold</p>
          <p className="font-display text-3xl font-semibold text-vault-amber">{soldSlabs}</p>
        </Card>
        <Card className="space-y-2 p-6 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
          <p className="text-sm font-medium text-muted">Total Revenue</p>
          <p className="font-display text-3xl font-semibold text-foreground">
            ${transactions.reduce((sum: number, t: { totalUsdValue?: number }) => sum + (t.totalUsdValue || 0), 0).toFixed(2)}
          </p>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="space-y-4 p-6 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Recent Transactions</h2>
            <Badge variant="secondary">{transactions.length} total</Badge>
          </div>
          <div className="space-y-2">
            {transactions.length === 0 ? (
              <p className="text-sm text-muted">No transactions yet</p>
            ) : (
              transactions.slice(0, 5).map((tx: { id: string; slab?: { name: string; grade?: string }; buyerWallet: string; status: string; createdAt: string | Date; solAmount?: number; svfAmount?: number }) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg border border-line p-3"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{tx.slab?.name || "Unknown"}</p>
                    <p className="text-xs text-muted">
                      {tx.buyerWallet.slice(0, 4)}...{tx.buyerWallet.slice(-4)}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge
                      variant={
                        tx.status === "COMPLETED"
                          ? "default"
                          : tx.status === "PENDING"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {tx.status}
                    </Badge>
                    <p className="text-xs text-muted">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <Button variant="outline" className="w-full" asChild>
            <a href="/admin/transactions">View All Transactions</a>
          </Button>
        </Card>

        <Card className="space-y-4 p-6 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Slab Listings</h2>
            <Badge variant="secondary">{slabs.length} total</Badge>
          </div>
          <div className="space-y-2">
            {slabs.length === 0 ? (
              <p className="text-sm text-muted">No slabs listed</p>
            ) : (
              slabs.slice(0, 5).map((slab: { id: string; name: string; grade: string; status: string; solPrice: number }) => (
                <div
                  key={slab.id}
                  className="flex items-center justify-between rounded-lg border border-line p-3"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{slab.name}</p>
                    <p className="text-xs text-muted">{slab.grade}</p>
                  </div>
                  <div className="text-right space-y-1">
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
                    <p className="text-xs font-mono text-muted">
                      {slab.solPrice} SOL
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <Button variant="outline" className="w-full" asChild>
            <a href="/admin/slabs">Manage Slabs</a>
          </Button>
        </Card>
      </div>

      <Card className="space-y-4 p-6 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
        <h2 className="font-display text-xl font-semibold">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Button variant="outline" className="h-auto py-4" asChild>
            <a href="/admin/slabs/new">Add New Slab</a>
          </Button>
          <Button variant="outline" className="h-auto py-4" asChild>
            <a href="/admin/pricing">Update Pricing</a>
          </Button>
          <Button variant="outline" className="h-auto py-4" asChild>
            <a href="/admin/analytics">View Analytics</a>
          </Button>
        </div>
      </Card>
    </div>
  );
}
