"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import { PageLoadingCard } from "@/components/page-loading-card";
import { SlabImage } from "@/components/slab-image";
import { WalletButton } from "@/components/wallet-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { getMarketplaceOrderStatusLabel } from "@/lib/marketplace-order-labels";
import { buildTransactionStatusAccessQuery } from "@/lib/wallet-transaction-access-client";
import { VAULT_ROUTES } from "@/lib/vault-routes";

type OrderData = {
  id: string;
  status: string;
  buyerWallet: string;
  solAmount: number;
  svfAmount: number;
  totalUsdValue: number | null;
  paymentSplit?: "FIXED_DUAL" | "SOL_80_SVF_20";
  reservedExpiresAt?: string | null;
  createdAt?: string;
  completedAt?: string | null;
  fulfilledAt?: string | null;
  transactionSignature?: string | null;
  burnSignature?: string | null;
  fulfillmentSignature?: string | null;
  slab: {
    id: string;
    name: string;
    grade: string;
    imageUrl: string;
    estimatedValueUsd?: number | null;
  } | null;
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

export function MarketplaceOrderStatus({
  transactionId,
}: {
  transactionId: string;
}) {
  const { publicKey, signMessage } = useWallet();
  const walletAddress = publicKey?.toBase58() ?? null;
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    const query = walletAddress
      ? await buildTransactionStatusAccessQuery(
          transactionId,
          walletAddress,
          signMessage,
        )
      : "";
    const url = `/api/marketplace/status/${transactionId}${
      query ? `?${query}` : ""
    }`;
    const response = await fetch(url);

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
      const message = payload.error ?? "Unable to load order status.";
      setError(
        payload.recoveryHint ? `${message} ${payload.recoveryHint}` : message,
      );
      setOrder(null);
      return;
    }

    const data = (await response.json()) as OrderData;
    setError(null);
    setOrder({
      ...data,
      solAmount: toNum(data.solAmount),
      svfAmount: toNum(data.svfAmount),
      totalUsdValue:
        data.totalUsdValue == null ? null : toNum(data.totalUsdValue),
    });
  }, [transactionId, walletAddress, signMessage]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        await fetchOrder();
      } catch {
        setError("Unable to load order status. Try again in a moment.");
        setOrder(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [fetchOrder]);

  const refresh = async () => {
    setRefreshing(true);
    await fetchOrder();
    setRefreshing(false);
  };

  const walletMismatch =
    Boolean(order?.buyerWallet) &&
    Boolean(walletAddress) &&
    order?.buyerWallet !== walletAddress;

  const canCheckout =
    order?.status === "PENDING" &&
    walletAddress &&
    order.buyerWallet === walletAddress;

  if (loading) {
    return (
      <PageLoadingCard
        title="Loading order"
        description="Fetching your marketplace purchase status."
      />
    );
  }

  if (!order) {
    return (
      <Card className="space-y-4 p-8 text-center sm:p-12" role="status" aria-live="polite">
        <h1 className="font-display text-2xl font-semibold">Order not found</h1>
        <p className="text-muted">
          {error ?? "This order link is invalid or has expired."}
        </p>
        <Button asChild>
          <Link href={VAULT_ROUTES.shop}>Back to Shop</Link>
        </Button>
      </Card>
    );
  }

  const expiresAt = order.reservedExpiresAt
    ? new Date(order.reservedExpiresAt)
    : null;

  return (
    <div className="space-y-8">
      <header className="page-header flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Order status
          </h1>
          <p className="max-w-prose text-sm text-muted sm:text-base">
            Track reservation and fulfillment for your marketplace purchase.
          </p>
        </div>
        <WalletButton />
      </header>

      {!walletAddress ? (
        <p className="rounded-lg border border-line bg-vault-panel/40 px-4 py-3 text-sm text-muted">
          Connect the wallet used at checkout to view payment signatures and continue
          a pending reservation.
        </p>
      ) : null}

      {walletMismatch ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          This order belongs to{" "}
          <span className="font-mono text-amber-50">{order.buyerWallet}</span>. Switch
          wallets to view full buyer details.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        {order.slab ? (
          <Card className="overflow-hidden bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
            <SlabImage
              src={order.slab.imageUrl}
              alt={`${order.slab.name} ${order.slab.grade}`}
              className="aspect-[4/3] w-full lg:aspect-square"
            />
          </Card>
        ) : null}

        <Card className="space-y-5 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">
              {order.slab?.name ?? "Marketplace order"}
            </h2>
            <Badge
              variant={
                order.status === "COMPLETED"
                  ? "default"
                  : order.status === "PENDING_FULFILLMENT"
                    ? "live"
                    : order.status === "PENDING"
                      ? "secondary"
                      : "outline"
              }
            >
              {getMarketplaceOrderStatusLabel(order.status)}
            </Badge>
          </div>

          {order.slab ? (
            <p className="text-muted">
              Grade <span className="font-mono text-foreground">{order.slab.grade}</span>
            </p>
          ) : null}

          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Order ID</dt>
              <dd className="font-mono text-foreground">{order.id}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">SOL</dt>
              <dd className="font-mono">{order.solAmount} SOL</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">SVF</dt>
              <dd className="font-mono">{order.svfAmount} SVF</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Payment mode</dt>
              <dd>
                {order.paymentSplit === "SOL_80_SVF_20"
                  ? "80/20 weighted split"
                  : "Fixed listing split"}
              </dd>
            </div>
            {order.createdAt ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Created</dt>
                <dd>{formatDate(order.createdAt)}</dd>
              </div>
            ) : null}
            {expiresAt && order.status === "PENDING" ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Reservation expires</dt>
                <dd className="font-mono">{expiresAt.toLocaleString()}</dd>
              </div>
            ) : null}
            {order.completedAt ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Paid at</dt>
                <dd>{formatDate(order.completedAt)}</dd>
              </div>
            ) : null}
            {order.fulfilledAt ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Fulfilled</dt>
                <dd>{formatDate(order.fulfilledAt)}</dd>
              </div>
            ) : null}
          </dl>

          {order.transactionSignature && walletAddress === order.buyerWallet ? (
            <div className="space-y-2 rounded-lg border border-line bg-vault-panel/30 p-4 text-xs">
              <p className="text-muted">On-chain references</p>
              <p className="break-all font-mono text-foreground">
                SOL: {order.transactionSignature}
              </p>
              {order.burnSignature ? (
                <p className="break-all font-mono text-foreground">
                  SVF: {order.burnSignature}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={refresh}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh status"}
            </Button>
            {canCheckout ? (
              <Button asChild>
                <Link href={VAULT_ROUTES.shopCheckout(order.id)}>
                  Continue checkout
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" asChild>
              <Link href={VAULT_ROUTES.shop}>Back to shop</Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
