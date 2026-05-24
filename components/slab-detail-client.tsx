"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useMemo, useState } from "react";

import { WalletButton } from "@/components/wallet-button";
import { MarketplacePaymentSplit } from "@/components/marketplace-payment-split";
import { SlabImage } from "@/components/slab-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { marketplaceWrite } from "@/lib/marketplace-fetch";
import {
  getPendingCheckoutForWallet,
  savePendingCheckout,
} from "@/lib/marketplace-pending-checkout";
import type { MarketplaceSlab } from "@/lib/marketplace-slabs";
import type { PaymentSplit } from "@/lib/marketplace-split";
import { VAULT_ROUTES } from "@/lib/vault-routes";
import {
  MARKETPLACE_BUY_CTA,
  MARKETPLACE_RESUME_CTA,
} from "@/lib/platform-labels";
import { buildReserveChallengePayload } from "@/lib/wallet-reserve-challenge";

type Props = {
  slab: MarketplaceSlab;
};

type ReserveErrorPayload = {
  error?: string;
  code?: string;
  recoveryHint?: string;
};

export function SlabDetailClient({ slab }: Props) {
  const { publicKey, signMessage } = useWallet();
  const isDemo = Boolean(slab.fallbackSource);
  const [paymentSplit, setPaymentSplit] = useState<PaymentSplit>("FIXED_DUAL");
  const [message, setMessage] = useState<string | null>(null);
  const [reserving, setReserving] = useState(false);
  const walletAddress = publicKey?.toString() ?? null;
  const resumeCheckoutId = useMemo(
    () => getPendingCheckoutForWallet(slab.id, walletAddress),
    [walletAddress, slab.id],
  );
  const canResume = useMemo(
    () => Boolean(walletAddress && resumeCheckoutId),
    [walletAddress, resumeCheckoutId],
  );

  const handlePurchase = async () => {
    setMessage(null);

    if (isDemo) {
      setMessage(
        "Demo listing from data/slabs.json. Configure DATABASE_URL and add slabs in admin for live checkout.",
      );
      return;
    }

    if (!publicKey) {
      setMessage("Please connect your wallet to purchase.");
      return;
    }

    if (resumeCheckoutId) {
      window.location.href = VAULT_ROUTES.shopCheckout(resumeCheckoutId);
      return;
    }

    try {
      setReserving(true);

      const challengeResult = await buildReserveChallengePayload(
        publicKey.toString(),
        signMessage,
      );

      if (challengeResult && "error" in challengeResult) {
        setMessage(challengeResult.error);
        return;
      }

      const reserveResponse = await marketplaceWrite("/api/marketplace/reserve", {
        body: {
          slabId: slab.id,
          buyerWallet: publicKey.toString(),
          paymentSplit,
          ...(challengeResult ?? {}),
        },
      });

      if (!reserveResponse.ok) {
        const error = (await reserveResponse.json()) as ReserveErrorPayload;
        const base = error.error || "Failed to reserve slab";
        const hint = error.recoveryHint ? ` ${error.recoveryHint}` : "";
        if (error.code === "RESERVE_WALLET_CHALLENGE_REQUIRED") {
          setMessage(
            `${base}${hint} Use a wallet that supports message signing (Phantom or Solflare).`.trim(),
          );
          return;
        }
        setMessage(`${base}${hint}`.trim());
        return;
      }

      const { transaction, checkoutUrl } = (await reserveResponse.json()) as {
        transaction?: { id: string };
        checkoutUrl?: string;
      };
      const nextCheckoutUrl =
        checkoutUrl ||
        (transaction?.id ? VAULT_ROUTES.shopCheckout(transaction.id) : null);

      if (!nextCheckoutUrl) {
        setMessage("Checkout reservation succeeded but no checkout link was returned.");
        return;
      }

      if (transaction?.id) {
        savePendingCheckout(slab.id, transaction.id, publicKey.toString());
      }

      window.location.href = nextCheckoutUrl;
    } catch (error) {
      console.error("Error initiating purchase:", error);
      setMessage("Failed to start checkout. Please try again in a moment.");
    } finally {
      setReserving(false);
    }
  };

  return (
    <div className="space-y-6">
      {isDemo ? (
        <p
          className="rounded-lg border border-line bg-vault-panel/60 px-4 py-3 text-sm text-muted"
          role="status"
          aria-live="polite"
        >
          Demo listing from <code className="text-foreground">data/slabs.json</code>.
          Checkout requires a database-backed slab.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
          <SlabImage
            src={slab.imageUrl}
            alt={`${slab.name} ${slab.grade}`}
            className="aspect-square w-full"
            priority
          />
        </Card>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                {slab.name}
              </h1>
              <Badge variant="grade" className="shrink-0 text-lg">
                {slab.grade}
              </Badge>
            </div>
            <p className="text-lg text-muted">Acquired: {formatDate(slab.acquiredAt)}</p>
          </div>

          <Card className="space-y-4 p-6 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
            <h2 className="font-display text-xl font-semibold">Purchase Details</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-lg">
                <span className="text-muted">SOL Payment</span>
                <span className="font-mono font-semibold text-foreground">
                  {slab.solPrice} SOL
                </span>
              </div>
              <div className="flex items-center justify-between text-lg">
                <span className="text-muted">SVF Payment</span>
                <span className="font-mono font-semibold text-foreground">
                  {slab.svfPrice} SVF
                </span>
              </div>
              {slab.estimatedValueUsd != null ? (
                <div className="flex items-center justify-between text-lg">
                  <span className="text-muted">Est. Value</span>
                  <span className="font-mono font-semibold text-foreground">
                    ${slab.estimatedValueUsd}
                  </span>
                </div>
              ) : null}
            </div>
          </Card>

          <div className="space-y-4">
            <MarketplacePaymentSplit
              value={paymentSplit}
              onChange={setPaymentSplit}
              disabled={isDemo}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-muted">Wallet Status</span>
              <WalletButton />
            </div>
            {message ? (
              <p
                className="rounded-md border border-line bg-vault-panel/40 px-3 py-2 text-sm text-muted"
                role="status"
                aria-live="polite"
              >
                {message}
              </p>
            ) : null}
            {canResume ? (
              <p
                className="rounded-md border border-vault-mint/40 bg-vault-mint/10 px-3 py-2 text-sm text-vault-mint"
                role="status"
                aria-live="polite"
              >
                A pending checkout for this slab was found in this browser wallet session.
                Continue to avoid losing your reservation window.
              </p>
            ) : null}
            <Button
              onClick={handlePurchase}
              disabled={reserving || (!isDemo && !canResume && slab.status !== "AVAILABLE")}
              aria-busy={reserving}
              className="w-full text-lg py-6 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-vault-violet/30"
              data-growth-event={
                canResume ? "cta_resume_checkout" : "cta_start_purchase"
              }
              data-growth-context={`marketplace_listing:${slab.id}`}
            >
              {reserving
                ? "Preparing checkout..."
                : isDemo
                ? "Preview listing (demo)"
                : canResume
                  ? MARKETPLACE_RESUME_CTA
                : slab.status === "AVAILABLE"
                  ? MARKETPLACE_BUY_CTA
                  : "Not available"}
            </Button>
            <p className="text-xs text-muted">
              Reservations are short-lived. Complete checkout in one session to avoid
              timing out.
            </p>
          </div>
        </div>
      </div>

      <Card className="space-y-4 p-6 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
        <h2 className="font-display text-xl font-semibold">External Links</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="outline" asChild className="transition-all duration-300 hover:scale-105">
            <a href={slab.vaultedUrl} target="_blank" rel="noreferrer">
              View on Vaulted
            </a>
          </Button>
          {slab.collectrUrl ? (
            <Button variant="outline" asChild className="transition-all duration-300 hover:scale-105">
              <a href={slab.collectrUrl} target="_blank" rel="noreferrer">
                View on Collectr
              </a>
            </Button>
          ) : null}
        </div>
      </Card>

      {slab.pricingHistory && slab.pricingHistory.length > 0 ? (
        <Card className="space-y-4 p-6 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
          <h2 className="font-display text-xl font-semibold">Pricing History</h2>
          <div className="space-y-2">
            {slab.pricingHistory.map((history) => (
              <div
                key={history.id}
                className="flex items-center justify-between text-sm border-b border-line py-2 last:border-0"
              >
                <span className="text-muted">{formatDate(history.changedAt)}</span>
                <div className="flex gap-4">
                  <span className="font-mono">{history.solPrice} SOL</span>
                  <span className="font-mono">{history.svfPrice} SVF</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
