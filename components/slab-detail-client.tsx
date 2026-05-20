"use client";

import { useWallet } from "@solana/wallet-adapter-react";

import { WalletButton } from "@/components/wallet-button";
import { SlabImage } from "@/components/slab-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { MarketplaceSlab } from "@/lib/marketplace-slabs";

type Props = {
  slab: MarketplaceSlab;
};

export function SlabDetailClient({ slab }: Props) {
  const { publicKey } = useWallet();
  const isDemo = Boolean(slab.fallbackSource);

  const handlePurchase = async () => {
    if (isDemo) {
      alert(
        "Demo listing from data/slabs.json. Configure DATABASE_URL and add slabs in admin for live checkout.",
      );
      return;
    }

    if (!publicKey) {
      alert("Please connect your wallet to purchase");
      return;
    }

    try {
      const reserveResponse = await fetch("/api/marketplace/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slabId: slab.id,
          buyerWallet: publicKey.toString(),
        }),
      });

      if (!reserveResponse.ok) {
        const error = await reserveResponse.json();
        alert(error.error || "Failed to reserve slab");
        return;
      }

      const { transaction } = await reserveResponse.json();
      window.location.href = `/marketplace/checkout/${transaction.id}`;
    } catch (error) {
      console.error("Error initiating purchase:", error);
      alert("Failed to initiate purchase");
    }
  };

  return (
    <div className="space-y-6">
      {isDemo ? (
        <p className="rounded-lg border border-line bg-vault-panel/60 px-4 py-3 text-sm text-muted">
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
            <p className="text-lg text-muted">
              Acquired: {new Date(slab.acquiredAt).toLocaleDateString()}
            </p>
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
                <span className="text-muted">SVF Token Burn</span>
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
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Wallet Status</span>
              <WalletButton />
            </div>
            <Button
              onClick={handlePurchase}
              disabled={!isDemo && slab.status !== "AVAILABLE"}
              className="w-full text-lg py-6 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-vault-violet/30"
            >
              {isDemo
                ? "Preview listing (demo)"
                : slab.status === "AVAILABLE"
                  ? "Purchase Now"
                  : "Not Available"}
            </Button>
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
                <span className="text-muted">
                  {new Date(history.changedAt).toLocaleDateString()}
                </span>
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
