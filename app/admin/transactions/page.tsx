import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FulfillmentActions } from "@/components/admin-fulfillment-actions";
import { getAdminTransactions, isAdminApiConfigured } from "@/lib/admin-server";

export const dynamic = "force-dynamic";

export default async function AdminTransactionsPage() {
  const transactions = await getAdminTransactions();
  const adminConfigured = isAdminApiConfigured();

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-5 sm:py-16">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Admin", href: "/admin" },
          { label: "Transactions", href: "/admin/transactions" },
        ]}
      />

      <div className="space-y-4">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Transaction History
        </h1>
        <p className="text-lg text-muted">
          View marketplace payments and mark slab fulfillment complete after
          transferring from the deployer vault (slabvault.sol).
        </p>
      </div>

      <Card className="overflow-hidden bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                <th className="px-6 py-4 text-left text-sm font-medium text-muted">Transaction ID</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted">Slab</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted">Buyer</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted">SOL</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted">SVF</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted">Status</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted">Date</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted">Fulfillment</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted">
                    No transactions found yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-line hover:bg-vault-panel/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm">
                      {tx.id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{tx.slab?.name || "Unknown"}</div>
                      <div className="text-xs text-muted">{tx.slab?.grade || ""}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">
                      {tx.buyerWallet.slice(0, 4)}...{tx.buyerWallet.slice(-4)}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">{tx.solAmount} SOL</td>
                    <td className="px-6 py-4 font-mono text-sm">{tx.svfAmount} SVF</td>
                    <td className="px-6 py-4">
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
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <FulfillmentActions
                        transactionId={tx.id}
                        status={tx.status}
                        adminPasswordConfigured={adminConfigured}
                      />
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
