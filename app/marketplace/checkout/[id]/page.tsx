"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  getMintDecimals,
} from "@/lib/spl-token-lite";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlabImage } from "@/components/slab-image";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { WalletButton } from "@/components/wallet-button";
import { solToLamports } from "@/lib/marketplace-config";

type PaymentConfig = {
  treasuryWallet: string;
  deployerWallet: string;
  svfTokenMint: string;
  rpcUrl: string;
  autoFulfillmentEnabled: boolean;
};

type TransactionData = {
  id: string;
  slab: {
    id: string;
    name: string;
    grade: string;
    imageUrl: string;
    estimatedValueUsd: number | null;
  };
  solAmount: number;
  svfAmount: number;
  totalUsdValue: number | null;
  status: string;
  buyerWallet: string;
  transactionSignature?: string | null;
  burnSignature?: string | null;
  fulfillmentMessage?: string;
};

function toNum(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  return Number(value);
}

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { publicKey, sendTransaction } = useWallet();
  const [transaction, setTransaction] = useState<TransactionData | null>(null);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<"sol" | "svf" | "complete">("sol");
  const [solSignature, setSolSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fulfillmentNote, setFulfillmentNote] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [txRes, configRes] = await Promise.all([
          fetch(`/api/marketplace/status/${id}`),
          fetch("/api/marketplace/config"),
        ]);

        if (!txRes.ok) throw new Error("Failed to fetch transaction");
        const data = await txRes.json();
        setTransaction({
          ...data,
          solAmount: toNum(data.solAmount ?? data.slab?.solPrice),
          svfAmount: toNum(data.svfAmount ?? data.slab?.svfPrice),
          totalUsdValue:
            data.totalUsdValue == null ? null : toNum(data.totalUsdValue),
        });

        if (configRes.ok) {
          setConfig(await configRes.json());
        }

        if (
          data.status === "COMPLETED" ||
          data.status === "PENDING_FULFILLMENT"
        ) {
          setStep("complete");
          if (data.fulfillmentMessage) {
            setFulfillmentNote(data.fulfillmentMessage);
          }
        } else if (data.transactionSignature) {
          setSolSignature(data.transactionSignature);
          setStep("svf");
        }
      } catch {
        setError("Failed to load transaction details");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  const getConnection = useCallback(() => {
    const rpc =
      config?.rpcUrl ||
      process.env.NEXT_PUBLIC_SOLANA_RPC ||
      "https://api.mainnet-beta.solana.com";
    return new Connection(rpc, "confirmed");
  }, [config]);

  const handleSolPayment = async () => {
    if (!publicKey || !transaction || !config) return;

    setProcessing(true);
    setError(null);

    try {
      const connection = getConnection();
      const treasury = new PublicKey(config.treasuryWallet);
      const lamports = solToLamports(transaction.solAmount);

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: treasury,
          lamports,
        }),
      );

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      setSolSignature(signature);
      setStep("svf");
    } catch (err) {
      console.error(err);
      setError("Failed to process SOL payment. Check balance and try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleSvfPayment = async () => {
    if (!publicKey || !transaction || !config || !solSignature) return;

    setProcessing(true);
    setError(null);

    try {
      const connection = getConnection();
      const mint = new PublicKey(config.svfTokenMint);
      const treasury = new PublicKey(config.treasuryWallet);

      const buyerAta = getAssociatedTokenAddressSync(mint, publicKey);
      const treasuryAta = getAssociatedTokenAddressSync(mint, treasury);

      const decimals = await getMintDecimals(connection, mint);
      const rawAmount = BigInt(
        Math.floor(transaction.svfAmount * Math.pow(10, decimals)),
      );

      const tx = new Transaction();

      const treasuryAtaInfo = await connection.getAccountInfo(treasuryAta);
      if (!treasuryAtaInfo) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            treasuryAta,
            treasury,
            mint,
          ),
        );
      }

      tx.add(
        createTransferInstruction(
          buyerAta,
          treasuryAta,
          publicKey,
          rawAmount,
        ),
      );

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const burnSignature = await sendTransaction(tx, connection);
      await connection.confirmTransaction({
        signature: burnSignature,
        blockhash,
        lastValidBlockHeight,
      });

      const response = await fetch("/api/marketplace/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: transaction.id,
          transactionSignature: solSignature,
          burnSignature,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to complete checkout");
      }

      if (result.fulfillmentMessage) {
        setFulfillmentNote(result.fulfillmentMessage);
      }

      setTransaction((prev) =>
        prev
          ? {
              ...prev,
              status: result.status ?? "PENDING_FULFILLMENT",
            }
          : prev,
      );
      setStep("complete");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to transfer SVF tokens to treasury",
      );
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
          <h1 className="font-display text-2xl font-semibold">
            Transaction Not Found
          </h1>
          <p className="mt-2 text-muted">
            The transaction you&apos;re looking for doesn&apos;t exist.
          </p>
        </Card>
      </div>
    );
  }

  if (step === "complete") {
    const pendingFulfillment =
      transaction.status === "PENDING_FULFILLMENT" ||
      fulfillmentNote?.includes("pending");

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
          <h1 className="font-display text-3xl font-semibold">
            {pendingFulfillment ? "Payment Received!" : "Purchase Complete!"}
          </h1>
          <p className="text-lg text-muted">
            You&apos;ve purchased {transaction.slab.name} ({transaction.slab.grade}).
          </p>
          {pendingFulfillment || fulfillmentNote ? (
            <p className="mx-auto max-w-lg rounded-lg border border-line bg-vault-panel/60 px-4 py-3 text-sm text-muted">
              {fulfillmentNote ||
                "Slab transfer from the deployer vault (slabvault.sol) is pending. You will receive the slab once fulfillment is complete."}
            </p>
          ) : null}
          <div className="flex justify-center gap-4">
            <Button asChild className="transition-all duration-300 hover:scale-105">
              <Link href="/marketplace">Back to Marketplace</Link>
            </Button>
            <Button variant="outline" asChild className="transition-all duration-300 hover:scale-105">
              <Link href="/vault">View Vault</Link>
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
                <span className="font-mono font-semibold">
                  {transaction.solAmount} SOL
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">SVF Payment</span>
                <span className="font-mono font-semibold">
                  {transaction.svfAmount} SVF
                </span>
              </div>
              {transaction.totalUsdValue != null ? (
                <div className="flex items-center justify-between border-t border-line pt-3">
                  <span className="text-muted">Total Value</span>
                  <span className="font-mono font-semibold">
                    ${transaction.totalUsdValue}
                  </span>
                </div>
              ) : null}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-6 p-6 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">Payment Steps</h2>
              <WalletButton />
            </div>

            {!publicKey ? (
              <p className="text-sm text-muted">
                Connect your Phantom (or other Solana) wallet to continue.
              </p>
            ) : null}

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
                      : "bg-vault-mint text-vault-void"
                  }`}
                >
                  {step === "svf" ? "✓" : "1"}
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
                    : "border-line opacity-50"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    step === "svf"
                      ? "bg-vault-amber text-vault-void"
                      : "bg-muted text-muted"
                  }`}
                >
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Pay SVF Tokens</h3>
                  <p className="text-sm text-muted">
                    Transfer {transaction.svfAmount} SVF to treasury
                  </p>
                </div>
              </div>
            </div>

            {error ? (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            ) : null}

            {step === "sol" ? (
              <Button
                onClick={handleSolPayment}
                disabled={!publicKey || !config || processing}
                className="w-full py-6 text-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-vault-violet/30"
              >
                {processing ? "Processing..." : "Pay SOL"}
              </Button>
            ) : null}

            {step === "svf" ? (
              <Button
                onClick={handleSvfPayment}
                disabled={!publicKey || processing}
                className="w-full py-6 text-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-violet/30"
              >
                {processing ? "Processing..." : "Pay SVF Tokens"}
              </Button>
            ) : null}

            <div className="space-y-2 text-sm text-muted">
              <p>• Split payment: SOL + SVF to community treasury</p>
              <p>• Slab fulfilled from deployer vault (slabvault.sol)</p>
              <p>• On-chain payments verified before reservation closes</p>
              <p>• v1: slab/NFT transfer may be completed manually by admin</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
