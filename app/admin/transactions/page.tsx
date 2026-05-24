import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FulfillmentActions } from "@/components/admin-fulfillment-actions";
import { getAdminTransactions } from "@/lib/admin-server";

export const dynamic = "force-dynamic";

type SearchParams = {
  status?: string;
  q?: string;
  action?: string;
};

const STATUS_FILTERS = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending payment" },
  { value: "PENDING_FULFILLMENT", label: "Needs fulfillment" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { status = "", q = "", action = "" } = await searchParams;
  const onlyNeedsAction = action === "needs-action";
  const { rows: transactions, schemaWarning } = await getAdminTransactions({
    status: status || undefined,
    query: q || undefined,
    onlyNeedsAction,
  });

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
      {schemaWarning ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {schemaWarning}
        </p>
      ) : null}

      <Card className="space-y-4 p-5 sm:p-6">
        <form className="grid gap-3 md:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span className="text-muted">Status</span>
            <select
              name="status"
              defaultValue={status}
              className="w-full rounded-md border border-line bg-vault-panel/40 px-3 py-2 text-sm"
            >
              {STATUS_FILTERS.map((filter) => (
                <option key={filter.value || "all"} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-muted">Search (tx id, wallet, slab)</span>
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="cuid / wallet / slab name"
              className="w-full rounded-md border border-line bg-vault-panel/40 px-3 py-2 text-sm"
            />
          </label>
          <label className="inline-flex items-center gap-2 pt-6 text-sm text-muted">
            <input
              type="checkbox"
              name="action"
              value="needs-action"
              defaultChecked={onlyNeedsAction}
              className="h-4 w-4 rounded border-line bg-vault-panel/40"
            />
            Needs action only
          </label>
          <div className="flex flex-wrap items-center gap-2 md:col-span-4">
            <button
              type="submit"
              className="rounded-md border border-line bg-vault-panel/50 px-4 py-2 text-sm font-medium transition hover:bg-vault-panel/70"
            >
              Apply filters
            </button>
            <a
              href="/admin/transactions"
              className="rounded-md border border-line px-4 py-2 text-sm text-muted transition hover:text-foreground"
            >
              Reset
            </a>
            <p className="text-xs text-muted">
              Showing <span className="font-mono text-foreground">{transactions.length}</span>{" "}
              transaction(s) with current filters.
            </p>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                <th className="px-6 py-4 text-left text-sm font-medium text-muted">Transaction ID</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted">Slab</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted">Buyer</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted">Split</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted">SOL</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted">SVF</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted">Status</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted">Date</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted">Recovery</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted">Fulfillment</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-muted">
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
                    <td className="px-6 py-4 text-xs">
                      {tx.paymentSplit === "SOL_80_SVF_20"
                        ? "80/20 split"
                        : "Fixed dual"}
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
                    <td className="px-6 py-4 text-xs text-muted">
                      <div className="space-y-1">
                        <a
                          href={`/vault/shop/checkout/${tx.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-foreground underline decoration-dotted underline-offset-2"
                        >
                          Open checkout
                        </a>
                        {tx.status === "PENDING" && tx.reservedExpiresAt ? (
                          <p>
                            Expires{" "}
                            <span className="font-mono text-foreground">
                              {new Date(tx.reservedExpiresAt).toLocaleString()}
                            </span>
                          </p>
                        ) : null}
                        {tx.status === "PENDING_FULFILLMENT" ? (
                          <p className="text-vault-mint">Ready for manual fulfillment.</p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <FulfillmentActions transactionId={tx.id} status={tx.status} />
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
