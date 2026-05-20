"use client";

import Link from "next/link";

import { use, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlabImage } from "@/components/slab-image";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { WalletButton } from "@/components/wallet-button";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";

type TransactionData = {
  id: string;
  slab: {
    id: string;
    name: string;
    grade: string;
    imageUrl: string;
    estimatedValueUsd: number;
  };
  solAmount: number;
  svfAmount: number;
  totalUsdValue: number;
  status: string;
  buyerWallet: string;
};

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { publicKey, sendTransaction } = useWallet();
  const [transaction, setTransaction] = useState<TransactionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<"sol" | "svf" | "complete">("sol");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTransaction() {
      try {
        const response = await fetch(`/api/marketplace/status/${id}`);
        if (!response.ok) throw new Error("Failed to fetch transaction");
        const data = await response.json();
        setTransaction(data);
        
        if (data.status === "COMPLETED") {
          setStep("complete");
        }
      } catch {
        setError("Failed to load transaction details");
      } finally {
        setLoading(false);
      }
    }

    fetchTransaction();
  }, [id]);

  const handleSolPayment = async () => {
    if (!publicKey || !transaction) return;

    setProcessing(true);
    setError(null);

    try {
      const connection = new Connection(process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com");
      
      // Create SOL transfer transaction
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey("2oRZe7z9Jx3rpoUWuidjGhpX9mxxhtps2JqQtdxLfHwg"), // Treasury wallet
          lamports: transaction.solAmount * 1_000_000_000, // Convert SOL to lamports
        })
      );

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature);

      setStep("svf");
    } catch {
      setError("Failed to process SOL payment");
    } finally {
      setProcessing(false);
    }
  };

  const handleSvfBurn = async () => {
    if (!publicKey || !transaction) return;

    setProcessing(true);
    setError(null);

    try {
      // In a real implementation, this would interact with the token burn smart contract
      // For now, we'll simulate the burn
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Complete the transaction
      const response = await fetch("/api/marketplace/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: transaction.id,
          transactionSignature: "simulated_sol_signature",
          burnSignature: "simulated_burn_signature",
        }),
      });

      if (!response.ok) throw new Error("Failed to complete transaction");

      setStep("complete");
    } catch {
      setError("Failed to burn SVF tokens");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-5 sm:py-16">
        <div className="text-center">
          <p className="text-lg text-muted">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-5 sm:py-16">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Marketplace", href: "/marketplace" },
            { label: "Checkout", href: "#" },
          ]}
        />
        <Card className="p-12 text-center">
          <h1 className="font-display text-2xl font-semibold">Transaction Not Found</h1>
          <p className="mt-2 text-muted">
            The transaction you&apos;re looking for doesn&apos;t exist.
          </p>
        </Card>
      </div>
    );
  }

  if (step === "complete") {
    return (
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-5 sm:py-16">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Marketplace", href: "/marketplace" },
            { label: "Checkout", href: "#" },
          ]}
        />
        <Card className="space-y-6 p-12 text-center bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-vault-amber/20">
            <svg
              className="h-10 w-10 text-vault-amber"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="font-display text-3xl font-semibold">Purchase Complete!</h1>
          <p className="text-lg text-muted">
            You&apos;ve successfully purchased {transaction.slab.name} ({transaction.slab.grade}).
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild className="transition-all duration-300 hover:scale-105">
              <Link href="/marketplace">Back to Marketplace</Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="transition-all duration-300 hover:scale-105"
            >
              <Link href="/vault">View Your Vault</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-5 sm:py-16">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Marketplace", href: "/marketplace" },
          { label: "Checkout", href: "#" },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card className="overflow-hidden bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
            <SlabImage
              src={transaction.slab.imageUrl}
              alt={`${transaction.slab.name} ${transaction.slab.grade}`}
              className="aspect-square w-full"
            />
          </Card>

          <Card className="space-y-4 p-6 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
            <h2 className="font-display text-xl font-semibold">Purchase Summary</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted">Item</span>
                <span className="font-semibold">{transaction.slab.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Grade</span>
                <Badge variant="grade">{transaction.slab.grade}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">SOL Payment</span>
                <span className="font-mono font-semibold">{transaction.solAmount} SOL</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">SVF Token Burn</span>
                <span className="font-mono font-semibold">{transaction.svfAmount} SVF</span>
              </div>
              {transaction.totalUsdValue && (
                <div className="flex items-center justify-between border-t border-line pt-3">
                  <span className="text-muted">Total Value</span>
                  <span className="font-mono font-semibold">${transaction.totalUsdValue}</span>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-6 p-6 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">Payment Steps</h2>
              <WalletButton />
            </div>

            <div className="space-y-4">
              <div
                className={`flex items-center gap-4 rounded-lg border p-4 transition-all ${
                  step === "sol"
                    ? "border-vault-amber bg-vault-amber/10"
                    : step === "svf"
                    ? "border-vault-mint bg-vault-mint/10"
                    : "border-line opacity-50"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    step === "sol"
                      ? "bg-vault-amber text-vault-void"
                      : step === "svf"
                      ? "bg-vault-mint text-vault-void"
                      : "bg-muted text-muted"
                  }`}
                >
                  {step === "sol" ? "1" : step === "svf" ? "✓" : "1"}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Pay SOL</h3>
                  <p className="text-sm text-muted">
                    Transfer {transaction.solAmount} SOL to treasury
                  </p>
                </div>
              </div>

              <div
                className={`flex items-center gap-4 rounded-lg border p-4 transition-all ${
                  step === "svf"
                    ? "border-vault-amber bg-vault-amber/10"
                    : (step as string) === "complete"
                    ? "border-vault-mint bg-vault-mint/10"
                    : "border-line opacity-50"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    step === "svf"
                      ? "bg-vault-amber text-vault-void"
                      : (step as string) === "complete"
                      ? "bg-vault-mint text-vault-void"
                      : "bg-muted text-muted"
                  }`}
                >
                  {step === "svf" ? "2" : (step as string) === "complete" ? "✓" : "2"}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Burn SVF Tokens</h3>
                  <p className="text-sm text-muted">
                    Burn {transaction.svfAmount} SVF tokens
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            {step === "sol" && (
              <Button
                onClick={handleSolPayment}
                disabled={!publicKey || processing}
                className="w-full text-lg py-6 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-vault-violet/30"
              >
                {processing ? "Processing..." : "Pay SOL"}
              </Button>
            )}

            {step === "svf" && (
              <Button
                onClick={handleSvfBurn}
                disabled={processing}
                className="w-full text-lg py-6 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-violet/30"
              >
                {processing ? "Burning Tokens..." : "Burn SVF Tokens"}
              </Button>
            )}

            <div className="space-y-2 text-sm text-muted">
              <p>• Split payment: SOL + SVF token burn</p>
              <p>• SVF tokens are permanently burned</p>
              <p>• Transaction is recorded on-chain</p>
              <p>• Slab ownership transferred upon completion</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
