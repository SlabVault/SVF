import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";

async function getTransactions() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/admin/transactions`, {
      cache: "no-store",
    });
    if (!response.ok) return [];
    return response.json();
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
}

export default async function AdminTransactionsPage() {
  const transactions = await getTransactions();

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
          View and manage all marketplace transactions.
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
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted">
                    No transactions found yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx: { id: string; slab?: { name: string; grade?: string }; buyerWallet: string; status: string; createdAt: string | Date; solAmount: number; svfAmount: number }) => (
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
