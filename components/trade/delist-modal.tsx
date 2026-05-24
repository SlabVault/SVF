"use client";

import { useEffect, useId, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import { useTensorDelist } from "@/components/trade/tensor/use-tensor-delist";
import { TradeModalShell } from "@/components/trade/trade-modal-shell";
import { WalletButton } from "@/components/wallet-button";
import { Button } from "@/components/ui/button";
import {
  isTradeWriteEnabledClient,
  tradeWriteDisabledTooltip,
} from "@/lib/trade/trade-modal";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Known mints from selected listed inventory tiles. */
  mints?: string[];
  onComplete?: () => void;
};

export function DelistModal({ open, onClose, mints = [], onComplete }: Props) {
  const mintId = useId();
  const { connected } = useWallet();
  const writeEnabled = isTradeWriteEnabledClient();
  const { delistMany, pending } = useTensorDelist();
  const [mintInput, setMintInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const knownMints = mints.map((m) => m.trim()).filter(Boolean);
  const needsManualMint = knownMints.length === 0;
  const resolvedMints = needsManualMint
    ? mintInput.trim()
      ? [mintInput.trim()]
      : []
    : knownMints;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setMintInput("");
  }, [open]);

  const submitDisabled =
    !connected || !writeEnabled || resolvedMints.length === 0 || pending;

  const handleSubmit = async () => {
    setError(null);
    try {
      await delistMany(resolvedMints);
      onComplete?.();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Delist failed.");
    }
  };

  return (
    <TradeModalShell
      open={open}
      onClose={onClose}
      title="Delist"
      description={
        needsManualMint
          ? "Listing status unknown — delist by mint address."
          : `Cancel ${knownMints.length} active listing${knownMints.length === 1 ? "" : "s"} on Tensor TCM.`
      }
      footer={
        <div className="space-y-2">
          {!connected ? (
            <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
              <p className="text-[11px] text-[var(--trade-muted)]">
                Connect a wallet to delist.
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
            data-growth-event="cta_trade_delist_submit"
            data-growth-context="trade_portfolio_delist"
            onClick={() => void handleSubmit()}
          >
            {pending
              ? "Delisting…"
              : writeEnabled
                ? `Delist ${resolvedMints.length || ""} item${resolvedMints.length === 1 ? "" : "s"}`.trim()
                : "Delist (write path pending)"}
          </Button>
        </div>
      }
    >
      {needsManualMint ? (
        <div className="space-y-1">
          <label htmlFor={mintId} className="text-[11px] font-medium text-[var(--tensor-white)]">
            Mint address
          </label>
          <input
            id={mintId}
            type="text"
            value={mintInput}
            onChange={(event) => setMintInput(event.target.value)}
            placeholder="Solana mint — unknown listing"
            className="h-8 w-full rounded-md border border-[#333] bg-[var(--trade-surface)] px-2.5 font-mono text-xs text-[var(--tensor-white)] outline-none ring-[var(--tensor-accent)]/40 placeholder:text-[var(--trade-muted)] focus:border-[var(--tensor-accent)]/50 focus:ring-2"
          />
          <p className="text-[10px] text-[var(--trade-muted)]">
            Use when wallet metadata does not expose listing state. Routes through{" "}
            <code className="text-[10px]">/api/trade/tx/delist</code> when write is enabled.
          </p>
        </div>
      ) : (
        <ul className="max-h-40 space-y-1 overflow-y-auto rounded border border-[#333] bg-[var(--trade-surface)] p-2 text-[10px] font-mono text-[var(--trade-muted)]">
          {knownMints.map((mint) => (
            <li key={mint} className="truncate">
              {mint}
            </li>
          ))}
        </ul>
      )}
    </TradeModalShell>
  );
}
