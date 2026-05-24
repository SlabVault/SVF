"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { PageLoadingCard } from "@/components/page-loading-card";
import { SlabImage } from "@/components/slab-image";
import { WalletButton } from "@/components/wallet-button";
import { formatDate } from "@/lib/format";
import { getMarketplaceOrderStatusLabel } from "@/lib/marketplace-order-labels";
import { buildTransactionsListAccessQuery } from "@/lib/wallet-transaction-access-client";
import { VAULT_ROUTES } from "@/lib/vault-routes";

type PurchaseSlab = {
  id: string;
  name: string;
  grade: string;
  imageUrl: string;
};

type Purchase = {
  id: string;
  status: string;
  solAmount: number;
  svfAmount: number;
  totalUsdValue: number | null;
  createdAt: string;
  completedAt: string | null;
  reservedExpiresAt: string | null;
  slab: PurchaseSlab | null;
};

type ApiErrorPayload = {
  error?: string;
  recoveryHint?: string;
  code?: string;
};

function toNum(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  return Number(value);
}

function statusBadgeVariant(
  status: string,
): "default" | "live" | "secondary" | "outline" {
  switch (status) {
    case "COMPLETED":
      return "default";
    case "PENDING_FULFILLMENT":
      return "live";
    case "PENDING":
      return "secondary";
    default:
      return "outline";
  }
}

export function MarketplacePurchasesClient() {
  const { publicKey, signMessage } = useWallet();
  const walletAddress = publicKey?.toBase58() ?? null;
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchPurchases = useCallback(async () => {
    if (!walletAddress) {
      setPurchases([]);
      setError(null);
      return;
    }

    const query = await buildTransactionsListAccessQuery(
      walletAddress,
      signMessage,
    );
    const response = await fetch(`/api/marketplace/transactions?${query}`);

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
      const message = payload.error ?? "Unable to load your purchases.";
      setError(
        payload.recoveryHint ? `${message} ${payload.recoveryHint}` : message,
      );
      setPurchases([]);
      return;
    }

    const data = (await response.json()) as Array<
      Omit<Purchase, "solAmount" | "svfAmount" | "totalUsdValue"> & {
        solAmount: unknown;
        svfAmount: unknown;
        totalUsdValue: unknown;
      }
    >;

    setError(null);
    setPurchases(
      data.map((tx) => ({
        ...tx,
        solAmount: toNum(tx.solAmount),
        svfAmount: toNum(tx.svfAmount),
        totalUsdValue:
          tx.totalUsdValue == null ? null : toNum(tx.totalUsdValue),
      })),
    );
  }, [walletAddress, signMessage]);

  useEffect(() => {
    async function load() {
      if (!walletAddress) {
        setPurchases([]);
        setError(null);
        setHasLoaded(true);
        return;
      }

      setLoading(true);
      try {
        await fetchPurchases();
      } catch {
        setError("Unable to load your purchases. Try again in a moment.");
        setPurchases([]);
      } finally {
        setLoading(false);
        setHasLoaded(true);
      }
    }

    load();
  }, [fetchPurchases, walletAddress]);

  const refresh = async () => {
    setRefreshing(true);
    await fetchPurchases();
    setRefreshing(false);
  };

  if (!walletAddress) {
    return (
      <EmptyState
        title="Connect your wallet"
        description="Link the Solana wallet you used at checkout to view reservation and fulfillment status for your marketplace purchases."
      >
        <WalletButton />
        <Button variant="outline" asChild>
          <Link href={VAULT_ROUTES.shop}>Browse vault shop</Link>
        </Button>
      </EmptyState>
    );
  }

  if (loading && !hasLoaded) {
    return (
      <PageLoadingCard
        title="Loading purchases"
        description="Fetching your marketplace order history."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Showing orders for{" "}
          <span className="font-mono text-foreground">{walletAddress}</span>
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={refresh}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {purchases.length === 0 ? (
        <EmptyState
          title="No purchases yet"
          description="When you reserve or buy a slab from the marketplace, your orders will appear here with live status updates."
        >
          <Button asChild>
            <Link href={VAULT_ROUTES.shop}>Browse vault shop</Link>
          </Button>
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {purchases.map((purchase) => (
            <li key={purchase.id}>
              <Card className="overflow-hidden bg-gradient-to-br from-vault-panel/50 to-vault-deep/50 transition-colors hover:border-vault-amber/30">
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                  {purchase.slab ? (
                    <Link
                      href={VAULT_ROUTES.purchaseOrder(purchase.id)}
                      className="relative block aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg bg-vault-deep sm:aspect-square sm:w-28"
                    >
                      <SlabImage
                        src={purchase.slab.imageUrl}
                        alt={`${purchase.slab.name} ${purchase.slab.grade}`}
                        className="h-full w-full"
                      />
                    </Link>
                  ) : null}

                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h2 className="font-heading text-lg font-semibold leading-tight">
                          <Link
                            href={VAULT_ROUTES.purchaseOrder(purchase.id)}
                            className="hover:text-vault-amber"
                          >
                            {purchase.slab?.name ?? "Marketplace order"}
                          </Link>
                        </h2>
                        {purchase.slab ? (
                          <p className="text-sm text-muted">
                            Grade{" "}
                            <span className="font-mono text-foreground">
                              {purchase.slab.grade}
                            </span>
                          </p>
                        ) : null}
                      </div>
                      <Badge variant={statusBadgeVariant(purchase.status)}>
                        {getMarketplaceOrderStatusLabel(purchase.status)}
                      </Badge>
                    </div>

                    <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <dt className="text-muted">SOL</dt>
                        <dd className="font-mono">{purchase.solAmount} SOL</dd>
                      </div>
                      <div>
                        <dt className="text-muted">SVF</dt>
                        <dd className="font-mono">{purchase.svfAmount} SVF</dd>
                      </div>
                      <div>
                        <dt className="text-muted">Ordered</dt>
                        <dd>{formatDate(purchase.createdAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">Order ID</dt>
                        <dd className="truncate font-mono text-xs">
                          {purchase.id}
                        </dd>
                      </div>
                    </dl>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button size="sm" asChild>
                        <Link href={VAULT_ROUTES.purchaseOrder(purchase.id)}>
                          View order
                        </Link>
                      </Button>
                      {purchase.status === "PENDING" ? (
                        <Button size="sm" variant="secondary" asChild>
                          <Link href={VAULT_ROUTES.shopCheckout(purchase.id)}>
                            Continue checkout
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
