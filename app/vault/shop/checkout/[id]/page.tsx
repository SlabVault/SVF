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
import { PageLoadingCard } from "@/components/page-loading-card";
import { WalletButton } from "@/components/wallet-button";
import { solToLamports } from "@/lib/marketplace-config";
import { fetchSolBalanceLamports, resolveClientSolanaRpcUrl } from "@/lib/solana-config";
import { marketplaceWrite } from "@/lib/marketplace-fetch";
import {
  clearPendingCheckout,
  savePendingCheckout,
} from "@/lib/marketplace-pending-checkout";
import { buildTransactionStatusAccessQuery } from "@/lib/wallet-transaction-access-client";
import { VAULT_ROUTES } from "@/lib/vault-routes";

type PaymentConfig = {
  treasuryWallet: string;
  deployerWallet: string;
  svfTokenMint: string;
  rpcUrl: string;
  autoFulfillmentEnabled: boolean;
  supportedSplits?: Array<"FIXED_DUAL" | "SOL_80_SVF_20">;
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
  paymentSplit?: "FIXED_DUAL" | "SOL_80_SVF_20";
  reservedExpiresAt?: string | Date | null;
};

function toNum(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  return Number(value);
}

type ApiErrorPayload = {
  ok?: false;
  error?: string;
  code?: string;
  requestId?: string;
  recoveryHint?: string;
  details?: unknown;
};

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { publicKey, sendTransaction, signMessage } = useWallet();
  const [transaction, setTransaction] = useState<TransactionData | null>(null);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<"sol" | "svf" | "complete">("sol");
  const [solSignature, setSolSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorMeta, setErrorMeta] = useState<{
    code?: string;
    requestId?: string;
    recoveryHint?: string;
  } | null>(null);
  const [fulfillmentNote, setFulfillmentNote] = useState<string | null>(null);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [svfBalance, setSvfBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [statusRefreshing, setStatusRefreshing] = useState(false);
  const walletAddress = publicKey?.toBase58() ?? null;
  const walletMismatch =
    Boolean(transaction?.buyerWallet) &&
    Boolean(walletAddress) &&
    transaction?.buyerWallet !== walletAddress;

  const fetchCheckoutData = useCallback(async () => {
    const query = walletAddress
      ? await buildTransactionStatusAccessQuery(id, walletAddress, signMessage)
      : "";
    const txRes = await fetch(
      `/api/marketplace/status/${id}${query ? `?${query}` : ""}`,
    );

    if (!txRes.ok) {
      const payload = (await txRes.json().catch(() => ({}))) as ApiErrorPayload;
      const fallbackMessage = "Failed to load transaction details. Check API config and try again.";
      const message = payload.error || fallbackMessage;
      setError(payload.recoveryHint ? `${message} ${payload.recoveryHint}` : message);
      setErrorMeta({
        code: payload.code,
        requestId: payload.requestId,
        recoveryHint: payload.recoveryHint,
      });
      setTransaction(null);
      return false;
    }

    const data = (await txRes.json()) as TransactionData & {
      fulfillmentMessage?: string;
    };
    setError(null);
    setErrorMeta(null);
    setTransaction({
      ...data,
      solAmount: toNum(data.solAmount),
      svfAmount: toNum(data.svfAmount),
      totalUsdValue: data.totalUsdValue == null ? null : toNum(data.totalUsdValue),
    });

    if (data.status === "COMPLETED" || data.status === "PENDING_FULFILLMENT") {
      setStep("complete");
      if (data.fulfillmentMessage) {
        setFulfillmentNote(data.fulfillmentMessage);
      }
    } else if (data.transactionSignature) {
      setSolSignature(data.transactionSignature);
      setStep("svf");
    } else {
      setStep("sol");
    }
    return true;
  }, [id, walletAddress, signMessage]);

  useEffect(() => {
    async function load() {
      try {
        const configRes = await fetch("/api/marketplace/config");
        if (!configRes.ok) throw new Error("Missing payment config");
        setConfig(await configRes.json());
        await fetchCheckoutData();
      } catch {
        setError("Failed to load transaction details. Check API config and try again.");
        setErrorMeta(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [fetchCheckoutData]);

  const refreshStatus = useCallback(async () => {
    setStatusRefreshing(true);
    await fetchCheckoutData();
    setStatusRefreshing(false);
  }, [fetchCheckoutData]);

  const getConnection = useCallback(() => {
    const rpc = config?.rpcUrl || resolveClientSolanaRpcUrl();
    return new Connection(rpc, "confirmed");
  }, [config]);

  useEffect(() => {
    async function loadBalances() {
      if (!publicKey || !config || !transaction) {
        setSolBalance(null);
        setSvfBalance(null);
        return;
      }

      setBalanceLoading(true);
      try {
        const connection = getConnection();
        const mint = new PublicKey(config.svfTokenMint);
        const lamports = await fetchSolBalanceLamports(connection, publicKey);
        if (lamports == null) {
          setSolBalance(null);
          setSvfBalance(null);
          return;
        }

        const buyerAta = getAssociatedTokenAddressSync(mint, publicKey);
        const tokenBalance = await connection
          .getTokenAccountBalance(buyerAta)
          .then((balance) => Number(balance.value.uiAmount ?? 0))
          .catch(() => 0);

        setSolBalance(lamports / 1_000_000_000);
        setSvfBalance(tokenBalance);
      } catch {
        setSolBalance(null);
        setSvfBalance(null);
      } finally {
        setBalanceLoading(false);
      }
    }

    loadBalances();
  }, [publicKey, config, transaction, getConnection]);

  useEffect(() => {
    if (!transaction?.slab?.id) return;

    if (
      walletAddress &&
      transaction.buyerWallet === walletAddress &&
      (transaction.status === "PENDING" || transaction.status === "PENDING_FULFILLMENT")
    ) {
      savePendingCheckout(transaction.slab.id, transaction.id, walletAddress);
      return;
    }

    if (transaction.status === "COMPLETED" || transaction.status === "CANCELLED") {
      clearPendingCheckout(transaction.slab.id);
    }
  }, [transaction, walletAddress]);

  const insufficientSol =
    solBalance != null && transaction != null && solBalance < transaction.solAmount;
  const insufficientSvf =
    svfBalance != null && transaction != null && svfBalance < transaction.svfAmount;

  const reservationExpiresAt =
    transaction?.reservedExpiresAt instanceof Date
      ? transaction.reservedExpiresAt
      : transaction?.reservedExpiresAt
        ? new Date(transaction.reservedExpiresAt)
        : null;

  const handleSolPayment = async () => {
    if (!publicKey || !transaction || !config) return;

    setProcessing(true);
    setError(null);
    setErrorMeta(null);

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
    setErrorMeta(null);

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

      const response = await marketplaceWrite("/api/marketplace/checkout", {
        body: {
          transactionId: transaction.id,
          transactionSignature: solSignature,
          burnSignature,
        },
      });

      const result = await response.json();
      if (!response.ok) {
        const payload = result as ApiErrorPayload;
        const message = payload.error || "Failed to complete checkout";
        setError(payload.recoveryHint ? `${message} ${payload.recoveryHint}` : message);
        setErrorMeta({
          code: payload.code,
          requestId: payload.requestId,
          recoveryHint: payload.recoveryHint,
        });
        return;
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
      setErrorMeta(null);
      setStep("complete");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to transfer SVF tokens to treasury",
      );
      setErrorMeta(null);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <PageLoadingCard
          title="Loading checkout"
          description="Verifying reservation details and wallet payment configuration."
        />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="page-shell">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Vault", href: VAULT_ROUTES.overview },
            { label: "Shop", href: VAULT_ROUTES.shop },
            { label: "Checkout", href: "#" },
          ]}
        />
        <Card className="space-y-4 p-8 text-center sm:p-12" role="status" aria-live="polite">
          <h1 className="font-display text-2xl font-semibold">
            Transaction Not Found
          </h1>
          <p className="mt-2 text-muted">
            This checkout link is invalid or has expired.
          </p>
          <Button asChild>
            <Link
              href={VAULT_ROUTES.shop}
              data-growth-event="cta_back_to_marketplace_checkout_invalid"
              data-growth-context="checkout_invalid_state"
            >
              Back to Shop
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (step === "complete") {
    const pendingFulfillment =
      transaction.status === "PENDING_FULFILLMENT" ||
      fulfillmentNote?.includes("pending");

    return (
      <div className="page-shell">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Vault", href: VAULT_ROUTES.overview },
            { label: "Shop", href: VAULT_ROUTES.shop },
            { label: "Checkout", href: "#" },
          ]}
        />
        <Card
          className="space-y-6 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50 p-8 text-center sm:p-12"
          role="status"
          aria-live="polite"
        >
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
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild className="transition-all duration-300 hover:scale-105">
              <Link
                href={VAULT_ROUTES.purchaseOrder(transaction.id)}
                data-growth-event="cta_view_order_status_checkout_complete"
                data-growth-context="checkout_complete_state"
              >
                View order status
              </Link>
            </Button>
            <Button variant="outline" asChild className="transition-all duration-300 hover:scale-105">
              <Link
                href={VAULT_ROUTES.shop}
                data-growth-event="cta_back_to_marketplace_checkout_complete"
                data-growth-context="checkout_complete_state"
              >
                Back to Shop
              </Link>
            </Button>
            <Button variant="outline" asChild className="transition-all duration-300 hover:scale-105">
              <Link
                href="/vault"
                data-growth-event="cta_open_vault_checkout_complete"
                data-growth-context="checkout_complete_state"
              >
                View Vault
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Vault", href: VAULT_ROUTES.overview },
          { label: "Shop", href: VAULT_ROUTES.shop },
          { label: "Checkout", href: "#" },
        ]}
      />

      <header className="page-header space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Checkout
        </h1>
        <p className="max-w-prose text-sm text-muted sm:text-base">
          Complete the two-step SOL + SVF payment to secure your reservation.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card className="overflow-hidden bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
            <SlabImage
              src={transaction.slab.imageUrl}
              alt={`${transaction.slab.name} ${transaction.slab.grade}`}
              className="aspect-[4/3] w-full lg:aspect-square"
              priority
            />
          </Card>

          <Card className="space-y-5 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50 p-5 sm:p-6">
            <h2 className="font-display text-xl font-semibold">Purchase Summary</h2>
            <dl className="space-y-3">
              <div className="checkout-summary-row">
                <dt>Item</dt>
                <dd className="max-w-[14rem] truncate">{transaction.slab.name}</dd>
              </div>
              <div className="checkout-summary-row">
                <dt>Grade</dt>
                <dd>
                  <Badge variant="grade">{transaction.slab.grade}</Badge>
                </dd>
              </div>
              <div className="checkout-summary-row">
                <dt>SOL Payment</dt>
                <dd className="font-mono text-base text-foreground">
                  {transaction.solAmount} SOL
                </dd>
              </div>
              <div className="checkout-summary-row">
                <dt>SVF Payment</dt>
                <dd className="font-mono text-base text-foreground">
                  {transaction.svfAmount} SVF
                </dd>
              </div>
              <div className="checkout-summary-row">
                <dt>Payment Mode</dt>
                <dd className="text-sm">
                  {transaction.paymentSplit === "SOL_80_SVF_20"
                    ? "80/20 weighted split"
                    : "Fixed listing split"}
                </dd>
              </div>
              {transaction.totalUsdValue != null ? (
                <div className="checkout-summary-row border-t border-line pt-4">
                  <dt>Total Value</dt>
                  <dd className="font-mono text-lg text-vault-amber">
                    ${transaction.totalUsdValue.toFixed(2)}
                  </dd>
                </div>
              ) : null}
            </dl>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-6 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold">Payment Steps</h2>
              <WalletButton />
            </div>
            <div className="rounded-lg border border-line bg-vault-panel/40 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-medium text-foreground">Checkout Status</span>
                <Badge
                  variant={
                    transaction.status === "COMPLETED"
                      ? "default"
                      : transaction.status === "PENDING_FULFILLMENT"
                        ? "live"
                        : transaction.status === "PENDING"
                          ? "secondary"
                          : "outline"
                  }
                >
                  {transaction.status}
                </Badge>
              </div>
              {reservationExpiresAt ? (
                <p className="mt-2 text-sm text-muted">
                  Reservation expires{" "}
                  <span className="font-mono text-foreground">
                    {reservationExpiresAt.toLocaleString()}
                  </span>.
                </p>
              ) : null}
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={refreshStatus}
                  disabled={statusRefreshing}
                  data-growth-event="cta_refresh_checkout_status"
                  data-growth-context="checkout_status_panel"
                >
                  {statusRefreshing ? "Refreshing..." : "Refresh status"}
                </Button>
              </div>
            </div>

            {!publicKey ? (
              <p className="rounded-lg border border-line bg-vault-panel/30 px-4 py-3 text-sm text-muted">
                Connect a supported Solana wallet to continue.
              </p>
            ) : null}
            {walletMismatch ? (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
                <p className="text-sm leading-relaxed text-amber-100">
                  This checkout is reserved for{" "}
                  <span className="font-mono text-amber-50">
                    {transaction.buyerWallet}
                  </span>
                  . Switch wallets to continue safely.
                </p>
              </div>
            ) : null}

            <div className="space-y-3" role="list" aria-label="Payment steps">
              <div
                className="checkout-step-card"
                data-active={step === "sol" ? "true" : "false"}
                data-complete={step === "svf" ? "true" : "false"}
                role="listitem"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    step === "sol"
                      ? "bg-vault-amber text-vault-void"
                      : step === "svf"
                        ? "bg-vault-mint text-vault-void"
                        : "bg-vault-panel text-muted"
                  }`}
                  aria-hidden="true"
                >
                  {step === "svf" ? "✓" : "1"}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground">Pay SOL</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    Transfer{" "}
                    <span className="font-mono text-foreground">
                      {transaction.solAmount} SOL
                    </span>{" "}
                    to treasury
                  </p>
                </div>
              </div>

              <div
                className="checkout-step-card"
                data-active={step === "svf" ? "true" : "false"}
                data-pending={step === "sol" ? "true" : "false"}
                role="listitem"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    step === "svf"
                      ? "bg-vault-amber text-vault-void"
                      : "bg-vault-panel text-muted"
                  }`}
                  aria-hidden="true"
                >
                  2
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground">Pay SVF Tokens</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    Transfer{" "}
                    <span className="font-mono text-foreground">
                      {transaction.svfAmount} SVF
                    </span>{" "}
                    to treasury
                  </p>
                </div>
              </div>
            </div>

            {error ? (
              <div
                className="rounded-lg border border-red-500/20 bg-red-500/10 p-4"
                role="alert"
                aria-live="assertive"
              >
                <p className="text-sm text-red-500">{error}</p>
                {errorMeta?.code ? (
                  <p className="mt-2 text-xs text-red-300">
                    Code: <span className="font-mono">{errorMeta.code}</span>
                    {errorMeta.requestId ? (
                      <>
                        {" "}
                        | requestId:{" "}
                        <span className="font-mono">{errorMeta.requestId}</span>
                      </>
                    ) : null}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={refreshStatus}>
                    Re-check checkout status
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link
                      href={VAULT_ROUTES.shop}
                      data-growth-event="cta_back_to_marketplace_checkout_error"
                      data-growth-context="checkout_error_state"
                    >
                      Back to marketplace
                    </Link>
                  </Button>
                  {walletMismatch ? (
                    <Button size="sm" variant="outline" asChild>
                      <Link
                        href={VAULT_ROUTES.shopListing(transaction.slab.id)}
                        data-growth-event="cta_return_to_listing_checkout_error"
                        data-growth-context="checkout_error_state"
                      >
                        Return to listing
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {publicKey ? (
              <div
                className="grid gap-2 rounded-lg border border-line bg-vault-panel/30 p-4 text-sm sm:grid-cols-2"
                role="status"
                aria-live="polite"
              >
                {balanceLoading ? (
                  <p className="sm:col-span-2 text-muted">Checking wallet balances...</p>
                ) : (
                  <>
                    <p>
                      <span className="text-muted">SOL balance</span>
                      <span className="mt-1 block font-mono text-base text-foreground">
                        {solBalance?.toFixed(4) ?? "—"}
                      </span>
                    </p>
                    <p>
                      <span className="text-muted">SVF balance</span>
                      <span className="mt-1 block font-mono text-base text-foreground">
                        {svfBalance?.toFixed(2) ?? "—"}
                      </span>
                    </p>
                    {insufficientSol ? (
                      <p className="sm:col-span-2 text-sm text-red-400">
                        Insufficient SOL for step 1 payment.
                      </p>
                    ) : null}
                    {insufficientSvf ? (
                      <p className="sm:col-span-2 text-sm text-red-400">
                        Insufficient SVF for step 2 payment.
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}

            {step === "sol" ? (
              <Button
                onClick={handleSolPayment}
                disabled={
                  !publicKey ||
                  !config ||
                  processing ||
                  walletMismatch ||
                  insufficientSol
                }
                aria-busy={processing}
                className="w-full py-6 text-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-vault-violet/30"
                data-growth-event="cta_pay_sol"
                data-growth-context="checkout_payment_step"
              >
                {processing ? "Processing..." : "Pay SOL"}
              </Button>
            ) : null}

            {step === "svf" ? (
              <Button
                onClick={handleSvfPayment}
                disabled={
                  !publicKey ||
                  processing ||
                  walletMismatch ||
                  insufficientSvf
                }
                aria-busy={processing}
                className="w-full py-6 text-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-violet/30"
                data-growth-event="cta_pay_svf"
                data-growth-context="checkout_payment_step"
              >
                {processing ? "Processing..." : "Pay SVF Tokens"}
              </Button>
            ) : null}

            <div className="space-y-2 rounded-lg border border-line/70 bg-vault-panel/20 p-4 text-sm leading-relaxed text-muted">
              <p>Split payment: SOL + SVF transfer to community treasury</p>
              <p>Slab fulfilled from deployer vault (slabvault.sol)</p>
              <p>On-chain payments verified before reservation closes</p>
              <p>v1: slab/NFT transfer may be completed manually by admin</p>
              <p>
                Verify official links in{" "}
                <Link
                  href="/vault/proof"
                  className="font-medium text-vault-amber underline-offset-4 hover:underline"
                  data-growth-event="cta_open_proof_from_checkout"
                  data-growth-context="checkout_trust_notes"
                >
                  proof of reserves
                </Link>{" "}
                and{" "}
                <Link
                  href="/faq"
                  className="font-medium text-vault-amber underline-offset-4 hover:underline"
                  data-growth-event="cta_open_faq_from_checkout"
                  data-growth-context="checkout_trust_notes"
                >
                  FAQ
                </Link>
                .
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
