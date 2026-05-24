"use client";

import { useEffect, useId, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import { TradeModalShell } from "@/components/trade/trade-modal-shell";
import { useTensorList } from "@/components/trade/tensor/use-tensor-list";
import { WalletButton } from "@/components/wallet-button";
import { Button } from "@/components/ui/button";
import {
  isTradeWriteEnabledClient,
  tradeWriteDisabledTooltip,
} from "@/lib/trade/trade-modal";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Optional slab label for portfolio context. */
  itemLabel?: string;
  /** When known, skips mint input (e.g. slab detail page). */
  mint?: string;
  /** Sequential list queue from portfolio multi-select. */
  mints?: string[];
  /** Prefill list price — e.g. collection floor from instant sell. */
  suggestedPriceSol?: number;
  onComplete?: () => void;
};

export function ListForSaleModal({
  open,
  onClose,
  itemLabel,
  mint,
  mints,
  suggestedPriceSol,
  onComplete,
}: Props) {
  const priceId = useId();
  const mintId = useId();
  const { connected } = useWallet();
  const writeEnabled = isTradeWriteEnabledClient();
  const { list, pending } = useTensorList();
  const [listPriceSol, setListPriceSol] = useState("");
  const [mintInput, setMintInput] = useState(mint ?? "");
  const [error, setError] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(
    null,
  );

  const queueMints = (mints ?? (mint ? [mint] : [])).map((m) => m.trim()).filter(Boolean);
  const isBatch = queueMints.length > 1;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setBatchProgress(null);
    setMintInput(mint ?? "");
    if (suggestedPriceSol != null && suggestedPriceSol > 0) {
      setListPriceSol(String(suggestedPriceSol));
    }
  }, [open, mint, suggestedPriceSol]);

  const parsedPrice = Number.parseFloat(listPriceSol);
  const hasValidPrice = Number.isFinite(parsedPrice) && parsedPrice > 0;
  const resolvedMint = (mint ?? mintInput).trim();
  const hasMint = queueMints.length > 0 || resolvedMint.length > 0;
  const submitDisabled = !connected || !writeEnabled || !hasValidPrice || !hasMint || pending;

  const handleSubmit = async () => {
    setError(null);
    try {
      const targets = queueMints.length > 0 ? queueMints : [resolvedMint];
      if (targets.length > 1) {
        setBatchProgress({ current: 0, total: targets.length });
        for (let i = 0; i < targets.length; i++) {
          setBatchProgress({ current: i + 1, total: targets.length });
          await list({ mint: targets[i], priceSol: parsedPrice });
        }
      } else {
        await list({ mint: targets[0], priceSol: parsedPrice });
      }
      onComplete?.();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "List failed.");
      setBatchProgress(null);
    }
  };

  return (
    <TradeModalShell
      open={open}
      onClose={onClose}
      title="List for sale"
      description={
        itemLabel ??
        (isBatch
          ? `Set one fixed price for ${queueMints.length} selected slabs — listed sequentially.`
          : "Set a fixed price for a graded slab in your connected wallet.")
      }
      footer={
        <div className="space-y-2">
          {!connected ? (
            <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
              <p className="text-[11px] text-[var(--trade-muted)]">
                Connect a wallet to list a slab.
              </p>
              <WalletButton />
            </div>
          ) : null}
          {error ? (
            <p className="text-[11px] text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            className="tensor-btn-primary h-8 w-full text-xs"
            disabled={submitDisabled}
            aria-disabled={submitDisabled}
            title={!writeEnabled ? tradeWriteDisabledTooltip() : undefined}
            data-growth-event="cta_trade_list_submit"
            data-growth-context="trade_portfolio_list"
            onClick={() => void handleSubmit()}
          >
            {pending
              ? batchProgress
                ? `Listing ${batchProgress.current} of ${batchProgress.total}…`
                : "Listing…"
              : writeEnabled
                ? isBatch
                  ? `List ${queueMints.length} at price`
                  : "List at price"
                : "List at price (write path pending)"}
          </Button>
        </div>
      }
    >
      {!mint && queueMints.length === 0 ? (
        <div className="space-y-1">
          <label htmlFor={mintId} className="text-[11px] font-medium text-[var(--tensor-white)]">
            Mint address
          </label>
          <input
            id={mintId}
            type="text"
            value={mintInput}
            onChange={(event) => setMintInput(event.target.value)}
            placeholder="Solana mint"
            className="h-8 w-full rounded-md border border-[#333] bg-[var(--trade-surface)] px-2.5 font-mono text-xs text-[var(--tensor-white)] outline-none ring-[var(--tensor-accent)]/40 placeholder:text-[var(--trade-muted)] focus:border-[var(--tensor-accent)]/50 focus:ring-2"
          />
        </div>
      ) : isBatch ? (
        <ul className="max-h-40 space-y-1 overflow-y-auto rounded border border-[#333] bg-[var(--trade-surface)] p-2 text-[10px] font-mono text-[var(--trade-muted)]">
          {queueMints.map((queuedMint) => (
            <li key={queuedMint} className="truncate">
              {queuedMint}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="space-y-1">
        <label htmlFor={priceId} className="text-[11px] font-medium text-[var(--tensor-white)]">
          Fixed price (SOL)
        </label>
        <input
          id={priceId}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={listPriceSol}
          onChange={(event) => setListPriceSol(event.target.value)}
          className="h-8 w-full rounded-md border border-[#333] bg-[var(--trade-surface)] px-2.5 font-mono text-xs text-[var(--tensor-white)] outline-none ring-[var(--tensor-accent)]/40 placeholder:text-[var(--trade-muted)] focus:border-[var(--tensor-accent)]/50 focus:ring-2"
        />
        <p className="text-[10px] text-[var(--trade-muted)]">
          Routes through <code className="text-[10px]">/api/trade/tx/list</code> when write is
          enabled.
        </p>
      </div>
    </TradeModalShell>
  );
}
