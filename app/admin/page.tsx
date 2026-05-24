import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AdminSyncPanel } from "@/components/admin-sync-panel";
import { AdminSchemaHealthPanel } from "@/components/admin-schema-health-panel";
import { AdminOpsDiagnosticsPanel } from "@/components/admin-ops-diagnostics-panel";
import { getSyncStatus } from "@/lib/data-sync";
import {
  getAdminSlabs,
  getAdminTransactions,
  isAdminApiConfigured,
} from "@/lib/admin-server";
import { getAdminOpsStatus } from "@/lib/admin-ops-status";
import { inspectSchemaHealth } from "@/lib/schema-health";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [slabs, transactionsResult, opsStatus, syncStatus] = await Promise.all([
    getAdminSlabs(),
    getAdminTransactions(),
    getAdminOpsStatus(),
    getSyncStatus(),
  ]);
  const schemaHealth = await inspectSchemaHealth();
  const transactions = transactionsResult.rows;
  const adminConfigured = isAdminApiConfigured();
  const dbConfigured = Boolean(process.env.DATABASE_URL?.trim());

  const availableSlabs = slabs.filter((s) => s.status === "AVAILABLE").length;
  const soldSlabs = slabs.filter((s) => s.status === "SOLD").length;

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
        {!dbConfigured ? (
          <p className="rounded-lg border border-line bg-vault-panel/60 px-4 py-3 text-sm text-muted">
            Set <code className="text-foreground">DATABASE_URL</code>, run{" "}
            <code className="text-foreground">npm run db:push</code> and{" "}
            <code className="text-foreground">npm run db:seed</code> for live
            listings. Marketplace still shows demo data from{" "}
            <code className="text-foreground">data/slabs.json</code> until then.
          </p>
        ) : null}
        {!adminConfigured ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-muted">
            Set <code className="text-foreground">ADMIN_PASSWORD</code> in env
            to protect write APIs.{" "}
            <Link href="/admin/login" className="text-vault-amber hover:underline">
              Admin login
            </Link>
          </p>
        ) : null}
        {transactionsResult.schemaWarning ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {transactionsResult.schemaWarning}
          </p>
        ) : null}
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
            ${transactions.reduce((sum, t) => sum + (t.totalUsdValue || 0), 0).toFixed(2)}
          </p>
        </Card>
      </div>

      <AdminSchemaHealthPanel report={schemaHealth} />
      <AdminOpsDiagnosticsPanel status={opsStatus} />

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
              transactions.slice(0, 5).map((tx) => (
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
                          : tx.status === "PENDING_FULFILLMENT"
                            ? "live"
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
              slabs.slice(0, 5).map((slab) => (
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

      <AdminSyncPanel initialStatus={syncStatus} />

      <Card className="space-y-4 p-6 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
        <h2 className="font-display text-xl font-semibold">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Button variant="outline" className="h-auto py-4" asChild>
            <a href="/admin/slabs/new">Add New Slab</a>
          </Button>
          <Button variant="outline" className="h-auto py-4" asChild>
            <a href="/admin/login">Admin Login</a>
          </Button>
          <Button variant="outline" className="h-auto py-4" asChild>
            <Link href="/trade">View Trade desk</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
